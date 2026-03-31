import { XMLParser } from 'fast-xml-parser';
import type { CanonicalFinding, ParseResult, ParseError } from '../types';

const SEVERITY_MAP: Record<number, CanonicalFinding['severity']> = {
  1: 'INFO',
  2: 'LOW',
  3: 'MEDIUM',
  4: 'HIGH',
  5: 'CRITICAL',
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export async function parseQualys(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const xml =
    typeof content === 'string' ? content : content.toString('utf-8');

  if (xml.length > 100 * 1024 * 1024) {
    throw new Error('XML file exceeds maximum allowed size (100MB)');
  }

  // SECURITY: Use multiline-aware regex to handle internal subsets containing '>'
  const sanitizedXml = xml.replace(/<!DOCTYPE[\s\S]*?(?:\[[\s\S]*?\])?\s*>/gi, '');

  // XXE-safe: processEntities=false prevents entity expansion (billion laughs),
  // and DTD declarations are stripped above via regex.
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: false,
    parseAttributeValue: false,
    trimValues: true,
    processEntities: false,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(sanitizedXml) as Record<string, unknown>;
  } catch (err) {
    errors.push({
      message: `XML parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'QUALYS',
      scannerName: 'qualys',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  // Qualys XML structure: SCAN > IP > VULNS > CAT > VULN
  // or: ASSET_DATA_REPORT > HOST_LIST > HOST > VULN_INFO_LIST > VULN_INFO
  // We handle both the scan report and the simple structure
  const scan = (parsed['SCAN'] ?? parsed['scan']) as
    | Record<string, unknown>
    | undefined;

  const ips = toArray(
    (scan?.['IP'] ?? scan?.['ip']) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );

  for (const ip of ips) {
    const ipAddress =
      (ip['@_value'] as string | undefined) ??
      (ip['@_name'] as string | undefined) ??
      'unknown';
    const hostname =
      (ip['@_hostname'] as string | undefined) ??
      (ip['@_name'] as string | undefined);

    // VULNS > CAT > VULN structure
    const vulns = ip['VULNS'] as Record<string, unknown> | undefined;
    const cats = toArray(
      (vulns?.['CAT'] ?? ip['CAT']) as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined,
    );

    for (const cat of cats) {
      const vulnItems = toArray(
        cat['VULN'] as
          | Record<string, unknown>
          | Record<string, unknown>[]
          | undefined,
      );

      for (const vuln of vulnItems) {
        try {
          const qid = String(vuln['@_qid'] ?? vuln['QID'] ?? '');
          const severityNum = Number(vuln['@_severity'] ?? vuln['SEVERITY'] ?? 2);
          const severity = SEVERITY_MAP[severityNum] ?? 'MEDIUM';

          const title = String(
            vuln['TITLE'] ?? vuln['@_title'] ?? `QID ${qid}`,
          );
          const description = String(
            vuln['DIAGNOSIS'] ?? vuln['DESCRIPTION'] ?? title,
          );
          const solution = vuln['SOLUTION']
            ? String(vuln['SOLUTION'])
            : undefined;

          const cvssScore = vuln['CVSS_BASE']
            ? Number(vuln['CVSS_BASE'])
            : vuln['CVSS3_BASE']
              ? Number(vuln['CVSS3_BASE'])
              : undefined;
          const cvssVector = vuln['CVSS3_VECTOR']
            ? String(vuln['CVSS3_VECTOR'])
            : undefined;

          // Extract CVE IDs
          const cveRaw = String(vuln['CVE_ID'] ?? vuln['CVE_LIST'] ?? '');
          const cveIds = [
            ...new Set(cveRaw.match(/CVE-\d{4}-\d{4,}/g) ?? []),
          ];

          // Extract port info
          const portRaw = vuln['PORT'] ?? vuln['@_port'];
          const port =
            portRaw !== undefined && !isNaN(Number(portRaw))
              ? Number(portRaw)
              : undefined;
          const protocol = vuln['PROTOCOL']
            ? String(vuln['PROTOCOL'])
            : undefined;

          findings.push({
            title,
            description,
            cveIds,
            cweIds: [],
            severity,
            cvssScore:
              cvssScore !== undefined && !isNaN(cvssScore)
                ? cvssScore
                : undefined,
            cvssVector,
            cvssVersion: cvssVector ? '3.0' : undefined,
            scannerType: 'VM',
            scannerName: 'qualys',
            assetName: ipAddress,
            hostname,
            ipAddress,
            port,
            protocol,
            rawObservations: {
              qid,
              solution,
              category: cat['@_value'] ?? cat['@_name'],
              result: vuln['RESULT'] ?? undefined,
            },
            discoveredAt: new Date(),
          });
        } catch (err) {
          errors.push({
            message: `Error parsing Qualys VULN: ${err instanceof Error ? err.message : String(err)}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return {
    format: 'QUALYS',
    scannerName: 'qualys',
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
