import { XMLParser } from 'fast-xml-parser';
import type { CanonicalFinding, ParseResult, ParseError } from '../types.js';

const SEVERITY_MAP: Record<number, CanonicalFinding['severity']> = {
  0: 'INFO',
  1: 'LOW',
  2: 'MEDIUM',
  3: 'HIGH',
  4: 'CRITICAL',
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function extractCves(item: Record<string, unknown>): string[] {
  const cves = toArray(item['cve'] as string | string[] | undefined);
  return cves.filter((c): c is string => typeof c === 'string');
}

function extractCwes(item: Record<string, unknown>): string[] {
  const cwes = toArray(item['cwe'] as string | string[] | undefined);
  return cwes
    .map((c) => (typeof c === 'string' ? c : String(c)))
    .map((c) => (c.startsWith('CWE-') ? c : `CWE-${c}`));
}

export async function parseNessus(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const xml =
    typeof content === 'string' ? content : content.toString('utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch (err) {
    errors.push({
      message: `XML parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'NESSUS',
      scannerName: 'nessus',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  const report =
    (parsed as Record<string, unknown>)['NessusClientData_v2'] as
      | Record<string, unknown>
      | undefined;
  const reportObj = report?.['Report'] as Record<string, unknown> | undefined;
  const hosts = toArray(
    reportObj?.['ReportHost'] as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );

  for (const host of hosts) {
    const hostName =
      (host['@_name'] as string | undefined) ?? 'unknown-host';

    // Extract host-ip from HostProperties
    let hostIp: string | undefined;
    const hostProps = host['HostProperties'] as
      | Record<string, unknown>
      | undefined;
    if (hostProps) {
      const tags = toArray(
        hostProps['tag'] as
          | Record<string, unknown>
          | Record<string, unknown>[]
          | undefined,
      );
      for (const tag of tags) {
        if (tag['@_name'] === 'host-ip') {
          hostIp = String(tag['#text'] ?? '');
        }
      }
    }

    const items = toArray(
      host['ReportItem'] as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined,
    );

    for (const item of items) {
      try {
        const severityNum = Number(item['@_severity'] ?? 0);
        const severity = SEVERITY_MAP[severityNum] ?? 'INFO';
        const pluginId = String(item['@_pluginID'] ?? '');
        const pluginName = String(item['@_pluginName'] ?? 'Unknown Plugin');
        const port = Number(item['@_port'] ?? 0);
        const protocol = (item['@_protocol'] as string) ?? undefined;

        const synopsis = String(item['synopsis'] ?? '');
        const description = String(item['description'] ?? synopsis);
        const cvssScore = item['cvss3_base_score']
          ? Number(item['cvss3_base_score'])
          : undefined;
        const cvssVector = item['cvss3_vector']
          ? String(item['cvss3_vector'])
          : undefined;

        const cveIds = extractCves(item);
        const cweIds = extractCwes(item);

        findings.push({
          title: pluginName,
          description,
          cveIds,
          cweIds,
          severity,
          cvssScore:
            cvssScore !== undefined && !isNaN(cvssScore)
              ? cvssScore
              : undefined,
          cvssVector,
          cvssVersion: cvssVector ? '3.0' : undefined,
          scannerType: 'VM',
          scannerName: 'nessus',
          assetName: hostIp ?? hostName,
          hostname: hostName,
          ipAddress: hostIp,
          port: port || undefined,
          protocol,
          rawObservations: {
            pluginId,
            pluginName,
            synopsis,
            solution: item['solution'] ?? undefined,
            svcName: item['@_svc_name'] ?? undefined,
          },
          discoveredAt: new Date(),
        });
      } catch (err) {
        errors.push({
          message: `Error parsing ReportItem: ${err instanceof Error ? err.message : String(err)}`,
          severity: 'warning',
        });
      }
    }
  }

  return {
    format: 'NESSUS',
    scannerName: 'nessus',
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
