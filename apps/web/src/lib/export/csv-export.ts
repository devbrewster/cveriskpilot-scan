/**
 * CSV Export utilities for CVERiskPilot
 * Supports exporting findings and vulnerability cases to RFC 4180 compliant CSV.
 */

export interface CsvExportOptions {
  includeColumns?: string[];
  separator?: string;
}

/**
 * Escape a CSV field value per RFC 4180.
 * Wraps in double-quotes if the value contains the separator, double-quotes, or newlines.
 * Doubles any existing double-quote characters.
 */
function escapeCSVField(value: string, separator: string): string {
  if (
    value.includes(separator) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.join('; ');
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

// Default column definitions for findings export
const FINDING_COLUMNS: Record<string, { header: string; accessor: (row: Record<string, unknown>) => string }> = {
  cveIds: {
    header: 'CVE IDs',
    accessor: (r) => formatValue(r.cveIds ?? r.cveId ?? ''),
  },
  title: {
    header: 'Title',
    accessor: (r) => formatValue(r.title ?? ''),
  },
  severity: {
    header: 'Severity',
    accessor: (r) => formatValue(r.severity ?? ''),
  },
  cvssScore: {
    header: 'CVSS Score',
    accessor: (r) => formatValue(r.cvssScore),
  },
  epssScore: {
    header: 'EPSS Score',
    accessor: (r) => formatValue(r.epssScore),
  },
  kevListed: {
    header: 'KEV Listed',
    accessor: (r) => formatValue(r.kevListed),
  },
  assetName: {
    header: 'Asset',
    accessor: (r) => formatValue(r.assetName ?? r.asset ?? ''),
  },
  scannerName: {
    header: 'Scanner',
    accessor: (r) => formatValue(r.scannerName ?? r.scanner ?? ''),
  },
  status: {
    header: 'Status',
    accessor: (r) => formatValue(r.status ?? ''),
  },
  discoveredAt: {
    header: 'Discovered At',
    accessor: (r) => formatValue(r.discoveredAt ?? ''),
  },
};

const DEFAULT_FINDING_COLUMNS = [
  'cveIds',
  'title',
  'severity',
  'cvssScore',
  'epssScore',
  'kevListed',
  'assetName',
  'scannerName',
  'status',
  'discoveredAt',
];

/**
 * Export an array of finding objects to a CSV string.
 */
export function exportFindingsToCSV(
  findings: Record<string, unknown>[],
  options?: CsvExportOptions,
): string {
  const separator = options?.separator ?? ',';
  const columns = options?.includeColumns ?? DEFAULT_FINDING_COLUMNS;

  const headers = columns.map((col) => {
    const def = FINDING_COLUMNS[col];
    return def ? escapeCSVField(def.header, separator) : escapeCSVField(col, separator);
  });

  const rows = findings.map((finding) =>
    columns
      .map((col) => {
        const def = FINDING_COLUMNS[col];
        const raw = def ? def.accessor(finding) : formatValue(finding[col]);
        return escapeCSVField(raw, separator);
      })
      .join(separator),
  );

  return [headers.join(separator), ...rows].join('\r\n');
}

// Column definitions for cases export
const CASE_COLUMNS: { key: string; header: string; accessor: (row: Record<string, unknown>) => string }[] = [
  { key: 'id', header: 'Case ID', accessor: (r) => formatValue(r.id) },
  { key: 'title', header: 'Title', accessor: (r) => formatValue(r.title) },
  { key: 'cveIds', header: 'CVE IDs', accessor: (r) => formatValue(r.cveIds) },
  { key: 'severity', header: 'Severity', accessor: (r) => formatValue(r.severity) },
  { key: 'cvssScore', header: 'CVSS', accessor: (r) => formatValue(r.cvssScore) },
  { key: 'epssScore', header: 'EPSS', accessor: (r) => formatValue(r.epssScore) },
  { key: 'kevListed', header: 'KEV', accessor: (r) => formatValue(r.kevListed) },
  { key: 'status', header: 'Status', accessor: (r) => formatValue(r.status) },
  { key: 'findingCount', header: 'Findings Count', accessor: (r) => formatValue(r.findingCount) },
  { key: 'assignedToId', header: 'Assigned To', accessor: (r) => formatValue(r.assignedToId) },
  { key: 'dueAt', header: 'Due Date', accessor: (r) => formatValue(r.dueAt ?? r.kevDueDate ?? '') },
  { key: 'firstSeenAt', header: 'First Seen', accessor: (r) => formatValue(r.firstSeenAt) },
  { key: 'lastSeenAt', header: 'Last Seen', accessor: (r) => formatValue(r.lastSeenAt) },
];

/**
 * Export an array of vulnerability case objects to a CSV string.
 */
export function exportCasesToCSV(cases: Record<string, unknown>[]): string {
  const separator = ',';

  const headers = CASE_COLUMNS.map((col) => escapeCSVField(col.header, separator));

  const rows = cases.map((c) =>
    CASE_COLUMNS.map((col) => escapeCSVField(col.accessor(c), separator)).join(separator),
  );

  return [headers.join(separator), ...rows].join('\r\n');
}

/**
 * Trigger a browser download of a CSV string as a file.
 */
export function downloadCSV(csvContent: string, filename?: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const fname = filename ?? `cveriskpilot-findings-${date}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fname);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
