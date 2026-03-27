import type { EnrichedFinding } from '@cveriskpilot/enrichment';
import { resolveAssets } from './asset-resolver';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildCasesParams {
  organizationId: string;
  clientId: string;
  findings: EnrichedFinding[];
  prisma: any;
}

export interface BuildCasesResult {
  casesCreated: number;
  casesUpdated: number;
  findingsLinked: number;
}

export interface BuildCasesFromUnlinkedParams {
  organizationId: string;
  clientId?: string;
  prisma: any;
}

// ---------------------------------------------------------------------------
// Severity ranking (higher index = higher severity)
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function highestSeverity(a: string, b: string): string {
  return (SEVERITY_RANK[a] ?? 0) >= (SEVERITY_RANK[b] ?? 0) ? a : b;
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

interface FindingGroup {
  key: string;
  findings: EnrichedFinding[];
}

/**
 * Group enriched findings:
 * 1. By primary CVE ID (cveIds[0]) when present
 * 2. By exact title match when no CVE
 */
function groupFindings(findings: EnrichedFinding[]): FindingGroup[] {
  const groups = new Map<string, EnrichedFinding[]>();

  for (const finding of findings) {
    const primaryCve = finding.cveIds[0];
    const key = primaryCve ?? `title::${finding.title}`;

    const existing = groups.get(key);
    if (existing) {
      existing.push(finding);
    } else {
      groups.set(key, [finding]);
    }
  }

  return Array.from(groups.entries()).map(([key, groupFindings]) => ({
    key,
    findings: groupFindings,
  }));
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Build or update VulnerabilityCases from a batch of enriched findings.
 *
 * Steps:
 * 1. Resolve assets (find-or-create Asset records)
 * 2. Group findings by CVE or title
 * 3. For each group, find-or-create VulnerabilityCase
 * 4. Create Finding records and link them to their case and asset
 */
export async function buildCases(
  params: BuildCasesParams,
): Promise<BuildCasesResult> {
  const { organizationId, clientId, findings, prisma } = params;

  let casesCreated = 0;
  let casesUpdated = 0;
  let findingsLinked = 0;

  // Step 1: Resolve assets
  const assetMap = await resolveAssets({
    organizationId,
    clientId,
    findings,
    prisma,
  });

  // Step 2: Group findings
  const groups = groupFindings(findings);

  // Look up default SLA policy for computing dueAt on new cases
  const defaultSlaPolicy = await prisma.slaPolicy.findFirst({
    where: { organizationId, isDefault: true },
  });

  // Step 3-4: Process each group
  for (const group of groups) {
    const groupCveIds = collectUnique(group.findings.flatMap((f) => f.cveIds));
    const groupCweIds = collectUnique(group.findings.flatMap((f) => f.cweIds));
    const primaryCve = group.findings[0].cveIds[0];

    // Derive case-level metadata from the group
    const caseData = deriveCaseData(group.findings, groupCveIds, groupCweIds);

    // Look for an existing case
    let existingCase = null;
    if (primaryCve) {
      existingCase = await prisma.vulnerabilityCase.findFirst({
        where: {
          organizationId,
          clientId,
          cveIds: { has: primaryCve },
        },
      });
    } else {
      // No CVE — match by exact title
      existingCase = await prisma.vulnerabilityCase.findFirst({
        where: {
          organizationId,
          clientId,
          title: caseData.title,
          cveIds: { equals: [] },
        },
      });
    }

    let caseId: string;

    if (existingCase) {
      // Update existing case
      const mergedCweIds = collectUnique([
        ...existingCase.cweIds,
        ...groupCweIds,
      ]);

      const updateData: Record<string, unknown> = {
        lastSeenAt: caseData.lastSeenAt,
        findingCount: { increment: group.findings.length },
        cweIds: mergedCweIds,
      };

      // Update EPSS if we have newer data
      if (caseData.epssScore != null) {
        updateData.epssScore = caseData.epssScore;
        updateData.epssPercentile = caseData.epssPercentile;
      }

      // Update KEV if newly detected
      if (caseData.kevListed && !existingCase.kevListed) {
        updateData.kevListed = true;
        updateData.kevDueDate = caseData.kevDueDate;
      }

      await prisma.vulnerabilityCase.update({
        where: { id: existingCase.id },
        data: updateData,
      });

      caseId = existingCase.id;
      casesUpdated++;
    } else {
      // Create new case with SLA due date from default policy
      const dueAt = defaultSlaPolicy
        ? computeSlaDueDate(caseData.severity, defaultSlaPolicy, caseData.kevListed)
        : null;

      const created = await prisma.vulnerabilityCase.create({
        data: {
          organizationId,
          clientId,
          title: caseData.title,
          description: caseData.description,
          cveIds: groupCveIds,
          cweIds: groupCweIds,
          severity: caseData.severity,
          cvssScore: caseData.cvssScore,
          cvssVector: caseData.cvssVector,
          cvssVersion: caseData.cvssVersion,
          epssScore: caseData.epssScore,
          epssPercentile: caseData.epssPercentile,
          kevListed: caseData.kevListed,
          kevDueDate: caseData.kevDueDate,
          status: 'NEW',
          findingCount: group.findings.length,
          firstSeenAt: caseData.firstSeenAt,
          lastSeenAt: caseData.lastSeenAt,
          slaPolicyId: defaultSlaPolicy?.id ?? null,
          dueAt,
        },
      });

      caseId = created.id;
      casesCreated++;
    }

    // Step 4: Create Finding records and link to case + asset
    for (const finding of group.findings) {
      const assetId = assetMap.get(finding.assetName);
      if (!assetId) {
        // Should not happen — resolveAssets covers all names
        continue;
      }

      const dedupKey = buildDedupKey(finding);

      await prisma.finding.create({
        data: {
          organizationId,
          clientId,
          assetId,
          scannerType: finding.scannerType,
          scannerName: finding.scannerName,
          runId: finding.runId ?? null,
          observations: finding.rawObservations ?? {},
          dedupKey,
          vulnerabilityCaseId: caseId,
          discoveredAt: finding.discoveredAt,
        },
      });

      findingsLinked++;
    }
  }

  return { casesCreated, casesUpdated, findingsLinked };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function collectUnique(arr: string[]): string[] {
  return [...new Set(arr)];
}

function buildDedupKey(finding: EnrichedFinding): string {
  const parts = [
    finding.cveIds[0] ?? finding.title,
    finding.assetName,
    finding.scannerName,
    finding.packageName ?? '',
  ];
  return parts.join('::');
}

interface CaseData {
  title: string;
  description: string | null;
  severity: string;
  cvssScore: number | null;
  cvssVector: string | null;
  cvssVersion: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  kevDueDate: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

// ---------------------------------------------------------------------------
// Build cases from unlinked findings already stored in the database
// ---------------------------------------------------------------------------

/**
 * Query all findings for an organization (optionally scoped to a client) that
 * are not yet linked to a VulnerabilityCase, group them by primary CVE ID
 * (or title when no CVE is present), and create or update cases with
 * aggregated metadata.
 */
export async function buildCasesFromUnlinked(
  params: BuildCasesFromUnlinkedParams,
): Promise<BuildCasesResult> {
  const { organizationId, clientId, prisma } = params;

  let casesCreated = 0;
  let casesUpdated = 0;
  let findingsLinked = 0;

  // 1. Fetch all unlinked findings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: Record<string, any> = {
    organizationId,
    vulnerabilityCaseId: null,
  };
  if (clientId) {
    whereClause.clientId = clientId;
  }

  const unlinkedFindings = await prisma.finding.findMany({
    where: whereClause,
    include: { asset: true },
    orderBy: { discoveredAt: 'asc' },
  });

  if (unlinkedFindings.length === 0) {
    return { casesCreated: 0, casesUpdated: 0, findingsLinked: 0 };
  }

  // 2. Group findings by primary CVE or dedup key prefix (title-based)
  const groups = new Map<string, Array<typeof unlinkedFindings[0]>>();

  for (const finding of unlinkedFindings) {
    // Extract primary CVE from the dedup key (format: "CVE-XXXX::asset::scanner::pkg")
    // or from observations if CVE data is stored there
    const dedupParts = finding.dedupKey.split('::');
    const primaryKey = dedupParts[0]; // CVE ID or title
    // Use a separator unlikely to appear in CVE IDs or titles
    const groupKey = `${finding.clientId}\0${primaryKey}`;

    const existing = groups.get(groupKey);
    if (existing) {
      existing.push(finding);
    } else {
      groups.set(groupKey, [finding]);
    }
  }

  // Look up default SLA policy for computing dueAt on new cases
  const defaultSlaPolicyUnlinked = await prisma.slaPolicy.findFirst({
    where: { organizationId, isDefault: true },
  });

  // 3. For each group, find-or-create a VulnerabilityCase and link findings
  for (const [groupKey, groupFindings] of groups) {
    const sepIdx = groupKey.indexOf('\0');
    const groupClientId = groupKey.slice(0, sepIdx);
    const primaryKey = groupKey.slice(sepIdx + 1);
    const isCve = /^CVE-\d{4}-\d+$/i.test(primaryKey);

    // Derive aggregated case data from the group
    let highestSev = 'INFO';
    let maxCvss: number | null = null;
    let firstSeen = groupFindings[0].discoveredAt;
    let lastSeen = groupFindings[0].discoveredAt;

    for (const f of groupFindings) {
      // We don't have enrichment data on DB findings directly, but we can
      // derive severity from observations if present
      const obs = f.observations as Record<string, unknown> | null;
      const findingSeverity = (obs?.severity as string) ?? 'INFO';
      highestSev = highestSeverity(highestSev, findingSeverity.toUpperCase());

      const findingCvss = obs?.cvssScore as number | undefined;
      if (findingCvss != null && (maxCvss == null || findingCvss > maxCvss)) {
        maxCvss = findingCvss;
      }

      if (f.discoveredAt < firstSeen) firstSeen = f.discoveredAt;
      if (f.discoveredAt > lastSeen) lastSeen = f.discoveredAt;
    }

    // Look for an existing case
    let existingCase = null;
    if (isCve) {
      existingCase = await prisma.vulnerabilityCase.findFirst({
        where: {
          organizationId,
          clientId: groupClientId,
          cveIds: { has: primaryKey },
        },
      });
    } else {
      existingCase = await prisma.vulnerabilityCase.findFirst({
        where: {
          organizationId,
          clientId: groupClientId,
          title: primaryKey,
          cveIds: { equals: [] },
        },
      });
    }

    let caseId: string;

    if (existingCase) {
      // Update existing case with new finding count and timestamps
      await prisma.vulnerabilityCase.update({
        where: { id: existingCase.id },
        data: {
          lastSeenAt: lastSeen,
          findingCount: { increment: groupFindings.length },
        },
      });
      caseId = existingCase.id;
      casesUpdated++;
    } else {
      // Create a new case with SLA due date from default policy
      const title = isCve
        ? `${primaryKey}: ${primaryKey}`
        : primaryKey;

      const dueAtUnlinked = defaultSlaPolicyUnlinked
        ? computeSlaDueDate(highestSev, defaultSlaPolicyUnlinked, false)
        : null;

      const created = await prisma.vulnerabilityCase.create({
        data: {
          organizationId,
          clientId: groupClientId,
          title,
          description: null,
          cveIds: isCve ? [primaryKey] : [],
          cweIds: [],
          severity: highestSev as any,
          cvssScore: maxCvss,
          cvssVector: null,
          cvssVersion: null,
          epssScore: null,
          epssPercentile: null,
          kevListed: false,
          kevDueDate: null,
          status: 'NEW',
          findingCount: groupFindings.length,
          firstSeenAt: firstSeen,
          lastSeenAt: lastSeen,
          slaPolicyId: defaultSlaPolicyUnlinked?.id ?? null,
          dueAt: dueAtUnlinked,
        },
      });
      caseId = created.id;
      casesCreated++;
    }

    // Link all findings in the group to the case
    const findingIds = groupFindings.map((f: { id: string }) => f.id);
    await prisma.finding.updateMany({
      where: { id: { in: findingIds } },
      data: { vulnerabilityCaseId: caseId },
    });

    findingsLinked += groupFindings.length;
  }

  return { casesCreated, casesUpdated, findingsLinked };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute the SLA due date for a case based on its severity and the active SLA policy.
 */
function computeSlaDueDate(
  severity: string,
  policy: {
    criticalDays: number;
    highDays: number;
    mediumDays: number;
    lowDays: number;
    kevCriticalDays: number;
  },
  kevListed: boolean,
): Date | null {
  const daysMap: Record<string, number | null> = {
    CRITICAL: policy.criticalDays,
    HIGH: policy.highDays,
    MEDIUM: policy.mediumDays,
    LOW: policy.lowDays,
    INFO: null,
  };

  let days = daysMap[severity];
  if (days === null || days === undefined) return null;

  // KEV-listed critical vulnerabilities use the tighter deadline
  if (kevListed && severity === 'CRITICAL' && policy.kevCriticalDays < days) {
    days = policy.kevCriticalDays;
  }

  const due = new Date();
  due.setDate(due.getDate() + days);
  return due;
}

function deriveCaseData(
  findings: EnrichedFinding[],
  cveIds: string[],
  _cweIds: string[],
): CaseData {
  const primaryCve = cveIds[0];

  // Title: prefer NVD description, fall back to finding title
  const nvdFinding = findings.find((f) => f.nvdData);
  let title: string;
  let description: string | null = null;

  if (primaryCve && nvdFinding?.nvdData) {
    title = `${primaryCve}: ${nvdFinding.nvdData.title}`;
    description = nvdFinding.nvdData.description;
  } else if (primaryCve) {
    title = `${primaryCve}: ${findings[0].title}`;
    description = findings[0].description || null;
  } else {
    title = findings[0].title;
    description = findings[0].description || null;
  }

  // Severity: highest in group
  let severity = 'INFO';
  for (const f of findings) {
    severity = highestSeverity(severity, f.severity);
  }

  // CVSS: prefer NVD data, take highest score
  let cvssScore: number | null = null;
  let cvssVector: string | null = null;
  let cvssVersion: string | null = null;

  for (const f of findings) {
    const nvd = f.nvdData;
    const score = nvd?.cvssV3?.score ?? nvd?.cvssV2?.score ?? f.cvssScore;
    if (score != null && (cvssScore == null || score > cvssScore)) {
      cvssScore = score;
      if (nvd?.cvssV3) {
        cvssVector = nvd.cvssV3.vector;
        cvssVersion = nvd.cvssV3.version ?? '3.1';
      } else if (nvd?.cvssV2) {
        cvssVector = nvd.cvssV2.vector;
        cvssVersion = nvd.cvssV2.version ?? '2.0';
      } else {
        cvssVector = f.cvssVector ?? null;
        cvssVersion = f.cvssVersion ?? null;
      }
    }
  }

  // EPSS: take the data from first finding that has it
  let epssScore: number | null = null;
  let epssPercentile: number | null = null;
  for (const f of findings) {
    if (f.epssData) {
      epssScore = f.epssData.score;
      epssPercentile = f.epssData.percentile;
      break;
    }
  }

  // KEV: check if any finding has KEV data
  let kevListed = false;
  let kevDueDate: Date | null = null;
  for (const f of findings) {
    if (f.kevData) {
      kevListed = true;
      kevDueDate = new Date(f.kevData.dueDate);
      break;
    }
  }

  // Timestamps
  const timestamps = findings.map((f) => f.discoveredAt.getTime());
  const firstSeenAt = new Date(Math.min(...timestamps));
  const lastSeenAt = new Date(Math.max(...timestamps));

  return {
    title,
    description,
    severity,
    cvssScore,
    cvssVector,
    cvssVersion,
    epssScore,
    epssPercentile,
    kevListed,
    kevDueDate,
    firstSeenAt,
    lastSeenAt,
  };
}
