// ---------------------------------------------------------------------------
// CrowdStrike Falcon Spotlight → CanonicalFinding Mapper
// ---------------------------------------------------------------------------

import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// CrowdStrike API Response Types
// ---------------------------------------------------------------------------

export interface CrowdStrikeVulnerability {
  id: string;
  cid: string;
  aid: string;
  created_timestamp: string;
  updated_timestamp: string;
  status: string;
  cve: CrowdStrikeCve;
  host_info: CrowdStrikeHostInfo;
  remediation?: CrowdStrikeRemediation;
  app?: CrowdStrikeApp;
}

export interface CrowdStrikeCve {
  id: string;
  base_score: number;
  severity: string;
  exploit_status: number;
  exprt_rating?: string;
  description?: string;
  published_date?: string;
  vector?: string;
  remediation_level?: string;
}

export interface CrowdStrikeHostInfo {
  hostname: string;
  local_ip: string;
  machine_domain?: string;
  os_version?: string;
  ou?: string;
  site_name?: string;
  system_manufacturer?: string;
  tags?: string[];
  groups?: string[];
  platform?: string;
  instance_id?: string;
  service_provider?: string;
}

export interface CrowdStrikeRemediation {
  ids: string[];
  action?: string;
}

export interface CrowdStrikeApp {
  product_name_version?: string;
  sub_status?: string;
  vendor?: string;
}

export interface CrowdStrikeSpotlightResponse {
  resources: CrowdStrikeVulnerability[];
  meta: {
    pagination?: {
      total: number;
      offset: number;
      limit: number;
      after?: string;
    };
    powered_by?: string;
    query_time?: number;
    trace_id?: string;
  };
  errors?: Array<{ code: number; message: string }>;
}

// ---------------------------------------------------------------------------
// Severity Mapping
// ---------------------------------------------------------------------------

const SEVERITY_MAP: Record<string, CanonicalFinding['severity']> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  NONE: 'INFO',
  UNKNOWN: 'INFO',
};

function mapSeverity(csSeverity: string): CanonicalFinding['severity'] {
  return SEVERITY_MAP[csSeverity.toUpperCase()] ?? 'INFO';
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Map a single CrowdStrike Spotlight vulnerability to a CanonicalFinding.
 */
export function mapCrowdStrikeVulnerability(
  vuln: CrowdStrikeVulnerability,
): CanonicalFinding {
  const cveId = vuln.cve.id; // e.g., "CVE-2023-12345"
  const cveIds = cveId && cveId.startsWith('CVE-') ? [cveId] : [];

  const description = buildDescription(vuln);

  return {
    title: `${cveId || 'Unknown CVE'} — ${vuln.app?.product_name_version ?? vuln.host_info.hostname}`,
    description,
    cveIds,
    cweIds: [],
    severity: mapSeverity(vuln.cve.severity),
    cvssScore: vuln.cve.base_score > 0 ? vuln.cve.base_score : undefined,
    cvssVector: vuln.cve.vector || undefined,
    scannerType: 'crowdstrike',
    scannerName: 'CrowdStrike Falcon Spotlight',
    assetName: vuln.host_info.hostname || vuln.host_info.local_ip || 'unknown',
    hostname: vuln.host_info.hostname || undefined,
    ipAddress: vuln.host_info.local_ip || undefined,
    assetType: vuln.host_info.platform || undefined,
    packageName: vuln.app?.product_name_version || undefined,
    rawObservations: {
      crowdstrikeVulnId: vuln.id,
      aid: vuln.aid,
      status: vuln.status,
      exploitStatus: vuln.cve.exploit_status,
      exprtRating: vuln.cve.exprt_rating,
      osVersion: vuln.host_info.os_version,
      remediationIds: vuln.remediation?.ids,
      appSubStatus: vuln.app?.sub_status,
    },
    discoveredAt: new Date(vuln.created_timestamp),
  };
}

/**
 * Map an array of CrowdStrike vulnerabilities to CanonicalFindings.
 */
export function mapCrowdStrikeBatch(
  vulnerabilities: CrowdStrikeVulnerability[],
): CanonicalFinding[] {
  return vulnerabilities.map(mapCrowdStrikeVulnerability);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDescription(vuln: CrowdStrikeVulnerability): string {
  const parts: string[] = [];

  if (vuln.cve.description) {
    parts.push(vuln.cve.description);
  }

  if (vuln.remediation?.action) {
    parts.push(`Remediation: ${vuln.remediation.action}`);
  }

  if (vuln.app?.product_name_version) {
    parts.push(`Affected software: ${vuln.app.product_name_version}`);
  }

  return parts.join('\n\n') || `Vulnerability ${vuln.cve.id} detected on ${vuln.host_info.hostname}`;
}
