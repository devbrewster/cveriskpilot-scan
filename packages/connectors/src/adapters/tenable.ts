import type { CanonicalFinding } from '@cveriskpilot/parsers';
import { HttpClientWithRetry } from '../http-client';
import type {
  ScannerAdapter,
  ScannerAdapterConfig,
  DecryptedCredentials,
} from '../types';
import {
  mapTenableVuln,
  type TenableVulnerability,
  type TenableExportResponse,
  type TenableExportStatusResponse,
  type TenableServerProperties,
} from '../mappers/tenable-mapper';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENABLE_RATE_LIMIT_PER_MINUTE = 35;
const EXPORT_POLL_INTERVAL_MS = 5_000;
const EXPORT_POLL_MAX_ATTEMPTS = 720; // 5s * 720 = 60 minutes max wait

// ---------------------------------------------------------------------------
// Tenable.io Scanner Adapter
// ---------------------------------------------------------------------------

/**
 * Adapter for Tenable.io Vulnerability Management API.
 *
 * Uses the export-based workflow:
 * 1. POST /vulns/export — request an export with filters
 * 2. Poll GET /vulns/export/{uuid}/status — wait until FINISHED
 * 3. Download GET /vulns/export/{uuid}/chunks/{id} — stream results
 */
export class TenableAdapter implements ScannerAdapter {
  readonly scannerId = 'TENABLE_IO';
  readonly scannerName = 'Tenable.io';

  // -------------------------------------------------------------------------
  // Test Connection
  // -------------------------------------------------------------------------

  async testConnection(
    credentials: DecryptedCredentials,
  ): Promise<{ ok: boolean; message: string }> {
    const client = this.createClient(credentials);

    try {
      const props = await client.get<TenableServerProperties>(
        '/server/properties',
      );

      return {
        ok: true,
        message: `Connected to Tenable.io ${props.nessus_type ?? 'instance'} (v${props.server_version ?? 'unknown'})`,
      };
    } catch (error) {
      return {
        ok: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Fetch Findings (AsyncGenerator)
  // -------------------------------------------------------------------------

  async *fetchFindings(
    config: ScannerAdapterConfig,
  ): AsyncGenerator<CanonicalFinding[], void, undefined> {
    const { credentials, scannerConfig, lastSyncAt, onProgress } = config;
    const client = this.createClient(credentials);

    // Phase 1: Request export
    onProgress('Requesting vulnerability export from Tenable.io...');
    const exportUuid = await this.requestExport(
      client,
      scannerConfig,
      lastSyncAt,
    );
    onProgress(`Export requested: ${exportUuid}`);

    // Phase 2: Poll until complete
    onProgress('Polling export status...');
    const status = await this.pollExportStatus(client, exportUuid, onProgress);

    if (status.chunks_available.length === 0) {
      onProgress('Export completed with no chunks — no new findings.');
      return;
    }

    const totalChunks = status.chunks_available.length;
    onProgress(
      `Export ready: ${totalChunks} chunk(s), ${status.num_findings_exported ?? 'unknown'} findings`,
    );

    // Phase 3: Download and map each chunk
    let processedChunks = 0;
    let totalFindings = 0;

    for (const chunkId of status.chunks_available) {
      onProgress(
        `Downloading chunk ${processedChunks + 1}/${totalChunks}...`,
      );

      const vulns = await client.get<TenableVulnerability[]>(
        `/vulns/export/${exportUuid}/chunks/${chunkId}`,
      );

      if (!Array.isArray(vulns) || vulns.length === 0) {
        processedChunks++;
        continue;
      }

      // Map vulnerabilities to CanonicalFinding
      const findings: CanonicalFinding[] = [];
      for (const vuln of vulns) {
        try {
          findings.push(mapTenableVuln(vuln));
        } catch {
          // Skip individual mapping failures — logged via onProgress
          onProgress(
            `Warning: Failed to map vulnerability (plugin ${vuln.plugin?.id ?? 'unknown'})`,
          );
        }
      }

      totalFindings += findings.length;
      processedChunks++;

      onProgress(
        `Chunk ${processedChunks}/${totalChunks}: ${findings.length} findings mapped (${totalFindings} total)`,
      );

      if (findings.length > 0) {
        yield findings;
      }
    }

    onProgress(
      `Tenable.io sync complete: ${totalFindings} findings from ${processedChunks} chunk(s)`,
    );
  }

  // -------------------------------------------------------------------------
  // Private: Export Workflow
  // -------------------------------------------------------------------------

  /**
   * POST /vulns/export — request an export with severity and date filters.
   */
  private async requestExport(
    client: HttpClientWithRetry,
    scannerConfig: Record<string, unknown>,
    lastSyncAt: Date | null,
  ): Promise<string> {
    const filters: Record<string, unknown> = {
      // Default: include all severities except informational (0)
      severity: (scannerConfig['severityFilter'] as string[]) ?? [
        'low',
        'medium',
        'high',
        'critical',
      ],
    };

    // Include specific states if configured
    if (scannerConfig['stateFilter']) {
      filters.state = scannerConfig['stateFilter'];
    }

    // Incremental sync: only fetch vulns found/updated since last sync
    if (lastSyncAt) {
      const sinceTimestamp = Math.floor(lastSyncAt.getTime() / 1000);
      filters.last_found = sinceTimestamp;
    }

    // Allow custom Tenable export filters from scannerConfig
    if (scannerConfig['exportFilters']) {
      Object.assign(
        filters,
        scannerConfig['exportFilters'] as Record<string, unknown>,
      );
    }

    const response = await client.post<TenableExportResponse>(
      '/vulns/export',
      {
        filters,
        num_assets: (scannerConfig['numAssets'] as number) ?? 500,
      },
    );

    if (!response.export_uuid) {
      throw new Error(
        'Tenable.io export request did not return an export_uuid',
      );
    }

    return response.export_uuid;
  }

  /**
   * Poll GET /vulns/export/{uuid}/status until FINISHED or error.
   */
  private async pollExportStatus(
    client: HttpClientWithRetry,
    exportUuid: string,
    onProgress: (msg: string) => void,
  ): Promise<TenableExportStatusResponse> {
    for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt++) {
      const status = await client.get<TenableExportStatusResponse>(
        `/vulns/export/${exportUuid}/status`,
      );

      switch (status.status) {
        case 'FINISHED':
          return status;

        case 'CANCELLED':
          throw new Error(
            `Tenable.io export ${exportUuid} was cancelled`,
          );

        case 'ERROR':
          throw new Error(
            `Tenable.io export ${exportUuid} failed with error`,
          );

        case 'QUEUED':
        case 'PROCESSING':
          onProgress(
            `Export ${status.status.toLowerCase()}: ${status.finished_chunks}/${status.total_chunks ?? '?'} chunks ready`,
          );
          await this.sleep(EXPORT_POLL_INTERVAL_MS);
          break;

        default:
          onProgress(`Export status: ${status.status}`);
          await this.sleep(EXPORT_POLL_INTERVAL_MS);
          break;
      }
    }

    throw new Error(
      `Tenable.io export ${exportUuid} polling timed out after ${(EXPORT_POLL_MAX_ATTEMPTS * EXPORT_POLL_INTERVAL_MS) / 60_000} minutes`,
    );
  }

  // -------------------------------------------------------------------------
  // Private: Client Factory
  // -------------------------------------------------------------------------

  private createClient(credentials: DecryptedCredentials): HttpClientWithRetry {
    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    const accessKey = credentials.accessKey ?? credentials.apiKey ?? '';
    const secretKey = credentials.secretKey ?? '';

    if (!accessKey || !secretKey) {
      throw new Error(
        'Tenable.io requires both accessKey and secretKey credentials',
      );
    }

    return new HttpClientWithRetry({
      baseUrl,
      defaultHeaders: {
        'X-ApiKeys': `accessKey=${accessKey};secretKey=${secretKey}`,
        Accept: 'application/json',
      },
      rateLimitPerMinute: TENABLE_RATE_LIMIT_PER_MINUTE,
      maxRetries: 3,
      retryBackoffMs: 1_000,
      timeoutMs: 60_000,
      circuitBreakerThreshold: 5,
    });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
