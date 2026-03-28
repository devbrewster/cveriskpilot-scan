// ---------------------------------------------------------------------------
// Rapid7 InsightVM → CanonicalFinding Mapper
// ---------------------------------------------------------------------------

import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// Rapid7 API Response Types
// ---------------------------------------------------------------------------

export interface Rapid7Asset {
  id: number;
  ip: string;
  hostName?: string;
  hostNames?: Array<{ name: string; source?: string }>;
  mac?: string;
  os?: string;
  osFingerprint?: {
    description?: string;
    family?: string;
    product?: string;
    vendor?: string;
    version?: string;
  };
  type?: string;
  assessedForVulnerabilities?: boolean;
  lastAssessedForVulnerabilities?: string;
  riskScore?: number;
  tags?: Array<{ name: string; type: string }>;
}

export interface Rapid7Vulnerability {
  id: string;
  title: string;
  description?: string;
  severity: string; // 'Critical' | 'Severe' | 'Moderate' | 'Low'
  cvss?: {
    v2?: { score: number; vector?: string };
    v3?: { score: number; vector?: string; attackVector?: string };
  };
  categories?: string[];
  cves?: string[];
  references?: Array<{ source: string; id?: string; url?: string }>;
  results?: Array<{
    port?: number;
    protocol?: string;
    proof?: string;
    status: string;
  }>;
  since?: string;
  status?: string;
}

export interface Rapid7AssetsResponse {
  resources: Rapid7Asset[];
  page: {
    number: number;
    size: number;
    totalPages: number;
    totalResources: number;
  };
  links?: Array<{ href: string; rel: string }>;
}

export interface Rapid7VulnerabilitiesResponse {
  resources: Rapid7Vulnerability[];
  page: {
    number: number;
    size: number;
    totalPages: number;
    totalResources: number;
  };
  links?: Array<{ href: string; rel: string }>;
}

// ---------------------------------------------------------------------------
// Severity Mapping
// ---------------------------------------------------------------------------

const SEVERITY_MAP: Record<string, CanonicalFinding['severity']> = {
  critical: 'CRITICAL',
  severe: 'HIGH',
  moderate: 'MEDIUM',
  low: 'LOW',
};

function mapSeverity(r7Severity: string): CanonicalFinding['severity'] {
  return SEVERITY_MAP[r7Severity.toLowerCase()] ?? 'INFO';
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Map a Rapid7 vulnerability (with its parent asset context) to a CanonicalFinding.
 */
export function mapRapid7Vulnerability(
  vuln: Rapid7Vulnerability,
  asset: Rapid7Asset,
): CanonicalFinding {
  const cveIds = extractCveIds(vuln);
  const cweIds = extractCweIds(vuln);
  const resolvedHostname = resolveHostname(asset);

  // Pick the best CVSS score available (prefer v3)
  const cvssScore = vuln.cvss?.v3?.score ?? vuln.cvss?.v2?.score;
  const cvssVector = vuln.cvss?.v3?.vector ?? vuln.cvss?.v2?.vector;
  const cvssVersion = vuln.cvss?.v3 ? '3.x' : vuln.cvss?.v2 ? '2.0' : undefined;

  // Use the first result for port/protocol context
  const firstResult = vuln.results?.[0];

  return {
    title: vuln.title,
    description: vuln.description ?? `Vulnerability ${vuln.id} on ${resolvedHostname}`,
    cveIds,
    cweIds,
    severity: mapSeverity(vuln.severity),
    cvssScore: cvssScore ?? undefined,
    cvssVector: cvssVector ?? undefined,
    cvssVersion,
    scannerType: 'rapid7',
    scannerName: 'Rapid7 InsightVM',
    assetName: resolvedHostname,
    hostname: asset.hostName || resolvedHostname,
    ipAddress: asset.ip || undefined,
    assetType: asset.type || undefined,
    port: firstResult?.port ?? undefined,
    protocol: firstResult?.protocol ?? undefined,
    snippet: firstResult?.proof ?? undefined,
    rawObservations: {
      rapid7VulnId: vuln.id,
      rapid7AssetId: asset.id,
      categories: vuln.categories,
      assetRiskScore: asset.riskScore,
      assetOs: asset.os,
      vulnStatus: vuln.status,
      vulnSince: vuln.since,
    },
    discoveredAt: vuln.since ? new Date(vuln.since) : new Date(),
  };
}

/**
 * Map a batch of Rapid7 vulnerabilities for a single asset to CanonicalFindings.
 */
export function mapRapid7AssetVulnerabilities(
  vulnerabilities: Rapid7Vulnerability[],
  asset: Rapid7Asset,
): CanonicalFinding[] {
  return vulnerabilities.map((vuln) => mapRapid7Vulnerability(vuln, asset));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCveIds(vuln: Rapid7Vulnerability): string[] {
  const cveSet = new Set<string>();

  // Direct CVEs array
  if (vuln.cves) {
    for (const cve of vuln.cves) {
      if (cve.startsWith('CVE-')) {
        cveSet.add(cve);
      }
    }
  }

  // Also check references for CVE sources
  if (vuln.references) {
    for (const ref of vuln.references) {
      if (ref.source === 'CVE' && ref.id) {
        const cveId = ref.id.startsWith('CVE-') ? ref.id : `CVE-${ref.id}`;
        cveSet.add(cveId);
      }
    }
  }

  return [...cveSet];
}

function extractCweIds(vuln: Rapid7Vulnerability): string[] {
  const cweSet = new Set<string>();

  if (vuln.references) {
    for (const ref of vuln.references) {
      if (ref.source === 'CWE' && ref.id) {
        const cweId = ref.id.startsWith('CWE-') ? ref.id : `CWE-${ref.id}`;
        cweSet.add(cweId);
      }
    }
  }

  return [...cweSet];
}

function resolveHostname(asset: Rapid7Asset): string {
  if (asset.hostName) return asset.hostName;
  if (asset.hostNames?.length) return asset.hostNames[0].name;
  return asset.ip || `asset-${asset.id}`;
}
