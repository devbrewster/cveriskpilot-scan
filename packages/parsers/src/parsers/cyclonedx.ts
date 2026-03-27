import type { CanonicalFinding, ParseResult, ParseError } from '../types.js';

interface CycloneDxBom {
  bomFormat?: string;
  specVersion?: string;
  metadata?: {
    tools?: Array<{ name?: string; vendor?: string }> | { components?: Array<{ name?: string }> };
  };
  components?: CycloneDxComponent[];
  vulnerabilities?: CycloneDxVulnerability[];
}

interface CycloneDxComponent {
  'bom-ref'?: string;
  type?: string;
  name?: string;
  version?: string;
  purl?: string;
  group?: string;
}

interface CycloneDxVulnerability {
  id?: string;
  description?: string;
  source?: { name?: string; url?: string };
  ratings?: Array<{
    severity?: string;
    score?: number;
    vector?: string;
    method?: string;
  }>;
  cwes?: number[];
  affects?: Array<{
    ref?: string;
  }>;
  recommendation?: string;
  advisories?: Array<{ url?: string }>;
  properties?: Array<{ name?: string; value?: string }>;
}

const SEVERITY_MAP: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  info: 'INFO',
  informational: 'INFO',
  none: 'INFO',
  unknown: 'INFO',
};

function extractToolName(metadata: CycloneDxBom['metadata']): string {
  if (!metadata?.tools) return 'cyclonedx';

  // CycloneDX 1.5+ uses tools.components
  if ('components' in metadata.tools && Array.isArray(metadata.tools.components)) {
    return metadata.tools.components[0]?.name ?? 'cyclonedx';
  }

  // CycloneDX 1.4 uses tools as array
  if (Array.isArray(metadata.tools)) {
    return metadata.tools[0]?.name ?? 'cyclonedx';
  }

  return 'cyclonedx';
}

function extractEcosystemFromPurl(purl: string | undefined): string | undefined {
  if (!purl) return undefined;
  // purl format: pkg:type/namespace/name@version
  const match = purl.match(/^pkg:([^/]+)\//);
  return match?.[1];
}

export async function parseCycloneDx(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const text =
    typeof content === 'string' ? content : content.toString('utf-8');

  let bom: CycloneDxBom;
  try {
    bom = JSON.parse(text) as CycloneDxBom;
  } catch (err) {
    errors.push({
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'CYCLONEDX',
      scannerName: 'cyclonedx',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  // Build component lookup by bom-ref
  const componentMap = new Map<string, CycloneDxComponent>();
  for (const comp of bom.components ?? []) {
    if (comp['bom-ref']) {
      componentMap.set(comp['bom-ref'], comp);
    }
  }

  const scannerName = extractToolName(bom.metadata);

  for (const vuln of bom.vulnerabilities ?? []) {
    try {
      const vulnId = vuln.id ?? 'unknown';
      const isCve = vulnId.startsWith('CVE-');
      const cveIds = isCve ? [vulnId] : [];
      const cweIds = (vuln.cwes ?? []).map((c) => `CWE-${c}`);

      // Get severity and CVSS from ratings
      let severity: CanonicalFinding['severity'] = 'MEDIUM';
      let cvssScore: number | undefined;
      let cvssVector: string | undefined;
      let cvssVersion: string | undefined;

      if (vuln.ratings && vuln.ratings.length > 0) {
        const rating = vuln.ratings[0];
        severity =
          SEVERITY_MAP[rating?.severity?.toLowerCase() ?? ''] ?? 'MEDIUM';
        cvssScore = rating?.score;
        cvssVector = rating?.vector;
        if (rating?.method) {
          cvssVersion = rating.method.replace('CVSSv', '');
        }
      }

      // Get affected component info
      let packageName: string | undefined;
      let packageVersion: string | undefined;
      let packageEcosystem: string | undefined;
      let assetName = vulnId;

      const affectedRef = vuln.affects?.[0]?.ref;
      if (affectedRef) {
        const component = componentMap.get(affectedRef);
        if (component) {
          packageName = component.group
            ? `${component.group}/${component.name}`
            : component.name;
          packageVersion = component.version;
          packageEcosystem = extractEcosystemFromPurl(component.purl);
          assetName = packageName ?? assetName;
        }
      }

      findings.push({
        title: vulnId,
        description: vuln.description ?? vulnId,
        cveIds,
        cweIds,
        severity,
        cvssScore,
        cvssVector,
        cvssVersion,
        scannerType: 'SCA',
        scannerName,
        assetName,
        packageName,
        packageVersion,
        packageEcosystem,
        rawObservations: { ...vuln } as Record<string, unknown>,
        discoveredAt: new Date(),
      });
    } catch (err) {
      errors.push({
        message: `Error parsing vulnerability: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'warning',
      });
    }
  }

  return {
    format: 'CYCLONEDX',
    scannerName,
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
