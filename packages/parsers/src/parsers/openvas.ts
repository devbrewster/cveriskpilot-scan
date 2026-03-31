import { XMLParser } from 'fast-xml-parser';
import type { CanonicalFinding, ParseResult, ParseError } from '../types';

const THREAT_MAP: Record<string, CanonicalFinding['severity']> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  log: 'INFO',
  debug: 'INFO',
  alarm: 'CRITICAL',
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export async function parseOpenvas(
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
      format: 'OPENVAS',
      scannerName: 'openvas',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  // OpenVAS structure: report > report > results > result
  // or: report > results > result
  let reportObj = parsed['report'] as Record<string, unknown> | undefined;

  // Handle nested report > report structure
  if (reportObj && reportObj['report'] && typeof reportObj['report'] === 'object') {
    reportObj = reportObj['report'] as Record<string, unknown>;
  }

  const resultsContainer = reportObj?.['results'] as
    | Record<string, unknown>
    | undefined;
  const results = toArray(
    (resultsContainer?.['result'] ?? reportObj?.['result']) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );

  for (const result of results) {
    try {
      const nvt = result['nvt'] as Record<string, unknown> | undefined;
      const oid = String(nvt?.['@_oid'] ?? nvt?.['oid'] ?? '');
      const name = String(
        result['name'] ?? nvt?.['name'] ?? 'Unknown Finding',
      );

      const threat = String(result['threat'] ?? 'log').toLowerCase();
      const severity = THREAT_MAP[threat] ?? 'INFO';

      const description = String(
        result['description'] ?? result['desc'] ?? name,
      );

      // Extract host info
      const hostRaw = result['host'] as
        | string
        | Record<string, unknown>
        | undefined;
      let hostIp: string;
      let hostname: string | undefined;
      if (typeof hostRaw === 'string') {
        hostIp = hostRaw;
      } else if (typeof hostRaw === 'object' && hostRaw !== null) {
        hostIp = String(hostRaw['#text'] ?? hostRaw['ip'] ?? 'unknown');
        hostname = hostRaw['hostname']
          ? String(hostRaw['hostname'])
          : undefined;
      } else {
        hostIp = 'unknown';
      }

      // Extract port info
      const portRaw = String(result['port'] ?? '');
      let port: number | undefined;
      let protocol: string | undefined;
      // OpenVAS port format: "443/tcp" or "general/tcp"
      const portMatch = portRaw.match(/^(\d+)\/(tcp|udp)/i);
      if (portMatch) {
        port = Number(portMatch[1]);
        protocol = portMatch[2];
      }

      // Extract CVEs from nvt refs or tags
      const cveIds: string[] = [];
      const cweIds: string[] = [];
      const refs = nvt?.['refs'] as Record<string, unknown> | undefined;
      const refList = toArray(
        refs?.['ref'] as
          | Record<string, unknown>
          | Record<string, unknown>[]
          | undefined,
      );
      for (const ref of refList) {
        const refType = String(ref['@_type'] ?? '').toLowerCase();
        const refId = String(ref['@_id'] ?? '');
        if (refType === 'cve' && refId.startsWith('CVE-')) {
          cveIds.push(refId);
        } else if (refType === 'cwe') {
          cweIds.push(refId.startsWith('CWE-') ? refId : `CWE-${refId}`);
        }
      }

      // Also try to extract CVEs from nvt > cve field
      const nvtCve = nvt?.['cve'] ? String(nvt['cve']) : '';
      if (nvtCve && nvtCve !== 'NOCVE') {
        const matches = nvtCve.match(/CVE-\d{4}-\d{4,}/g);
        if (matches) {
          for (const m of matches) {
            if (!cveIds.includes(m)) cveIds.push(m);
          }
        }
      }

      // Extract CVSS from nvt
      const cvssBaseRaw = nvt?.['cvss_base'] ?? result['severity'];
      const cvssScore =
        cvssBaseRaw !== undefined && !isNaN(Number(cvssBaseRaw))
          ? Number(cvssBaseRaw)
          : undefined;

      // Extract solution
      const solution = nvt?.['solution']
        ? typeof nvt['solution'] === 'object'
          ? String(
              (nvt['solution'] as Record<string, unknown>)['#text'] ?? '',
            )
          : String(nvt['solution'])
        : undefined;

      findings.push({
        title: name,
        description,
        cveIds,
        cweIds,
        severity,
        cvssScore:
          cvssScore !== undefined && !isNaN(cvssScore)
            ? cvssScore
            : undefined,
        scannerType: 'VM',
        scannerName: 'openvas',
        assetName: hostIp,
        hostname,
        ipAddress: hostIp !== 'unknown' ? hostIp : undefined,
        port,
        protocol,
        rawObservations: {
          oid,
          solution,
          qod: result['qod'],
          originalThreat: threat,
        },
        discoveredAt: new Date(),
      });
    } catch (err) {
      errors.push({
        message: `Error parsing OpenVAS result: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'warning',
      });
    }
  }

  return {
    format: 'OPENVAS',
    scannerName: 'openvas',
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
