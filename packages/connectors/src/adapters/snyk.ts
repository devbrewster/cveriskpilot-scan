// ---------------------------------------------------------------------------
// Snyk Adapter
// ---------------------------------------------------------------------------

import { HttpClientWithRetry } from '../http-client';
import type {
  DecryptedCredentials,
  ScannerAdapter,
  ScannerAdapterConfig,
} from '../types';
import type { CanonicalFinding } from '@cveriskpilot/parsers';
import {
  mapSnykBatch,
  type SnykIssuesResponse,
} from '../mappers/snyk-mapper';

// ---------------------------------------------------------------------------
// Snyk API Types
// ---------------------------------------------------------------------------

export interface SnykSelfResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      name: string;
      username: string;
      email: string;
      avatar_url?: string;
    };
  };
  jsonapi: { version: string };
  links?: { self: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RATE_LIMIT_PER_MINUTE = 30;
const API_VERSION = '2024-01-23';
const DEFAULT_PAGE_LIMIT = 100;

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class SnykAdapter implements ScannerAdapter {
  readonly scannerId = 'SNYK';
  readonly scannerName = 'Snyk';

  async testConnection(
    credentials: DecryptedCredentials,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const client = this.createClient(credentials);
      const self = await client.get<SnykSelfResponse>('/rest/self', {
        params: { version: API_VERSION },
      });

      const username = self.data?.attributes?.name ?? self.data?.attributes?.username ?? 'unknown';
      return {
        ok: true,
        message: `Authenticated as ${username}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `Connection failed: ${message}` };
    }
  }

  async *fetchFindings(
    config: ScannerAdapterConfig,
  ): AsyncGenerator<CanonicalFinding[], void, undefined> {
    const { credentials, lastSyncAt, onProgress, scannerConfig } = config;

    const orgId = this.resolveOrgId(scannerConfig);
    if (!orgId) {
      throw new Error('Snyk adapter requires orgId in scannerConfig');
    }

    const client = this.createClient(credentials);
    let startingAfter: string | undefined;
    let totalFetched = 0;

    onProgress('Fetching issues from Snyk...');

    do {
      const response = await this.fetchIssuePage(
        client,
        orgId,
        lastSyncAt,
        startingAfter,
        scannerConfig,
      );

      const projectName = typeof scannerConfig.projectName === 'string'
        ? scannerConfig.projectName
        : undefined;

      const batch = mapSnykBatch(response.data, projectName);
      totalFetched += batch.length;

      onProgress(`Fetched ${totalFetched} issues from Snyk...`);

      if (batch.length > 0) {
        yield batch;
      }

      // Extract cursor from links.next for pagination
      startingAfter = this.extractStartingAfter(response.links?.next);

    } while (startingAfter);

    onProgress(`Snyk sync complete. Total: ${totalFetched} findings.`);
  }

  // -------------------------------------------------------------------------
  // HTTP Client Factory
  // -------------------------------------------------------------------------

  private createClient(credentials: DecryptedCredentials): HttpClientWithRetry {
    const token = credentials.token ?? credentials.apiKey;
    if (!token) {
      throw new Error('Snyk adapter requires a token or apiKey credential');
    }

    return new HttpClientWithRetry({
      baseUrl: credentials.baseUrl.replace(/\/+$/, ''),
      defaultHeaders: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      rateLimitPerMinute: RATE_LIMIT_PER_MINUTE,
      maxRetries: 3,
      retryBackoffMs: 2000,
      timeoutMs: 30_000,
    });
  }

  // -------------------------------------------------------------------------
  // Issue Fetching
  // -------------------------------------------------------------------------

  private async fetchIssuePage(
    client: HttpClientWithRetry,
    orgId: string,
    lastSyncAt: Date | null,
    startingAfter?: string,
    scannerConfig?: Record<string, unknown>,
  ): Promise<SnykIssuesResponse> {
    const params: Record<string, string> = {
      version: API_VERSION,
      limit: String(DEFAULT_PAGE_LIMIT),
    };

    // Incremental: only issues created/updated after last sync
    if (lastSyncAt) {
      params['created_after'] = lastSyncAt.toISOString();
    }

    // Cursor pagination
    if (startingAfter) {
      params['starting_after'] = startingAfter;
    }

    // Optional severity filter from scanner config
    if (typeof scannerConfig?.severityFilter === 'string') {
      params['severity'] = scannerConfig.severityFilter;
    }

    // Optional type filter
    if (typeof scannerConfig?.issueType === 'string') {
      params['type'] = scannerConfig.issueType;
    }

    return client.get<SnykIssuesResponse>(
      `/rest/orgs/${orgId}/issues`,
      { params },
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private resolveOrgId(scannerConfig: Record<string, unknown>): string | undefined {
    if (typeof scannerConfig.orgId === 'string' && scannerConfig.orgId) {
      return scannerConfig.orgId;
    }
    return undefined;
  }

  /**
   * Extract the `starting_after` cursor from a Snyk pagination `links.next` URL.
   * The URL contains `starting_after=<value>` as a query parameter.
   */
  private extractStartingAfter(nextUrl?: string): string | undefined {
    if (!nextUrl) return undefined;

    try {
      const url = new URL(nextUrl, 'https://api.snyk.io');
      return url.searchParams.get('starting_after') ?? undefined;
    } catch {
      return undefined;
    }
  }
}
