/**
 * Scan comparison / diff utilities for CVERiskPilot.
 * Compares two sets of scan findings and categorizes them as new, resolved, or unchanged.
 */

export interface ScanDiffResult {
  newFindings: Record<string, unknown>[];
  resolvedFindings: Record<string, unknown>[];
  unchangedFindings: Record<string, unknown>[];
  summary: {
    totalA: number;
    totalB: number;
    new: number;
    resolved: number;
    unchanged: number;
  };
}

/**
 * Build a match key from a finding using cveIds[0] + assetName.
 */
function buildMatchKey(finding: Record<string, unknown>): string {
  const cveIds = finding.cveIds as string[] | undefined;
  const cve = cveIds && cveIds.length > 0 ? cveIds[0] : (finding.cveId as string) ?? '';
  const asset = (finding.assetName as string) ?? (finding.asset as string) ?? '';
  return `${cve}::${asset}`.toLowerCase();
}

/**
 * Compare two scan result arrays and produce a diff.
 * Matching is done by cveIds[0] + assetName combination.
 */
export function compareScanResults(
  scanA: Record<string, unknown>[],
  scanB: Record<string, unknown>[],
): ScanDiffResult {
  const mapA = new Map<string, Record<string, unknown>>();
  const mapB = new Map<string, Record<string, unknown>>();

  for (const f of scanA) {
    mapA.set(buildMatchKey(f), f);
  }
  for (const f of scanB) {
    mapB.set(buildMatchKey(f), f);
  }

  const newFindings: Record<string, unknown>[] = [];
  const resolvedFindings: Record<string, unknown>[] = [];
  const unchangedFindings: Record<string, unknown>[] = [];

  // Findings in B but not in A => NEW
  for (const [key, finding] of mapB) {
    if (!mapA.has(key)) {
      newFindings.push(finding);
    } else {
      unchangedFindings.push(finding);
    }
  }

  // Findings in A but not in B => RESOLVED
  for (const [key, finding] of mapA) {
    if (!mapB.has(key)) {
      resolvedFindings.push(finding);
    }
  }

  return {
    newFindings,
    resolvedFindings,
    unchangedFindings,
    summary: {
      totalA: scanA.length,
      totalB: scanB.length,
      new: newFindings.length,
      resolved: resolvedFindings.length,
      unchanged: unchangedFindings.length,
    },
  };
}

/**
 * Export a scan diff result to CSV with a Status column prepended.
 */
export function exportDiffToCSV(diff: ScanDiffResult): string {
  const separator = ',';

  function escapeField(value: string): string {
    if (value.includes(separator) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function formatValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return val.join('; ');
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  const headers = ['Status', 'CVE IDs', 'Title', 'Severity', 'CVSS Score', 'Asset', 'Discovered At'];

  function rowToCSV(finding: Record<string, unknown>, status: string): string {
    const cveIds = finding.cveIds as string[] | undefined;
    const fields = [
      status,
      formatValue(cveIds ?? finding.cveId ?? ''),
      formatValue(finding.title ?? ''),
      formatValue(finding.severity ?? ''),
      formatValue(finding.cvssScore),
      formatValue(finding.assetName ?? finding.asset ?? ''),
      formatValue(finding.discoveredAt ?? ''),
    ];
    return fields.map((f) => escapeField(f)).join(separator);
  }

  const rows: string[] = [headers.map((h) => escapeField(h)).join(separator)];

  for (const f of diff.newFindings) {
    rows.push(rowToCSV(f, 'NEW'));
  }
  for (const f of diff.resolvedFindings) {
    rows.push(rowToCSV(f, 'RESOLVED'));
  }
  for (const f of diff.unchangedFindings) {
    rows.push(rowToCSV(f, 'UNCHANGED'));
  }

  return rows.join('\r\n');
}
