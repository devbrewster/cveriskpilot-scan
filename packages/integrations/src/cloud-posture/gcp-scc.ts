// ---------------------------------------------------------------------------
// GCP Security Command Center Client (t112)
// ---------------------------------------------------------------------------

import type {
  SCCFinding,
  SCCConfig,
  SCCFilters,
  PostureFinding,
} from './types';
import type { CanonicalFinding } from '@cveriskpilot/parsers/types';

// ---------------------------------------------------------------------------
// Types for GCP API responses
// ---------------------------------------------------------------------------

interface ListFindingsResponse {
  listFindingsResults: Array<{
    finding: SCCFinding;
    stateChange?: string;
  }>;
  nextPageToken?: string;
  totalSize?: number;
}

// ---------------------------------------------------------------------------
// GCPSecurityCommandCenter
// ---------------------------------------------------------------------------

export class GCPSecurityCommandCenter {
  private readonly config: SCCConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: SCCConfig) {
    this.config = config;
  }

  /**
   * Query GCP SCC findings for an organization.
   */
  async getFindings(
    orgId: string,
    filters?: SCCFilters,
  ): Promise<SCCFinding[]> {
    const allFindings: SCCFinding[] = [];
    let pageToken: string | undefined;

    do {
      const result = await this.listFindings(orgId, filters, pageToken);
      for (const entry of result.listFindingsResults) {
        allFindings.push(entry.finding);
      }
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allFindings;
  }

  /**
   * Import GCP SCC findings as PostureFinding format.
   */
  async importFindings(
    orgId: string,
    filters?: SCCFilters,
  ): Promise<PostureFinding[]> {
    const findings = await this.getFindings(orgId, filters);
    return findings.map((f) => this.mapSCCToPosture(f));
  }

  /**
   * Map a GCP SCC finding to CanonicalFinding format.
   */
  mapSCCToCanonical(scc: SCCFinding): CanonicalFinding {
    const cveIds: string[] = [];
    let cvssScore: number | undefined;
    let cvssVector: string | undefined;

    if (scc.vulnerability?.cve) {
      cveIds.push(scc.vulnerability.cve.id);

      if (scc.vulnerability.cve.cvssv3) {
        cvssScore = scc.vulnerability.cve.cvssv3.baseScore;
        // Reconstruct abbreviated vector
        const v3 = scc.vulnerability.cve.cvssv3;
        cvssVector = `CVSS:3.1/AV:${v3.attackVector?.[0] ?? 'N'}/AC:${v3.attackComplexity?.[0] ?? 'L'}`;
      }
    }

    // Extract resource info from resource name
    const resourceParts = scc.resourceName.split('/');
    const resourceType = resourceParts.length >= 2
      ? resourceParts[resourceParts.length - 2]
      : 'unknown';

    return {
      title: `[GCP SCC] ${scc.category}`,
      description: this.extractDescription(scc),
      cveIds,
      cweIds: [],
      severity: this.mapSCCSeverity(scc.severity),
      cvssScore,
      cvssVector,
      scannerType: 'cloud_posture',
      scannerName: 'GCP Security Command Center',
      runId: scc.name,
      assetName: scc.resourceName,
      assetType: resourceType,
      rawObservations: {
        scc_name: scc.name,
        category: scc.category,
        finding_class: scc.findingClass,
        state: scc.state,
        external_uri: scc.externalUri,
        source_properties: scc.sourceProperties,
        compliances: scc.compliances,
      },
      discoveredAt: new Date(scc.createTime),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapSCCToPosture(scc: SCCFinding): PostureFinding {
    const cveIds: string[] = [];
    if (scc.vulnerability?.cve) {
      cveIds.push(scc.vulnerability.cve.id);
    }

    const complianceFrameworks: string[] = [];
    if (scc.compliances) {
      for (const c of scc.compliances) {
        complianceFrameworks.push(`${c.standard} ${c.version}`);
      }
    }

    return {
      source: 'gcp_scc',
      sourceId: scc.name,
      title: `[GCP SCC] ${scc.category}`,
      description: this.extractDescription(scc),
      severity: this.mapSCCSeverity(scc.severity),
      cveIds,
      resourceId: scc.resourceName,
      resourceType: scc.findingClass,
      complianceStatus: scc.state === 'ACTIVE' ? 'FAILED' : 'PASSED',
      complianceFrameworks:
        complianceFrameworks.length > 0 ? complianceFrameworks : undefined,
      remediationUrl: scc.externalUri,
      firstObservedAt: new Date(scc.createTime),
      lastObservedAt: new Date(scc.eventTime),
      rawData: scc as unknown as Record<string, unknown>,
    };
  }

  private mapSCCSeverity(
    severity: string,
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    switch (severity) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'INFO';
    }
  }

  private extractDescription(scc: SCCFinding): string {
    const parts: string[] = [`Category: ${scc.category}`];

    if (scc.findingClass) {
      parts.push(`Class: ${scc.findingClass}`);
    }

    const desc = scc.sourceProperties['description'];
    if (typeof desc === 'string') {
      parts.push(desc);
    }

    const explanation = scc.sourceProperties['explanation'];
    if (typeof explanation === 'string') {
      parts.push(explanation);
    }

    return parts.join('\n');
  }

  private async listFindings(
    orgId: string,
    filters?: SCCFilters,
    pageToken?: string,
  ): Promise<ListFindingsResponse> {
    const token = await this.getAccessToken();
    const parent = `organizations/${orgId}/sources/-`;
    const baseUrl = 'https://securitycenter.googleapis.com/v1';

    const params = new URLSearchParams();

    if (filters?.filter) {
      params.set('filter', filters.filter);
    } else {
      const filterParts: string[] = [];
      if (filters?.state) {
        filterParts.push(`state="${filters.state}"`);
      }
      if (filters?.severity && filters.severity.length > 0) {
        const sevFilter = filters.severity
          .map((s) => `severity="${s}"`)
          .join(' OR ');
        filterParts.push(`(${sevFilter})`);
      }
      if (filters?.category) {
        filterParts.push(`category="${filters.category}"`);
      }
      if (filters?.findingClass) {
        filterParts.push(`findingClass="${filters.findingClass}"`);
      }
      if (filterParts.length > 0) {
        params.set('filter', filterParts.join(' AND '));
      }
    }

    if (filters?.readTime) {
      params.set('readTime', filters.readTime);
    }

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    params.set('pageSize', '1000');

    const qs = params.toString();
    const url = `${baseUrl}/${parent}/findings:list${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`GCP SCC API error: ${res.status} - ${errorText}`);
    }

    return (await res.json()) as ListFindingsResponse;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Use metadata server if running on GCP, otherwise use service account credentials
    if (!this.config.credentials) {
      return this.getTokenFromMetadata();
    }

    return this.getTokenFromServiceAccount();
  }

  private async getTokenFromMetadata(): Promise<string> {
    const url =
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

    const res = await fetch(url, {
      headers: { 'Metadata-Flavor': 'Google' },
    });

    if (!res.ok) {
      throw new Error(`GCP metadata token request failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  private async getTokenFromServiceAccount(): Promise<string> {
    // Parse the service account key
    const keyData =
      typeof this.config.credentials === 'string' &&
      this.config.credentials.startsWith('{')
        ? JSON.parse(this.config.credentials)
        : JSON.parse(
            (await import('node:fs')).readFileSync(
              this.config.credentials!,
              'utf8',
            ),
          );

    // Create JWT for token exchange
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: keyData.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ).toString('base64url');

    const { createSign } = await import('node:crypto');
    const sign = createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(keyData.private_key, 'base64url');

    const jwt = `${header}.${payload}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }).toString(),
    });

    if (!res.ok) {
      throw new Error(`GCP OAuth token request failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }
}
