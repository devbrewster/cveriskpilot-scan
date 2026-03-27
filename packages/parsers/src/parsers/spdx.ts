import type { CanonicalFinding, ParseResult, ParseError } from '../types';

interface SpdxDocument {
  spdxVersion?: string;
  name?: string;
  creationInfo?: {
    creators?: string[];
    created?: string;
  };
  packages?: SpdxPackage[];
  vulnerabilities?: SpdxVulnerability[];
  // Some SPDX docs embed vulnerabilities via relationships or external refs
  relationships?: SpdxRelationship[];
}

interface SpdxPackage {
  SPDXID?: string;
  name?: string;
  versionInfo?: string;
  supplier?: string;
  downloadLocation?: string;
  externalRefs?: SpdxExternalRef[];
}

interface SpdxExternalRef {
  referenceCategory?: string;
  referenceType?: string;
  referenceLocator?: string;
}

interface SpdxVulnerability {
  id?: string;
  name?: string;
  description?: string;
  modified?: string;
  published?: string;
  ratings?: SpdxRating[];
  packages?: Array<{
    packageRef?: string;
    vulnerabilityRef?: string;
  }>;
}

interface SpdxRating {
  score?: number;
  severity?: string;
  method?: string;
  vector?: string;
}

interface SpdxRelationship {
  spdxElementId?: string;
  relationshipType?: string;
  relatedSpdxElement?: string;
}

const SEVERITY_MAP: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
  informational: 'INFO',
  info: 'INFO',
  none: 'INFO',
  unknown: 'INFO',
};

export async function parseSpdx(
  content: string | Buffer,
): Promise<ParseResult> {
  const start = performance.now();
  const errors: ParseError[] = [];
  const findings: CanonicalFinding[] = [];

  const text =
    typeof content === 'string' ? content : content.toString('utf-8');

  let doc: SpdxDocument;
  try {
    doc = JSON.parse(text) as SpdxDocument;
  } catch (err) {
    errors.push({
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      severity: 'error',
    });
    return {
      format: 'SPDX',
      scannerName: 'spdx',
      findings: [],
      metadata: {
        totalFindings: 0,
        parseTimeMs: performance.now() - start,
        errors,
      },
    };
  }

  // Build package lookup by SPDXID
  const packageMap = new Map<string, SpdxPackage>();
  for (const pkg of doc.packages ?? []) {
    if (pkg.SPDXID) {
      packageMap.set(pkg.SPDXID, pkg);
    }
  }

  // Extract tool name from creators
  let scannerName = 'spdx';
  const creators = doc.creationInfo?.creators ?? [];
  for (const creator of creators) {
    if (creator.startsWith('Tool:')) {
      scannerName = creator.replace('Tool:', '').trim() || 'spdx';
      break;
    }
  }

  for (const vuln of doc.vulnerabilities ?? []) {
    try {
      const vulnId = vuln.id ?? vuln.name ?? 'unknown';
      const isCve = vulnId.startsWith('CVE-');
      const cveIds = isCve ? [vulnId] : [];

      // Determine severity from ratings
      let severity: CanonicalFinding['severity'] = 'MEDIUM';
      let cvssScore: number | undefined;
      let cvssVector: string | undefined;
      let cvssVersion: string | undefined;

      if (vuln.ratings && vuln.ratings.length > 0) {
        const rating = vuln.ratings[0];
        severity =
          SEVERITY_MAP[rating.severity?.toLowerCase() ?? ''] ?? 'MEDIUM';
        cvssScore = rating.score;
        cvssVector = rating.vector;
        if (rating.method) {
          cvssVersion = rating.method.replace('CVSSv', '').replace('CVSS_V', '');
        }
      }

      // Find affected packages
      const affectedPackageRefs = (vuln.packages ?? [])
        .map((p) => p.packageRef)
        .filter(Boolean) as string[];

      if (affectedPackageRefs.length === 0) {
        // Create one finding without package info
        findings.push({
          title: vulnId,
          description: vuln.description ?? vulnId,
          cveIds,
          cweIds: [],
          severity,
          cvssScore,
          cvssVector,
          cvssVersion,
          scannerType: 'SCA',
          scannerName,
          assetName: doc.name ?? 'unknown',
          rawObservations: { ...vuln } as Record<string, unknown>,
          discoveredAt: vuln.published ? new Date(vuln.published) : new Date(),
        });
      } else {
        // Create a finding per affected package
        for (const ref of affectedPackageRefs) {
          const pkg = packageMap.get(ref);
          const packageName = pkg?.name;
          const packageVersion = pkg?.versionInfo;

          // Extract ecosystem from external refs (purl)
          let packageEcosystem: string | undefined;
          const purlRef = pkg?.externalRefs?.find(
            (r) =>
              r.referenceType === 'purl' ||
              r.referenceCategory === 'PACKAGE-MANAGER' ||
              r.referenceCategory === 'PACKAGE_MANAGER',
          );
          if (purlRef?.referenceLocator) {
            const match = purlRef.referenceLocator.match(/^pkg:([^/]+)\//);
            packageEcosystem = match?.[1];
          }

          findings.push({
            title: vulnId,
            description: vuln.description ?? vulnId,
            cveIds,
            cweIds: [],
            severity,
            cvssScore,
            cvssVector,
            cvssVersion,
            scannerType: 'SCA',
            scannerName,
            assetName: packageName ?? doc.name ?? 'unknown',
            packageName,
            packageVersion,
            packageEcosystem,
            rawObservations: {
              vulnId,
              packageRef: ref,
              published: vuln.published,
              modified: vuln.modified,
            },
            discoveredAt: vuln.published ? new Date(vuln.published) : new Date(),
          });
        }
      }
    } catch (err) {
      errors.push({
        message: `Error parsing SPDX vulnerability: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'warning',
      });
    }
  }

  return {
    format: 'SPDX',
    scannerName,
    findings,
    metadata: {
      totalFindings: findings.length,
      parseTimeMs: performance.now() - start,
      errors,
    },
  };
}
