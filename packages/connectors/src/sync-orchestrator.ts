import type { PrismaClient } from '@cveriskpilot/domain';
import type { CanonicalFinding } from '@cveriskpilot/parsers';
import { adapterRegistry } from './adapter-registry';
import { resolveCredentials, CredentialResolutionError } from './credential-resolver';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Process findings in batches of this size to limit memory pressure */
const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Sync Orchestrator
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full sync lifecycle for scanner API connectors.
 *
 * Pipeline per batch:
 *   adapter.fetchFindings() → normalize → dedup → enrich → buildCases
 *
 * Follows the same processing pipeline as `job-consumer.ts` (file upload path),
 * but sources findings from a scanner API adapter's AsyncGenerator instead of
 * from a downloaded file.
 */
export class SyncOrchestrator {
  constructor(private readonly prisma: PrismaClient) {}

  // -------------------------------------------------------------------------
  // Enqueue a new sync job
  // -------------------------------------------------------------------------

  /**
   * Create a SyncJob record with PENDING status.
   * In production, this would enqueue a Cloud Task.
   * In dev, callers can then call `runSync(jobId)` directly.
   */
  async enqueueSyncJob(
    connectorId: string,
    trigger: 'SCHEDULED' | 'MANUAL' | 'WEBHOOK',
  ): Promise<string> {
    const connector = await this.prisma.scannerConnector.findUnique({
      where: { id: connectorId },
    });

    if (!connector) {
      throw new Error(`ScannerConnector not found: ${connectorId}`);
    }

    const syncJob = await this.prisma.syncJob.create({
      data: {
        connectorId,
        organizationId: connector.organizationId,
        clientId: connector.clientId,
        status: 'PENDING',
        trigger,
      },
    });

    return syncJob.id;
  }

  // -------------------------------------------------------------------------
  // Run a sync job
  // -------------------------------------------------------------------------

  /**
   * Execute the full sync pipeline for a given SyncJob.
   *
   * Steps:
   * 1. Load SyncJob + ScannerConnector from DB
   * 2. Resolve (decrypt) credentials
   * 3. Get adapter from registry
   * 4. Update job status to RUNNING
   * 5. Call adapter.fetchFindings() — iterate AsyncGenerator
   * 6. For each batch: normalize → dedup → enrich → buildCases
   * 7. Track progress (findingsReceived, findingsCreated, etc.)
   * 8. Log each phase to SyncLog
   * 9. On success: update job COMPLETED, update connector.lastSyncAt
   * 10. On error: update job FAILED, set errorMessage, log error
   */
  async runSync(syncJobId: string): Promise<void> {
    // 1. Load SyncJob + ScannerConnector
    const syncJob = await this.prisma.syncJob.findUnique({
      where: { id: syncJobId },
      include: { connector: true },
    });

    if (!syncJob) {
      throw new Error(`SyncJob not found: ${syncJobId}`);
    }

    if (syncJob.status !== 'PENDING') {
      throw new Error(
        `SyncJob ${syncJobId} is in status ${syncJob.status}, expected PENDING`,
      );
    }

    const { connector } = syncJob;
    const startedAt = new Date();

    try {
      // 2. Resolve credentials
      await this.log(syncJobId, 'info', 'Resolving credentials');
      const credentials = await resolveCredentials(
        connector,
        connector.organizationId,
        this.prisma,
      );

      // 3. Get adapter from registry
      const adapter = adapterRegistry.get(connector.type);
      if (!adapter) {
        throw new Error(
          `No adapter registered for scanner type "${connector.type}". ` +
            `Available types: ${adapterRegistry.list().join(', ')}`,
        );
      }

      // 4. Update job status to RUNNING
      await this.prisma.syncJob.update({
        where: { id: syncJobId },
        data: { status: 'RUNNING', startedAt },
      });
      await this.log(syncJobId, 'info', `Starting sync with ${adapter.scannerName} adapter`);

      // 5. Iterate adapter's AsyncGenerator
      const adapterConfig = {
        credentials,
        scannerConfig: (connector.scannerConfig as Record<string, unknown>) ?? {},
        lastSyncAt: connector.lastSyncAt,
        onProgress: (msg: string) => {
          // Fire-and-forget progress logging
          this.log(syncJobId, 'info', msg).catch(() => {});
        },
      };

      // Lazy import pipeline utilities to avoid circular dependency issues
      const { normalizeFindings, deduplicateFindings } = await import(
        '@cveriskpilot/parsers'
      );
      const { enrichFindings } = await import('@cveriskpilot/enrichment');
      const { buildCases } = await import(
        '@cveriskpilot/storage/case-builder/case-builder'
      );

      let totalFindingsReceived = 0;
      let totalFindingsAfterDedup = 0;
      let totalFindingsCreated = 0;
      let totalCasesCreated = 0;
      let totalCasesUpdated = 0;
      let batchIndex = 0;

      // 6. Process each batch from the adapter
      for await (const rawBatch of adapter.fetchFindings(adapterConfig)) {
        batchIndex++;
        const batchStart = Date.now();

        totalFindingsReceived += rawBatch.length;

        // Update status to PROCESSING
        await this.prisma.syncJob.update({
          where: { id: syncJobId },
          data: {
            status: 'PROCESSING',
            findingsReceived: totalFindingsReceived,
            processedChunks: batchIndex,
          },
        });

        // Normalize
        const normalized = normalizeFindings(rawBatch);

        // Deduplicate
        const deduplicated = deduplicateFindings(normalized);
        totalFindingsAfterDedup += deduplicated.length;

        // Process in sub-batches for enrichment (matching job-consumer BATCH_SIZE)
        for (let i = 0; i < deduplicated.length; i += BATCH_SIZE) {
          const subBatch = deduplicated.slice(i, i + BATCH_SIZE);

          // Enrich
          const enriched = await enrichFindings(subBatch);

          // Build cases
          const clientId = syncJob.clientId ?? connector.clientId;
          if (!clientId) {
            throw new Error(
              `No clientId available for sync job ${syncJobId}. ` +
                'Set clientId on the SyncJob or ScannerConnector.',
            );
          }

          const casesResult = await buildCases({
            organizationId: connector.organizationId,
            clientId,
            findings: enriched,
            prisma: this.prisma,
          });

          totalFindingsCreated += casesResult.findingsLinked;
          totalCasesCreated += casesResult.casesCreated;
          totalCasesUpdated += casesResult.casesUpdated;
        }

        const batchDuration = Date.now() - batchStart;
        await this.log(syncJobId, 'info', `Batch ${batchIndex} processed`, {
          rawCount: rawBatch.length,
          normalizedCount: normalized.length,
          deduplicatedCount: deduplicated.length,
          durationMs: batchDuration,
        });

        // Update progress counters
        await this.prisma.syncJob.update({
          where: { id: syncJobId },
          data: {
            findingsReceived: totalFindingsReceived,
            findingsDeduplicated: totalFindingsAfterDedup,
            findingsCreated: totalFindingsCreated,
            casesCreated: totalCasesCreated,
            casesUpdated: totalCasesUpdated,
          },
        });
      }

      // 9. Success — mark COMPLETED
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      await this.prisma.$transaction([
        this.prisma.syncJob.update({
          where: { id: syncJobId },
          data: {
            status: 'COMPLETED',
            completedAt,
            totalChunks: batchIndex,
            processedChunks: batchIndex,
            findingsReceived: totalFindingsReceived,
            findingsDeduplicated: totalFindingsAfterDedup,
            findingsCreated: totalFindingsCreated,
            casesCreated: totalCasesCreated,
            casesUpdated: totalCasesUpdated,
            metadata: { durationMs },
          },
        }),
        this.prisma.scannerConnector.update({
          where: { id: connector.id },
          data: {
            lastSyncAt: completedAt,
            lastSyncError: null,
          },
        }),
      ]);

      await this.log(syncJobId, 'info', 'Sync completed', {
        durationMs,
        totalBatches: batchIndex,
        findingsReceived: totalFindingsReceived,
        findingsDeduplicated: totalFindingsAfterDedup,
        findingsCreated: totalFindingsCreated,
        casesCreated: totalCasesCreated,
        casesUpdated: totalCasesUpdated,
      });

      console.log(
        `[sync-orchestrator] Job ${syncJobId} completed: ` +
          `${totalFindingsReceived} findings received, ` +
          `${totalFindingsAfterDedup} after dedup, ` +
          `${totalFindingsCreated} findings created, ` +
          `${totalCasesCreated} cases created, ` +
          `${totalCasesUpdated} cases updated, ` +
          `${durationMs}ms`,
      );
    } catch (error) {
      // 10. Error — mark FAILED
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const isCredentialError = error instanceof CredentialResolutionError;

      await this.prisma.syncJob
        .update({
          where: { id: syncJobId },
          data: {
            status: 'FAILED',
            errorMessage,
            completedAt: new Date(),
          },
        })
        .catch((updateErr: unknown) => {
          console.error(
            `[sync-orchestrator] Failed to update job ${syncJobId} status:`,
            updateErr,
          );
        });

      // Also record the error on the connector
      await this.prisma.scannerConnector
        .update({
          where: { id: connector.id },
          data: { lastSyncError: errorMessage },
        })
        .catch((updateErr: unknown) => {
          console.error(
            `[sync-orchestrator] Failed to update connector ${connector.id} error:`,
            updateErr,
          );
        });

      await this.log(syncJobId, 'error', `Sync failed: ${errorMessage}`, {
        isCredentialError,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      }).catch(() => {});

      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Logging Helper
  // -------------------------------------------------------------------------

  private async log(
    syncJobId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.syncLog.create({
        data: {
          syncJobId,
          level,
          message,
          metadata: metadata ?? undefined,
        },
      });
    } catch {
      // Logging failures should not break the sync pipeline
      console.error(`[sync-orchestrator] Failed to write SyncLog: ${message}`);
    }
  }
}
