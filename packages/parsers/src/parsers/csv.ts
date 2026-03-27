import Papa from 'papaparse';
import type { CanonicalFinding, ParseResult, ParseError } from '../types.js';

// Map of canonical field names to possible column header variations (lowercase)
const COLUMN_MAPPINGS: Record<string, string[]> = {
  title: ['title', 'name', 'vulnerability', 'vuln_name', 'finding', 'plugin_name'],
  description: ['description', 'desc', 'details', 'synopsis', 'summary'],
  cve: ['cve', 'cve_id', 'cve_ids', 'cveid'],
  cwe: ['cwe', 'cwe_id', 'cwe_ids', 'cweid'],
  severity: ['severity', 'risk', 'risk_level', 'threat', 'priority', 'level'],
  cvss: ['cvss', 'cvss_score', 'cvss3', 'cvss_base_score', 'score'],
  host: ['host', 'hostname', 'host_name', 'asset', 'asset_name', 'target'],
  ip: ['ip', 'ip_address', 'ipaddress', 'host_ip'],
  port: ['port', 'dst_port', 'service_port'],
  protocol: ['protocol', 'proto', 'service_protocol'],
  package_name: ['package', 'package_name', 'component', 'library'],
  package_version: ['version', 'package_version', 'installed_version', 'current_version'],
  fixed_version: ['fixed_version', 'fix_version', 'patched_version', 'fixed_in'],
  file_path: ['file', 'file_path', 'filepath', 'path', 'location'],
};

const SEVERITY_NORMALIZE: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  crit: 'CRITICAL',
  '5': 'CRITICAL',
  '4': 'CRITICAL',
  high: 'HIGH',
  '3': 'HIGH',
  medium: 'MEDIUM',
  med: 'MEDIUM',
  '2': 'MEDIUM',
  low: 'LOW',
  '1': 'LOW',
  info: 'INFO',
  informational: 'INFO',
  information: 'INFO',
  none: 'INFO',
  '0': 'INFO',
};

function findColumn(
  headers: string[],
  candidates: string[],
): string | undefined {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

export async function parseCsv(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const text =
    typeof content === 'string' ? content : content.toString('utf-8');

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    delimiter: undefined, // auto-detect
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push({
        line: err.row !== undefined ? err.row + 2 : undefined, // +2 for header + 0-based
        message: err.message,
        severity: 'warning',
      });
    }
  }

  const headers = result.meta.fields ?? [];
  const columnMap: Record<string, string | undefined> = {};
  for (const [field, candidates] of Object.entries(COLUMN_MAPPINGS)) {
    columnMap[field] = findColumn(headers, candidates);
  }

  for (const row of result.data) {
    try {
      const title =
        (columnMap['title'] ? row[columnMap['title']] : undefined) ??
        'Untitled Finding';
      const description =
        (columnMap['description']
          ? row[columnMap['description']]
          : undefined) ?? title;

      const rawSeverity = (
        columnMap['severity'] ? row[columnMap['severity']] : undefined
      )
        ?.toLowerCase()
        ?.trim();
      const severity: CanonicalFinding['severity'] =
        (rawSeverity ? SEVERITY_NORMALIZE[rawSeverity] : undefined) ??
        'MEDIUM';

      const cveRaw = columnMap['cve'] ? row[columnMap['cve']] : undefined;
      const cveIds = cveRaw
        ? (cveRaw.match(/CVE-\d{4}-\d{4,}/g) ?? [])
        : [];

      const cweRaw = columnMap['cwe'] ? row[columnMap['cwe']] : undefined;
      const cweIds = cweRaw ? (cweRaw.match(/CWE-\d+/g) ?? []) : [];

      const cvssRaw = columnMap['cvss']
        ? row[columnMap['cvss']]
        : undefined;
      const cvssScore =
        cvssRaw && !isNaN(Number(cvssRaw)) ? Number(cvssRaw) : undefined;

      const host = columnMap['host']
        ? row[columnMap['host']]
        : undefined;
      const ip = columnMap['ip'] ? row[columnMap['ip']] : undefined;
      const portRaw = columnMap['port']
        ? row[columnMap['port']]
        : undefined;
      const port =
        portRaw && !isNaN(Number(portRaw)) ? Number(portRaw) : undefined;
      const protocol = columnMap['protocol']
        ? row[columnMap['protocol']]
        : undefined;

      const assetName = host ?? ip ?? 'unknown';

      findings.push({
        title,
        description,
        cveIds,
        cweIds,
        severity,
        cvssScore,
        scannerType: 'VM',
        scannerName: 'csv-import',
        assetName,
        hostname: host,
        ipAddress: ip,
        port,
        protocol,
        packageName: columnMap['package_name']
          ? row[columnMap['package_name']]
          : undefined,
        packageVersion: columnMap['package_version']
          ? row[columnMap['package_version']]
          : undefined,
        fixedVersion: columnMap['fixed_version']
          ? row[columnMap['fixed_version']]
          : undefined,
        filePath: columnMap['file_path']
          ? row[columnMap['file_path']]
          : undefined,
        rawObservations: { ...row },
        discoveredAt: new Date(),
      });
    } catch (err) {
      errors.push({
        message: `Error parsing CSV row: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'warning',
      });
    }
  }

  return {
    format: 'CSV',
    scannerName: 'csv-import',
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
