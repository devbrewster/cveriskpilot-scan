import ExcelJS from 'exceljs';
import type { CanonicalFinding, ParseResult, ParseError } from '../types';

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
  solution: ['solution', 'remediation', 'fix', 'recommendation'],
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
  moderate: 'MEDIUM',
  '2': 'MEDIUM',
  low: 'LOW',
  '1': 'LOW',
  info: 'INFO',
  informational: 'INFO',
  information: 'INFO',
  none: 'INFO',
  '0': 'INFO',
};

const POSITIONAL_FALLBACK: Record<string, number> = {
  cve: 0,
  title: 1,
  severity: 2,
  host: 3,
  description: 4,
  solution: 5,
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

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).text);
  }
  return String(value);
}

export async function parseXlsx(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const workbook = new ExcelJS.Workbook();
  try {
    const buf = typeof content === 'string' ? Buffer.from(content, 'base64') : content;
    await workbook.xlsx.load(buf as any);
  } catch (err) {
    errors.push({
      message: `XLSX parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'XLSX',
      scannerName: 'xlsx-import',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) {
    errors.push({
      message: 'No sheets or rows found in XLSX file',
      severity: 'error',
    });
    return {
      format: 'XLSX',
      scannerName: 'xlsx-import',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  // Extract headers from first row
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellToString(cell.value);
  });

  if (headers.length === 0) {
    return {
      format: 'XLSX',
      scannerName: 'xlsx-import',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  // Detect columns
  const columnMap: Record<string, string | undefined> = {};
  let usePositional = true;

  for (const [field, candidates] of Object.entries(COLUMN_MAPPINGS)) {
    const col = findColumn(headers, candidates);
    columnMap[field] = col;
    if (col) usePositional = false;
  }

  // Build header-to-index map
  const headerIndex: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    if (headers[i]) headerIndex[headers[i]] = i;
  }

  // Process data rows (skip header)
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    if (!row.hasValues) continue;

    try {
      const values: string[] = [];
      const rawObj: Record<string, unknown> = {};

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const idx = colNumber - 1;
        values[idx] = cellToString(cell.value);
        if (headers[idx]) rawObj[headers[idx]] = cell.value;
      });

      const getField = (field: string): string => {
        if (usePositional && headers.length >= 3) {
          const posIdx = POSITIONAL_FALLBACK[field];
          return posIdx !== undefined ? (values[posIdx] ?? '') : '';
        }
        const col = columnMap[field];
        if (!col) return '';
        const idx = headerIndex[col];
        return idx !== undefined ? (values[idx] ?? '') : '';
      };

      const title = getField('title') || 'Untitled Finding';
      const description = getField('description') || title;
      const rawSeverity = getField('severity');
      const cveRaw = getField('cve');
      const hostRaw = getField('host');
      const solutionRaw = getField('solution');

      const severity: CanonicalFinding['severity'] =
        SEVERITY_NORMALIZE[rawSeverity.toLowerCase().trim()] ?? 'MEDIUM';

      const cveIds = cveRaw
        ? [...new Set(cveRaw.match(/CVE-\d{4}-\d{4,}/g) ?? [])]
        : [];

      const cweRaw = getField('cwe');
      const cweIds = cweRaw ? (cweRaw.match(/CWE-\d+/g) ?? []) : [];

      const cvssRaw = getField('cvss');
      const cvssScore =
        cvssRaw && !isNaN(Number(cvssRaw)) ? Number(cvssRaw) : undefined;

      const ip = getField('ip');
      const host = hostRaw || ip || 'unknown';

      const portRaw = getField('port');
      const port =
        portRaw && !isNaN(Number(portRaw)) ? Number(portRaw) : undefined;
      const protocol = getField('protocol') || undefined;

      findings.push({
        title,
        description,
        cveIds,
        cweIds,
        severity,
        cvssScore,
        scannerType: 'VM',
        scannerName: 'xlsx-import',
        assetName: host,
        hostname: hostRaw || undefined,
        ipAddress: ip || undefined,
        port,
        protocol,
        packageName: getField('package_name') || undefined,
        packageVersion: getField('package_version') || undefined,
        fixedVersion: getField('fixed_version') || undefined,
        filePath: getField('file_path') || undefined,
        rawObservations: {
          ...rawObj,
          solution: solutionRaw || undefined,
        },
        discoveredAt: new Date(),
      });
    } catch (err) {
      errors.push({
        message: `Error parsing XLSX row ${rowNum}: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'warning',
      });
    }
  }

  return {
    format: 'XLSX',
    scannerName: 'xlsx-import',
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
