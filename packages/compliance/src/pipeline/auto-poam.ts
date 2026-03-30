/**
 * Auto-POAM Generation for Pipeline Scans
 *
 * Converts pipeline scan findings and their compliance impact into POAM
 * entries, following the patterns established in packages/compliance/src/poam/generator.ts.
 * Links POAM items back to the originating PR/commit for traceability.
 */

import type { CanonicalFinding } from '@cveriskpilot/parsers';
import type { POAMItem, POAMMilestone } from '../poam/types';
import type { ComplianceImpactReport, ComplianceImpactEntry } from '../mapping/cross-framework';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineMetadata {
  repoUrl?: string;
  commitSha?: string;
  branch?: string;
  prNumber?: number;
}

// ---------------------------------------------------------------------------
// SLA defaults (days) by severity for milestone scheduling
// ---------------------------------------------------------------------------

const REMEDIATION_SLA_DAYS: Record<string, number> = {
  CRITICAL: 7,
  HIGH: 30,
  MEDIUM: 90,
  LOW: 180,
  INFO: 365,
};

const TRIAGE_DAYS = 7;
const VERIFY_DAYS_AFTER_REMEDIATE = 14;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMilestones(
  findingId: string,
  severity: string,
  detectedAt: Date,
): POAMMilestone[] {
  const triageDue = new Date(
    detectedAt.getTime() + TRIAGE_DAYS * 24 * 60 * 60 * 1000,
  );

  const remediateDays = REMEDIATION_SLA_DAYS[severity] ?? REMEDIATION_SLA_DAYS['MEDIUM']!;
  const remediateDue = new Date(
    detectedAt.getTime() + remediateDays * 24 * 60 * 60 * 1000,
  );

  const verifyDue = new Date(
    remediateDue.getTime() + VERIFY_DAYS_AFTER_REMEDIATE * 24 * 60 * 60 * 1000,
  );

  return [
    {
      id: `${findingId}-m1`,
      description: 'Triage and assessment',
      scheduledDate: triageDue.toISOString(),
      status: 'PENDING',
    },
    {
      id: `${findingId}-m2`,
      description: 'Remediation implementation',
      scheduledDate: remediateDue.toISOString(),
      status: 'PENDING',
    },
    {
      id: `${findingId}-m3`,
      description: 'Verification and closure',
      scheduledDate: verifyDue.toISOString(),
      status: 'PENDING',
    },
  ];
}

function buildPipelineComment(metadata: PipelineMetadata): string {
  const parts: string[] = ['Detected via CI/CD pipeline scan'];

  if (metadata.repoUrl) {
    parts.push(`Repository: ${metadata.repoUrl}`);
  }
  if (metadata.commitSha) {
    parts.push(`Commit: ${metadata.commitSha}`);
  }
  if (metadata.branch) {
    parts.push(`Branch: ${metadata.branch}`);
  }
  if (metadata.prNumber) {
    parts.push(`PR #${metadata.prNumber}`);
  }

  return parts.join(' | ');
}

/**
 * Pick the most relevant compliance control reference for a finding.
 * Prefers NIST 800-53 entries, then falls back to the first available.
 */
function resolveControlRef(
  finding: CanonicalFinding,
  entries: ComplianceImpactEntry[],
): { controlFamily: string; securityControl: string } {
  // Find entries that match any of the finding's CWEs
  const findingCwes = new Set(
    finding.cweIds.map((c) =>
      c.startsWith('CWE-') ? c : `CWE-${c}`,
    ),
  );

  const matching = entries.filter((e) =>
    e.affectedBy.some((cwe) => findingCwes.has(cwe)),
  );

  if (matching.length === 0) {
    return {
      controlFamily: 'Risk Assessment',
      securityControl: 'RA-5',
    };
  }

  // Prefer NIST 800-53 entry
  const nistEntry = matching.find((e) => e.framework === 'NIST 800-53');
  const chosen = nistEntry ?? matching[0]!;

  return {
    controlFamily: chosen.framework,
    securityControl: chosen.controlId,
  };
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate POAM entries from pipeline scan findings.
 *
 * Creates one POAM item per compliance-affecting finding that is NOT in the
 * blocked set (blocked findings are expected to be fixed before merge,
 * not tracked on the POAM).
 *
 * @param findings         All findings from the pipeline scan
 * @param complianceImpact The cross-framework compliance impact report
 * @param metadata         Pipeline context (repo, commit, branch, PR)
 * @param blockedFindingIndices  Indices of findings that were blocked by policy
 *                               (these get a POAM entry too, but with PENDING status)
 */
export function generatePipelinePOAM(
  findings: CanonicalFinding[],
  complianceImpact: ComplianceImpactReport,
  metadata: PipelineMetadata,
  blockedFindingIndices?: Set<number>,
): POAMItem[] {
  const blocked = blockedFindingIndices ?? new Set<number>();
  const comment = buildPipelineComment(metadata);
  const items: POAMItem[] = [];

  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i]!;

    // Skip findings with no CWE (no compliance mapping possible)
    if (finding.cweIds.length === 0) continue;

    // Blocked findings are expected to be fixed pre-merge; skip POAM for them
    if (blocked.has(i)) continue;

    const rawDate =
      finding.discoveredAt instanceof Date
        ? finding.discoveredAt
        : finding.discoveredAt
          ? new Date(finding.discoveredAt)
          : null;
    const detectedAt =
      rawDate && !isNaN(rawDate.getTime()) ? rawDate : new Date();

    const { controlFamily, securityControl } = resolveControlRef(
      finding,
      complianceImpact.entries,
    );

    const findingId = `pipeline-${metadata.commitSha?.slice(0, 8) ?? 'unknown'}-${i}`;

    const remediateDays =
      REMEDIATION_SLA_DAYS[finding.severity] ??
      REMEDIATION_SLA_DAYS['MEDIUM']!;

    const scheduledCompletion = new Date(
      detectedAt.getTime() + remediateDays * 24 * 60 * 60 * 1000,
    );

    items.push({
      id: findingId,
      weaknessId: finding.cveIds[0] ?? finding.cweIds[0] ?? findingId,
      controlFamily,
      securityControl,
      weaknessDescription: finding.description || finding.title,
      severity: finding.severity,
      responsibleEntity: metadata.repoUrl ?? 'Development Team',
      milestones: buildMilestones(findingId, finding.severity, detectedAt),
      scheduledCompletionDate: scheduledCompletion.toISOString(),
      status: 'PENDING',
      resources: [
        finding.assetName ? `Asset: ${finding.assetName}` : null,
        finding.filePath ? `File: ${finding.filePath}` : null,
        finding.packageName
          ? `Package: ${finding.packageName}@${finding.packageVersion ?? 'unknown'}`
          : null,
      ]
        .filter(Boolean)
        .join(', ') || 'Pipeline scan finding',
      comments: comment,
      cveIds: finding.cveIds,
      cweIds: finding.cweIds.map((c) =>
        c.startsWith('CWE-') ? c : `CWE-${c}`,
      ),
      sourceOfWeakness: 'CI/CD Pipeline Scan',
      originalDetectionDate: detectedAt.toISOString(),
    });
  }

  return items;
}
