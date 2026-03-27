import type { CanonicalFinding, ParseResult, ParseError } from '../types.js';

const CVE_REGEX = /CVE-\d{4}-\d{4,}/g;
const CWE_REGEX = /CWE-\d+/g;

const SEVERITY_NORMALIZE: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  moderate: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
  informational: 'INFO',
  negligible: 'INFO',
  unknown: 'INFO',
};

interface TrivyResult {
  Target?: string;
  Type?: string;
  Vulnerabilities?: TrivyVuln[];
}

interface TrivyVuln {
  VulnerabilityID?: string;
  PkgName?: string;
  InstalledVersion?: string;
  FixedVersion?: string;
  Title?: string;
  Description?: string;
  Severity?: string;
  CVSS?: Record<string, { V3Score?: number; V3Vector?: string }>;
  CweIDs?: string[];
}

interface SnykVuln {
  id?: string;
  title?: string;
  description?: string;
  severity?: string;
  identifiers?: { CVE?: string[]; CWE?: string[] };
  packageName?: string;
  version?: string;
  fixedIn?: string[];
  cvssScore?: number;
  CVSSv3?: string;
  from?: string[];
}

function isTrivy(data: unknown): data is { Results: TrivyResult[] } {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj['Results']) &&
    obj['Results'].length > 0 &&
    typeof obj['Results'][0] === 'object' &&
    obj['Results'][0] !== null &&
    'Vulnerabilities' in obj['Results'][0]
  );
}

function isSnyk(
  data: unknown,
): data is { vulnerabilities: SnykVuln[]; projectName?: string } {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj['vulnerabilities']) &&
    obj['vulnerabilities'].length > 0 &&
    typeof obj['vulnerabilities'][0] === 'object' &&
    obj['vulnerabilities'][0] !== null &&
    'severity' in obj['vulnerabilities'][0]
  );
}

function parseTrivyFindings(data: { Results: TrivyResult[] }): {
  findings: CanonicalFinding[];
  scannerName: string;
} {
  const findings: CanonicalFinding[] = [];
  for (const result of data.Results) {
    const target = result.Target ?? 'unknown';
    for (const vuln of result.Vulnerabilities ?? []) {
      const severity =
        SEVERITY_NORMALIZE[vuln.Severity?.toLowerCase() ?? ''] ?? 'MEDIUM';

      // Extract CVSS from first available source
      let cvssScore: number | undefined;
      let cvssVector: string | undefined;
      if (vuln.CVSS) {
        for (const source of Object.values(vuln.CVSS)) {
          if (source.V3Score) {
            cvssScore = source.V3Score;
            cvssVector = source.V3Vector;
            break;
          }
        }
      }

      findings.push({
        title: vuln.Title ?? vuln.VulnerabilityID ?? 'Unknown',
        description: vuln.Description ?? vuln.Title ?? '',
        cveIds: vuln.VulnerabilityID
          ? [vuln.VulnerabilityID]
          : [],
        cweIds: vuln.CweIDs ?? [],
        severity,
        cvssScore,
        cvssVector,
        cvssVersion: cvssVector ? '3.0' : undefined,
        scannerType: 'SCA',
        scannerName: 'trivy',
        assetName: target,
        packageName: vuln.PkgName,
        packageVersion: vuln.InstalledVersion,
        fixedVersion: vuln.FixedVersion,
        rawObservations: { ...vuln } as Record<string, unknown>,
        discoveredAt: new Date(),
      });
    }
  }
  return { findings, scannerName: 'trivy' };
}

function parseSnykFindings(data: {
  vulnerabilities: SnykVuln[];
  projectName?: string;
}): { findings: CanonicalFinding[]; scannerName: string } {
  const findings: CanonicalFinding[] = [];
  const assetName = data.projectName ?? 'unknown';

  for (const vuln of data.vulnerabilities) {
    const severity =
      SEVERITY_NORMALIZE[vuln.severity?.toLowerCase() ?? ''] ?? 'MEDIUM';

    findings.push({
      title: vuln.title ?? vuln.id ?? 'Unknown',
      description: vuln.description ?? vuln.title ?? '',
      cveIds: vuln.identifiers?.CVE ?? [],
      cweIds: vuln.identifiers?.CWE ?? [],
      severity,
      cvssScore: vuln.cvssScore,
      cvssVector: vuln.CVSSv3,
      cvssVersion: vuln.CVSSv3 ? '3.0' : undefined,
      scannerType: 'SCA',
      scannerName: 'snyk',
      assetName,
      packageName: vuln.packageName,
      packageVersion: vuln.version,
      fixedVersion: vuln.fixedIn?.[0],
      rawObservations: { ...vuln } as Record<string, unknown>,
      discoveredAt: new Date(),
    });
  }
  return { findings, scannerName: 'snyk' };
}

function parseGenericFindings(data: unknown[]): {
  findings: CanonicalFinding[];
  scannerName: string;
} {
  const findings: CanonicalFinding[] = [];

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;

    const title = String(
      obj['title'] ?? obj['name'] ?? obj['vulnerability'] ?? 'Unknown',
    );
    const description = String(
      obj['description'] ?? obj['desc'] ?? obj['details'] ?? title,
    );

    const rawSeverity = String(
      obj['severity'] ?? obj['risk'] ?? obj['level'] ?? 'medium',
    ).toLowerCase();
    const severity = SEVERITY_NORMALIZE[rawSeverity] ?? 'MEDIUM';

    const allText = `${title} ${description}`;
    const cveIds = [
      ...new Set([
        ...(allText.match(CVE_REGEX) ?? []),
        ...(typeof obj['cve'] === 'string' ? [obj['cve']] : []),
        ...(Array.isArray(obj['cve_ids']) ? (obj['cve_ids'] as string[]) : []),
      ]),
    ];

    const cweIds = [
      ...new Set([
        ...(allText.match(CWE_REGEX) ?? []),
        ...(typeof obj['cwe'] === 'string' ? [obj['cwe']] : []),
      ]),
    ];

    const cvssRaw = obj['cvss'] ?? obj['cvss_score'] ?? obj['score'];
    const cvssScore =
      cvssRaw !== undefined && !isNaN(Number(cvssRaw))
        ? Number(cvssRaw)
        : undefined;

    const host = String(
      obj['host'] ?? obj['hostname'] ?? obj['asset'] ?? obj['ip'] ?? 'unknown',
    );

    findings.push({
      title,
      description,
      cveIds,
      cweIds,
      severity,
      cvssScore,
      scannerType: 'VM',
      scannerName: 'json-import',
      assetName: host,
      hostname:
        typeof obj['hostname'] === 'string' ? obj['hostname'] : undefined,
      ipAddress: typeof obj['ip'] === 'string' ? obj['ip'] : undefined,
      port:
        obj['port'] !== undefined && !isNaN(Number(obj['port']))
          ? Number(obj['port'])
          : undefined,
      packageName:
        typeof obj['package'] === 'string' ? obj['package'] : undefined,
      packageVersion:
        typeof obj['version'] === 'string' ? obj['version'] : undefined,
      filePath:
        typeof obj['file'] === 'string' || typeof obj['path'] === 'string'
          ? String(obj['file'] ?? obj['path'])
          : undefined,
      rawObservations: obj,
      discoveredAt: new Date(),
    });
  }
  return { findings, scannerName: 'json-import' };
}

export async function parseJson(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];

  const text =
    typeof content === 'string' ? content : content.toString('utf-8');

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    errors.push({
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'JSON_FORMAT',
      scannerName: 'json-import',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  let result: { findings: CanonicalFinding[]; scannerName: string };

  if (isTrivy(data)) {
    result = parseTrivyFindings(data);
  } else if (isSnyk(data)) {
    result = parseSnykFindings(data);
  } else if (Array.isArray(data)) {
    result = parseGenericFindings(data);
  } else {
    errors.push({
      message:
        'Unrecognized JSON format. Expected an array or known scanner output.',
      severity: 'warning',
    });
    result = { findings: [], scannerName: 'json-import' };
  }

  return {
    format: 'JSON_FORMAT',
    scannerName: result.scannerName,
    findings: result.findings,
    metadata: {
      totalFindings: result.findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
