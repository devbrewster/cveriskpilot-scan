import type { CanonicalFinding } from '@cveriskpilot/parsers';

// ---------------------------------------------------------------------------
// Tenable.io API Response Types
// ---------------------------------------------------------------------------

/** A single vulnerability from the Tenable.io vulns/export endpoint */
export interface TenableVulnerability {
  asset: TenableAsset;
  output: string;
  plugin: TenablePlugin;
  port: TenablePort;
  scan: TenableScan;
  severity: string;
  severity_id: number;
  severity_default_id: number;
  severity_modification_type: string;
  first_found: string;
  last_found: string;
  last_fixed?: string;
  state: 'OPEN' | 'REOPENED' | 'FIXED';
  indexed: string;
}

export interface TenableAsset {
  device_type: string;
  fqdn: string[];
  hostname: string;
  ipv4: string;
  ipv6: string;
  last_authenticated_results: string;
  mac_address: string[];
  netbios_name: string;
  operating_system: string[];
  network_id: string;
  tracked: boolean;
  uuid: string;
  agent_uuid?: string;
}

export interface TenablePlugin {
  bid: number[];
  checks_for_default_account: boolean;
  checks_for_malware: boolean;
  cpe: string[];
  cve: string[];
  cvss3_base_score: number;
  cvss3_temporal_score: number;
  cvss3_temporal_vector: string;
  cvss3_vector: string;
  cvss_base_score: number;
  cvss_temporal_score: number;
  cvss_temporal_vector: string;
  cvss_vector: string;
  description: string;
  exploit_available: boolean;
  exploit_framework_canvas: boolean;
  exploit_framework_core: boolean;
  exploit_framework_d2_elliot: boolean;
  exploit_framework_exploithub: boolean;
  exploit_framework_metasploit: boolean;
  exploitability_ease: string;
  exploited_by_malware: boolean;
  exploited_by_nessus: boolean;
  family: string;
  family_id: number;
  has_patch: boolean;
  id: number;
  in_the_news: boolean;
  name: string;
  modification_date: string;
  patch_publication_date?: string;
  plugin_modification_date: string;
  plugin_publication_date: string;
  risk_factor: string;
  see_also: string[];
  solution: string;
  synopsis: string;
  type: string;
  unsupported_by_vendor: boolean;
  version: string;
  vuln_publication_date?: string;
  xrefs: string[];
  vpr?: {
    score: number;
    drivers: Record<string, unknown>;
    updated: string;
  };
}

export interface TenablePort {
  port: number;
  protocol: string;
  service: string;
  transport: string;
}

export interface TenableScan {
  completed_at: string;
  schedule_uuid: string;
  started_at: string;
  uuid: string;
}

/** Response from POST /vulns/export */
export interface TenableExportResponse {
  export_uuid: string;
}

/** Response from GET /vulns/export/{uuid}/status */
export interface TenableExportStatusResponse {
  status: 'QUEUED' | 'PROCESSING' | 'FINISHED' | 'CANCELLED' | 'ERROR';
  chunks_available: number[];
  chunks_failed: number[];
  chunks_cancelled: number[];
  total_chunks: number;
  filters_applied: boolean;
  num_findings_exported?: number;
  finished_chunks: number;
  empty_chunks_count: number;
}

/** Response from GET /server/properties */
export interface TenableServerProperties {
  capabilities: Record<string, unknown>;
  enterprise: boolean;
  license: Record<string, unknown>;
  nessus_type: string;
  nessus_ui_version: string;
  server_uuid: string;
  server_version: string;
}

// ---------------------------------------------------------------------------
// Severity Mapping (Tenable 0-4 scale)
// ---------------------------------------------------------------------------

const TENABLE_SEVERITY_MAP: Record<number, CanonicalFinding['severity']> = {
  0: 'INFO',
  1: 'LOW',
  2: 'MEDIUM',
  3: 'HIGH',
  4: 'CRITICAL',
};

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Maps a Tenable.io vulnerability export record to a CanonicalFinding.
 */
export function mapTenableVuln(vuln: TenableVulnerability): CanonicalFinding {
  const severity = TENABLE_SEVERITY_MAP[vuln.severity_id] ?? 'MEDIUM';

  // Prefer CVSS v3 score, fall back to v2
  const cvssScore =
    vuln.plugin.cvss3_base_score > 0
      ? vuln.plugin.cvss3_base_score
      : vuln.plugin.cvss_base_score > 0
        ? vuln.plugin.cvss_base_score
        : undefined;

  const cvssVector =
    vuln.plugin.cvss3_vector || vuln.plugin.cvss_vector || undefined;

  const cvssVersion = vuln.plugin.cvss3_vector
    ? '3.0'
    : vuln.plugin.cvss_vector
      ? '2.0'
      : undefined;

  // Extract CVE IDs from plugin data
  const cveIds = Array.isArray(vuln.plugin.cve)
    ? vuln.plugin.cve.filter((id) => /^CVE-\d{4}-\d{4,}$/.test(id))
    : [];

  // Build asset name — prefer hostname, fall back to FQDN, then IP
  const assetName =
    vuln.asset.hostname ||
    (vuln.asset.fqdn?.length > 0 ? vuln.asset.fqdn[0] : undefined) ||
    vuln.asset.ipv4 ||
    'unknown';

  // Build description from synopsis + plugin description
  const descriptionParts: string[] = [];
  if (vuln.plugin.synopsis) descriptionParts.push(vuln.plugin.synopsis);
  if (vuln.plugin.description) descriptionParts.push(vuln.plugin.description);
  const description = descriptionParts.join('\n\n') || vuln.plugin.name;

  return {
    title: vuln.plugin.name,
    description,
    cveIds,
    cweIds: [],
    severity,
    cvssScore,
    cvssVector,
    cvssVersion,
    scannerType: 'tenable',
    scannerName: 'Tenable.io',
    runId: vuln.scan?.uuid,
    assetName,
    assetType: vuln.asset.device_type || undefined,
    hostname: vuln.asset.hostname || undefined,
    ipAddress: vuln.asset.ipv4 || undefined,
    port: vuln.port?.port > 0 ? vuln.port.port : undefined,
    protocol: vuln.port?.protocol || undefined,
    rawObservations: {
      pluginId: vuln.plugin.id,
      pluginFamily: vuln.plugin.family,
      state: vuln.state,
      output: vuln.output,
      solution: vuln.plugin.solution,
      riskFactor: vuln.plugin.risk_factor,
      exploitAvailable: vuln.plugin.exploit_available,
      hasPatch: vuln.plugin.has_patch,
      vprScore: vuln.plugin.vpr?.score,
      assetUuid: vuln.asset.uuid,
      operatingSystem: vuln.asset.operating_system,
      seeAlso: vuln.plugin.see_also,
    },
    discoveredAt: new Date(vuln.first_found),
  };
}
