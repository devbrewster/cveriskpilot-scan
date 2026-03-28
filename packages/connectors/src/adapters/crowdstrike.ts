// ---------------------------------------------------------------------------
// CrowdStrike Falcon Spotlight Adapter
// ---------------------------------------------------------------------------

import { HttpClientWithRetry } from '../http-client';
import type {
  DecryptedCredentials,
  ScannerAdapter,
  ScannerAdapterConfig,
} from '../types';
import type { CanonicalFinding } from '@cveriskpilot/parsers';
import {
  mapCrowdStrikeBatch,
  type CrowdStrikeSpotlightResponse,
} from '../mappers/crowdstrike-mapper';

// ---------------------------------------------------------------------------
// OAuth2 Token Types
// ---------------------------------------------------------------------------

interface CrowdStrikeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

// ---------------------------------------------------------------------------
// Token Cache
// ---------------------------------------------------------------------------

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 400;
const RATE_LIMIT_PER_MINUTE = 50;
const TOKEN_REFRESH_BUFFER_MS = 120_000; // refresh 2 min before expiry

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class CrowdStrikeSpotlightAdapter implements ScannerAdapter {
  readonly scannerId = 'CROWDSTRIKE_SPOTLIGHT';
  readonly scannerName = 'CrowdStrike Falcon Spotlight';

  private tokenCache: CachedToken | null = null;

  async testConnection(
    credentials: DecryptedCredentials,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const token = await this.authenticate(credentials);
      if (!token) {
        return { ok: false, message: 'Failed to obtain OAuth2 access token' };
      }

      // Verify token works by calling a lightweight endpoint
      const client = this.createClient(credentials.baseUrl, token);
      await client.get<unknown>(
        '/policy/queries/reveal-uninstall-token/v1',
        { params: { device_id: 'test' } },
      );

      return { ok: true, message: 'Successfully authenticated to CrowdStrike Falcon' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // 403 on health check is acceptable — it means auth worked but endpoint is restricted
      if (message.includes('403')) {
        return { ok: true, message: 'Authenticated (health check endpoint restricted, but credentials valid)' };
      }
      return { ok: false, message: `Connection failed: ${message}` };
    }
  }

  async *fetchFindings(
    config: ScannerAdapterConfig,
  ): AsyncGenerator<CanonicalFinding[], void, undefined> {
    const { credentials, lastSyncAt, onProgress } = config;

    onProgress('Authenticating with CrowdStrike OAuth2...');
    const token = await this.authenticate(credentials);
    if (!token) {
      throw new Error('CrowdStrike OAuth2 authentication failed');
    }

    const client = this.createClient(credentials.baseUrl, token);
    const fqlFilter = this.buildFqlFilter(lastSyncAt, config.scannerConfig);

    let afterCursor: string | undefined;
    let totalFetched = 0;

    onProgress('Fetching vulnerabilities from CrowdStrike Spotlight...');

    do {
      // Refresh token if nearing expiry
      const currentToken = await this.ensureValidToken(credentials);
      if (currentToken !== token) {
        // Recreate client with fresh token
        const freshClient = this.createClient(credentials.baseUrl, currentToken);
        const response = await this.fetchPage(freshClient, fqlFilter, afterCursor);
        const batch = this.processBatch(response);
        afterCursor = response.meta.pagination?.after;
        totalFetched += batch.length;
        onProgress(`Fetched ${totalFetched} vulnerabilities...`);
        if (batch.length > 0) yield batch;
        if (!afterCursor || response.resources.length < PAGE_LIMIT) break;
        continue;
      }

      const response = await this.fetchPage(client, fqlFilter, afterCursor);
      const batch = this.processBatch(response);
      afterCursor = response.meta.pagination?.after;
      totalFetched += batch.length;

      onProgress(`Fetched ${totalFetched} vulnerabilities...`);

      if (batch.length > 0) {
        yield batch;
      }

      // Stop if no more pages
      if (!afterCursor || response.resources.length < PAGE_LIMIT) {
        break;
      }
    } while (afterCursor);

    onProgress(`CrowdStrike sync complete. Total: ${totalFetched} findings.`);
  }

  // -------------------------------------------------------------------------
  // OAuth2 Authentication
  // -------------------------------------------------------------------------

  private async authenticate(credentials: DecryptedCredentials): Promise<string> {
    const { clientId, clientSecret, baseUrl } = credentials;
    if (!clientId || !clientSecret) {
      throw new Error('CrowdStrike adapter requires clientId and clientSecret credentials');
    }

    const tokenUrl = `${baseUrl.replace(/\/+$/, '')}/oauth2/token`;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`CrowdStrike OAuth2 token request failed (${response.status}): ${text.slice(0, 500)}`);
    }

    const data = (await response.json()) as CrowdStrikeTokenResponse;
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  private async ensureValidToken(credentials: DecryptedCredentials): Promise<string> {
    if (
      this.tokenCache &&
      this.tokenCache.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS
    ) {
      return this.tokenCache.accessToken;
    }

    // Token expired or nearing expiry — re-authenticate
    return this.authenticate(credentials);
  }

  // -------------------------------------------------------------------------
  // HTTP Client Factory
  // -------------------------------------------------------------------------

  private createClient(baseUrl: string, accessToken: string): HttpClientWithRetry {
    return new HttpClientWithRetry({
      baseUrl: baseUrl.replace(/\/+$/, ''),
      defaultHeaders: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      rateLimitPerMinute: RATE_LIMIT_PER_MINUTE,
      maxRetries: 3,
      retryBackoffMs: 1000,
      timeoutMs: 30_000,
    });
  }

  // -------------------------------------------------------------------------
  // Pagination & Fetching
  // -------------------------------------------------------------------------

  private async fetchPage(
    client: HttpClientWithRetry,
    fqlFilter: string,
    afterCursor?: string,
  ): Promise<CrowdStrikeSpotlightResponse> {
    const params: Record<string, string> = {
      filter: fqlFilter,
      limit: String(PAGE_LIMIT),
    };

    if (afterCursor) {
      params.after = afterCursor;
    }

    return client.get<CrowdStrikeSpotlightResponse>(
      '/spotlight/combined/vulnerabilities/v1',
      { params },
    );
  }

  private processBatch(response: CrowdStrikeSpotlightResponse): CanonicalFinding[] {
    if (!response.resources || response.resources.length === 0) {
      return [];
    }

    if (response.errors?.length) {
      const errorMsgs = response.errors.map((e) => `${e.code}: ${e.message}`).join('; ');
      throw new Error(`CrowdStrike API errors: ${errorMsgs}`);
    }

    return mapCrowdStrikeBatch(response.resources);
  }

  // -------------------------------------------------------------------------
  // FQL Filter Builder
  // -------------------------------------------------------------------------

  private buildFqlFilter(
    lastSyncAt: Date | null,
    scannerConfig: Record<string, unknown>,
  ): string {
    const filters: string[] = [];

    // Only open/active vulnerabilities
    filters.push("status:'open'");

    // Incremental sync: only vulns updated after last sync
    if (lastSyncAt) {
      const isoTimestamp = lastSyncAt.toISOString();
      filters.push(`updated_timestamp:>'${isoTimestamp}'`);
    }

    // Additional FQL filters from scanner config
    if (typeof scannerConfig.fqlFilter === 'string' && scannerConfig.fqlFilter) {
      filters.push(scannerConfig.fqlFilter);
    }

    return filters.join('+');
  }
}
