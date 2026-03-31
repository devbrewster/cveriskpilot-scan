// ---------------------------------------------------------------------------
// Rapid7 InsightVM Adapter
// ---------------------------------------------------------------------------

import { HttpClientWithRetry } from '../http-client';
import type {
  DecryptedCredentials,
  ScannerAdapter,
  ScannerAdapterConfig,
} from '../types';
import type { CanonicalFinding } from '@cveriskpilot/parsers';
import {
  mapRapid7AssetVulnerabilities,
  type Rapid7Asset,
  type Rapid7AssetsResponse,
  type Rapid7VulnerabilitiesResponse,
} from '../mappers/rapid7-mapper';

// ---------------------------------------------------------------------------
// Rapid7 API Types
// ---------------------------------------------------------------------------

export interface Rapid7AdminInfoResponse {
  links?: Array<{ href: string; rel: string }>;
  license?: {
    edition?: string;
    status?: string;
  };
  version?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASSET_PAGE_SIZE = 500;
const VULN_PAGE_SIZE = 500;
const RATE_LIMIT_PER_MINUTE = 60;

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class Rapid7InsightVMAdapter implements ScannerAdapter {
  readonly scannerId = 'RAPID7_INSIGHTVM';
  readonly scannerName = 'Rapid7 InsightVM';

  async testConnection(
    credentials: DecryptedCredentials,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      const client = this.createClient(credentials);
      const info = await client.get<Rapid7AdminInfoResponse>(
        '/api/3/administration/info',
      );

      const version = info.version ?? 'unknown';
      return {
        ok: true,
        message: `Connected to Rapid7 InsightVM (version: ${version})`,
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

    const client = this.createClient(credentials);
    let assetPage = 0;
    let totalAssets = 0;
    let totalFindings = 0;

    onProgress('Fetching assets from Rapid7 InsightVM...');

    // Iterate through all asset pages
    let hasMoreAssetPages = true;
    while (hasMoreAssetPages) {
      const assetsResponse = await this.fetchAssetPage(client, assetPage);
      const assets = assetsResponse.resources;
      const totalPages = assetsResponse.page.totalPages;

      totalAssets += assets.length;
      onProgress(`Processing asset page ${assetPage + 1}/${totalPages} (${totalAssets} assets)...`);

      // Filter assets for incremental sync
      const filteredAssets = this.filterAssetsForIncremental(assets, lastSyncAt);

      // For each asset, fetch its vulnerabilities
      for (const asset of filteredAssets) {
        const findings = await this.fetchAssetVulnerabilities(
          client,
          asset,
          scannerConfig,
        );

        if (findings.length > 0) {
          totalFindings += findings.length;
          onProgress(`Found ${totalFindings} findings (processing asset: ${asset.hostName ?? asset.ip})...`);
          yield findings;
        }
      }

      assetPage++;
      hasMoreAssetPages = assetPage < totalPages;
    }

    onProgress(`Rapid7 sync complete. ${totalAssets} assets scanned, ${totalFindings} findings.`);
  }

  // -------------------------------------------------------------------------
  // HTTP Client Factory
  // -------------------------------------------------------------------------

  private createClient(credentials: DecryptedCredentials): HttpClientWithRetry {
    const apiKey = credentials.apiKey;
    if (!apiKey) {
      throw new Error('Rapid7 InsightVM adapter requires an API key');
    }

    // SSRF protection: re-validate baseUrl at invocation time (not just creation time)
    const { validateExternalUrl } = require('@cveriskpilot/auth');
    const urlCheck = validateExternalUrl(credentials.baseUrl);
    if (!urlCheck.valid) {
      throw new Error(`Blocked SSRF attempt on Rapid7 baseUrl: ${urlCheck.reason}`);
    }

    return new HttpClientWithRetry({
      baseUrl: credentials.baseUrl.replace(/\/+$/, ''),
      defaultHeaders: {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
      },
      rateLimitPerMinute: RATE_LIMIT_PER_MINUTE,
      maxRetries: 3,
      retryBackoffMs: 1000,
      timeoutMs: 30_000,
    });
  }

  // -------------------------------------------------------------------------
  // Asset Fetching
  // -------------------------------------------------------------------------

  private async fetchAssetPage(
    client: HttpClientWithRetry,
    page: number,
  ): Promise<Rapid7AssetsResponse> {
    return client.get<Rapid7AssetsResponse>('/api/3/assets', {
      params: {
        page: String(page),
        size: String(ASSET_PAGE_SIZE),
      },
    });
  }

  /**
   * Filter assets to only include those assessed after lastSyncAt (for incremental syncs).
   */
  private filterAssetsForIncremental(
    assets: Rapid7Asset[],
    lastSyncAt: Date | null,
  ): Rapid7Asset[] {
    if (!lastSyncAt) return assets;

    return assets.filter((asset) => {
      if (!asset.lastAssessedForVulnerabilities) return true; // include if no assessment date
      const assessedAt = new Date(asset.lastAssessedForVulnerabilities);
      return assessedAt > lastSyncAt;
    });
  }

  // -------------------------------------------------------------------------
  // Vulnerability Fetching (per asset)
  // -------------------------------------------------------------------------

  private async fetchAssetVulnerabilities(
    client: HttpClientWithRetry,
    asset: Rapid7Asset,
    _scannerConfig: Record<string, unknown>,
  ): Promise<CanonicalFinding[]> {
    const allFindings: CanonicalFinding[] = [];
    let vulnPage = 0;
    let hasMorePages = true;

    while (hasMorePages) {
      const vulnsResponse = await client.get<Rapid7VulnerabilitiesResponse>(
        `/api/3/assets/${asset.id}/vulnerabilities`,
        {
          params: {
            page: String(vulnPage),
            size: String(VULN_PAGE_SIZE),
          },
        },
      );

      const findings = mapRapid7AssetVulnerabilities(
        vulnsResponse.resources,
        asset,
      );

      allFindings.push(...findings);

      vulnPage++;
      hasMorePages = vulnPage < vulnsResponse.page.totalPages;
    }

    return allFindings;
  }
}
