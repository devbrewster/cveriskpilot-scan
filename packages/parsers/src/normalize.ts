import type { CanonicalFinding } from './types';

const CVE_REGEX = /CVE-\d{4}-\d{4,}/g;
const CWE_REGEX = /CWE-\d+/g;

const VALID_SEVERITIES = new Set([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
]);

const SEVERITY_ALIASES: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  crit: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  moderate: 'MEDIUM',
  med: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
  informational: 'INFO',
  information: 'INFO',
  none: 'INFO',
  unknown: 'INFO',
};

function normalizeSeverity(
  severity: string,
): CanonicalFinding['severity'] {
  const upper = severity.toUpperCase().trim();
  if (VALID_SEVERITIES.has(upper)) {
    return upper as CanonicalFinding['severity'];
  }
  return SEVERITY_ALIASES[severity.toLowerCase().trim()] ?? 'MEDIUM';
}

function extractCveIds(text: string): string[] {
  return [...new Set(text.match(CVE_REGEX) ?? [])];
}

function extractCweIds(text: string): string[] {
  return [...new Set(text.match(CWE_REGEX) ?? [])];
}

function trimOptional(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeFindings(
  findings: CanonicalFinding[],
): CanonicalFinding[] {
  const seen = new Map<string, CanonicalFinding>();

  for (const finding of findings) {
    // Trim and clean string fields
    const title = finding.title.trim();
    const description = finding.description.trim();
    const assetName = finding.assetName.trim();

    // Normalize severity
    const severity = normalizeSeverity(finding.severity);

    // Validate CVSS score
    let cvssScore = finding.cvssScore;
    if (cvssScore !== undefined) {
      if (isNaN(cvssScore) || cvssScore < 0 || cvssScore > 10) {
        cvssScore = undefined;
      }
    }

    // Extract additional CVE/CWE IDs from title and description
    const textToSearch = `${title} ${description}`;
    const extractedCves = extractCveIds(textToSearch);
    const extractedCwes = extractCweIds(textToSearch);

    const cveIds = [
      ...new Set([...finding.cveIds, ...extractedCves]),
    ];
    const cweIds = [
      ...new Set([...finding.cweIds, ...extractedCwes]),
    ];

    const normalized: CanonicalFinding = {
      ...finding,
      title,
      description,
      assetName,
      severity,
      cvssScore,
      cveIds,
      cweIds,
      hostname: trimOptional(finding.hostname),
      ipAddress: trimOptional(finding.ipAddress),
      protocol: trimOptional(finding.protocol),
      packageName: trimOptional(finding.packageName),
      packageVersion: trimOptional(finding.packageVersion),
      packageEcosystem: trimOptional(finding.packageEcosystem),
      fixedVersion: trimOptional(finding.fixedVersion),
      filePath: trimOptional(finding.filePath),
      snippet: trimOptional(finding.snippet),
      scannerType: finding.scannerType.trim(),
      scannerName: finding.scannerName.trim(),
    };

    // Deduplicate by CVE+asset within a single parse result
    if (cveIds.length > 0) {
      for (const cve of cveIds) {
        const key = `${cve}::${assetName}`;
        if (!seen.has(key)) {
          seen.set(key, normalized);
        }
      }
    } else {
      // No CVE — use title+asset as dedup key
      const key = `title::${title}::${assetName}`;
      if (!seen.has(key)) {
        seen.set(key, normalized);
      }
    }
  }

  return [...seen.values()];
}
