// @cveriskpilot/streaming — Streaming pipeline: parse -> enrich -> dedupe -> case-creation

import { randomUUID } from 'node:crypto';
import type {
  PipelinePhase,
  PipelineOptions,
  StreamEvent,
  ProgressData,
  PhaseChangeData,
  FindingData,
  ErrorData,
} from './types';
import { SSEEmitter } from './sse-emitter';
import { ProgressTracker } from './progress-tracker';

// Lazy-load enrichment to avoid hard dependency at import time
let _enrichmentModule: typeof import('@cveriskpilot/enrichment') | null = null;

async function getEnrichmentModule() {
  if (_enrichmentModule) return _enrichmentModule;
  try {
    _enrichmentModule = await import('@cveriskpilot/enrichment');
    return _enrichmentModule;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A raw finding coming out of the parser stage */
export interface RawFinding {
  id: string;
  cveId: string | null;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  source: string;
  asset: string;
  rawData: Record<string, unknown>;
}

/** An enriched finding after CVE lookup / EPSS / KEV checks */
export interface EnrichedFinding extends RawFinding {
  epssScore: number | null;
  isKev: boolean;
  cvssVector: string | null;
  enrichedAt: string;
}

/** Result of deduplication */
export interface DeduplicatedFinding extends EnrichedFinding {
  duplicateOf: string | null;
  dedupKey: string;
}

/** Pluggable stage callbacks */
export interface PipelineStages {
  /** Parse raw file content into findings */
  parse: (fileContent: Buffer, format: string) => AsyncIterable<RawFinding>;
  /** Enrich a batch of findings (CVE data, EPSS, KEV) */
  enrich: (findings: RawFinding[]) => Promise<EnrichedFinding[]>;
  /** Deduplicate findings against existing data */
  deduplicate: (findings: EnrichedFinding[]) => Promise<DeduplicatedFinding[]>;
  /** Create cases / tickets for actionable findings */
  createCases: (findings: DeduplicatedFinding[]) => Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Default stage implementations (stubs wired to real packages in production)
// ---------------------------------------------------------------------------

const DEFAULT_STAGES: PipelineStages = {
  async *parse(fileContent: Buffer, _format: string): AsyncIterable<RawFinding> {
    // Default: treat input as newline-delimited JSON
    const text = fileContent.toString('utf-8');
    const lines = text.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        yield {
          id: obj.id ?? randomUUID(),
          cveId: obj.cveId ?? null,
          title: obj.title ?? 'Unknown',
          severity: obj.severity ?? 'info',
          description: obj.description ?? '',
          source: obj.source ?? 'unknown',
          asset: obj.asset ?? 'unknown',
          rawData: obj,
        };
      } catch {
        // Skip unparseable lines
      }
    }
  },

  async enrich(findings: RawFinding[]): Promise<EnrichedFinding[]> {
    const enrichment = await getEnrichmentModule();
    if (!enrichment) {
      // Fallback: enrichment package unavailable at runtime
      return findings.map((f) => ({
        ...f,
        epssScore: null,
        isKev: false,
        cvssVector: null,
        enrichedAt: new Date().toISOString(),
      }));
    }

    try {
      // Collect all CVE IDs from the batch
      const cveIds = findings
        .map((f) => f.cveId)
        .filter((id): id is string => id !== null);
      const uniqueCves = [...new Set(cveIds)];

      // Fetch EPSS scores and KEV catalog in parallel
      const [epssMap, kevCatalog] = await Promise.all([
        enrichment.fetchEpssScores(uniqueCves),
        enrichment.loadKevCatalog(),
      ]);

      // Build KEV lookup set
      const kevMatches = enrichment.checkKev(kevCatalog, uniqueCves);
      const kevSet = new Set(kevMatches.map((m) => m.cveId));

      // Fetch NVD data for CVSS vectors (sequential due to rate limits)
      const nvdMap = await enrichment.fetchNvdCves(uniqueCves);

      return findings.map((f) => {
        const epssData = f.cveId ? epssMap.get(f.cveId) : undefined;
        const nvdData = f.cveId ? nvdMap.get(f.cveId) : undefined;
        const cvssVector =
          nvdData?.cvssV3?.vector ?? nvdData?.cvssV2?.vector ?? null;

        return {
          ...f,
          epssScore: epssData?.score ?? null,
          isKev: f.cveId ? kevSet.has(f.cveId) : false,
          cvssVector,
          enrichedAt: new Date().toISOString(),
        };
      });
    } catch (err) {
      console.error('Enrichment stage failed, falling back to defaults:', err);
      return findings.map((f) => ({
        ...f,
        epssScore: null,
        isKev: false,
        cvssVector: null,
        enrichedAt: new Date().toISOString(),
      }));
    }
  },

  async deduplicate(findings: EnrichedFinding[]): Promise<DeduplicatedFinding[]> {
    // In-batch deduplication: track CVE+asset combos within this batch
    const seen = new Map<string, string>();

    // Attempt cross-batch deduplication via Prisma (existing DB findings)
    let existingKeys = new Set<string>();
    try {
      const { PrismaClient } = await import('@cveriskpilot/domain');
      const prisma = new PrismaClient();
      if (prisma) {
        const cveIds = findings
          .map((f) => f.cveId)
          .filter((id): id is string => id !== null);
        const assets = [...new Set(findings.map((f) => f.asset))];

        if (cveIds.length > 0 && assets.length > 0) {
          const existingFindings = await (prisma as any).finding.findMany({
            where: {
              cveIds: { hasSome: cveIds },
              assetName: { in: assets },
            },
            select: { cveIds: true, assetName: true },
          });

          for (const ef of existingFindings) {
            for (const cve of ef.cveIds) {
              existingKeys.add(`${cve}::${ef.assetName}`);
            }
          }
        }
      }
    } catch {
      // Prisma unavailable — fall back to in-batch dedup only
    }

    return findings.map((f) => {
      const key = `${f.cveId ?? f.title}::${f.asset}`;
      const existing = seen.get(key);
      const dbDuplicate = existingKeys.has(key);

      if (!existing) {
        seen.set(key, f.id);
      }

      return {
        ...f,
        duplicateOf: existing ?? (dbDuplicate ? 'db-existing' : null),
        dedupKey: key,
      };
    });
  },

  async createCases(findings: DeduplicatedFinding[]): Promise<string[]> {
    // Only create cases for non-duplicate, high+ severity findings
    const actionable = findings.filter(
      (f) => !f.duplicateOf && (f.severity === 'critical' || f.severity === 'high'),
    );

    if (actionable.length === 0) return [];

    try {
      const { PrismaClient } = await import('@cveriskpilot/domain');
      const prisma = new PrismaClient();

      const caseIds: string[] = [];

      for (const f of actionable) {
        const caseRecord = await (prisma as any).vulnerabilityCase.create({
          data: {
            title: f.title,
            description: f.description,
            severity: f.severity.toUpperCase(),
            status: 'OPEN',
            cveIds: f.cveId ? [f.cveId] : [],
            cvssVector: f.cvssVector,
            epssScore: f.epssScore,
            kevListed: f.isKev,
          },
        });
        caseIds.push(caseRecord.id);
      }

      return caseIds;
    } catch {
      // Prisma unavailable — fall back to placeholder IDs
      return actionable.map((f) => `case-${f.id.slice(0, 8)}`);
    }
  },
};

const DEFAULT_OPTIONS: PipelineOptions = {
  batchSize: 50,
  progressIntervalMs: 500,
  emitFindings: false,
};

// ---------------------------------------------------------------------------
// StreamingPipeline
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full scan processing pipeline with streaming progress events.
 *
 * Stages: parse -> enrich -> dedupe -> case-creation
 *
 * Supports backpressure by batching findings and respecting `batchSize`.
 * Emits progress events at each stage via SSEEmitter and tracks state in
 * ProgressTracker for multi-instance consistency.
 */
export class StreamingPipeline {
  private emitter: SSEEmitter;
  private tracker: ProgressTracker;
  private stages: PipelineStages;
  private options: PipelineOptions;

  constructor(
    emitter: SSEEmitter,
    tracker: ProgressTracker,
    stages?: Partial<PipelineStages>,
    options?: Partial<PipelineOptions>,
  ) {
    this.emitter = emitter;
    this.tracker = tracker;
    this.stages = { ...DEFAULT_STAGES, ...stages };
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute the full pipeline for a scan job.
   *
   * @param jobId - Scan job identifier
   * @param tenantId - Tenant that owns the scan
   * @param fileContent - Raw file buffer
   * @param format - Parser format (e.g. 'NESSUS', 'SARIF')
   * @returns Summary of the pipeline run
   */
  async execute(
    jobId: string,
    tenantId: string,
    fileContent: Buffer,
    format: string,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    let totalParsed = 0;
    let totalEnriched = 0;
    let totalDeduplicated = 0;
    let totalUnique = 0;
    let casesCreated: string[] = [];

    try {
      // --- Phase 1: Parse ---
      await this.emitPhaseChange(jobId, tenantId, 'uploading', 'parsing');
      const allRawFindings: RawFinding[] = [];
      let batch: RawFinding[] = [];

      for await (const finding of this.stages.parse(fileContent, format)) {
        batch.push(finding);
        totalParsed++;

        await this.tracker.update({
          jobId,
          tenantId,
          phase: 'parsing',
          processed: totalParsed,
          total: 0, // unknown during streaming parse
          message: `Parsed ${totalParsed} findings...`,
        });

        // Backpressure: flush batch when it reaches batchSize
        if (batch.length >= this.options.batchSize) {
          allRawFindings.push(...batch);
          await this.emitProgress(jobId, tenantId, 'parsing', totalParsed, 0);
          batch = [];
        }
      }

      // Flush remaining
      if (batch.length > 0) {
        allRawFindings.push(...batch);
      }

      await this.emitProgress(jobId, tenantId, 'parsing', totalParsed, totalParsed);

      // --- Phase 2: Enrich ---
      await this.emitPhaseChange(jobId, tenantId, 'parsing', 'enriching');
      const enrichedFindings: EnrichedFinding[] = [];

      // Process enrichment in batches
      for (let i = 0; i < allRawFindings.length; i += this.options.batchSize) {
        const chunk = allRawFindings.slice(i, i + this.options.batchSize);
        const enriched = await this.stages.enrich(chunk);
        enrichedFindings.push(...enriched);
        totalEnriched += enriched.length;

        await this.tracker.update({
          jobId,
          tenantId,
          phase: 'enriching',
          processed: totalEnriched,
          total: totalParsed,
          message: `Enriched ${totalEnriched}/${totalParsed}`,
        });

        await this.emitProgress(jobId, tenantId, 'enriching', totalEnriched, totalParsed);
      }

      // --- Phase 3: Deduplicate ---
      await this.emitPhaseChange(jobId, tenantId, 'enriching', 'deduplicating');
      const deduplicatedFindings: DeduplicatedFinding[] = [];

      for (let i = 0; i < enrichedFindings.length; i += this.options.batchSize) {
        const chunk = enrichedFindings.slice(i, i + this.options.batchSize);
        const deduped = await this.stages.deduplicate(chunk);
        deduplicatedFindings.push(...deduped);
        totalDeduplicated += deduped.length;

        const unique = deduped.filter((f) => !f.duplicateOf).length;
        totalUnique += unique;

        await this.tracker.update({
          jobId,
          tenantId,
          phase: 'deduplicating',
          processed: totalDeduplicated,
          total: totalParsed,
          message: `Deduplicated: ${totalDeduplicated}/${totalParsed} (${totalUnique} unique)`,
        });

        await this.emitProgress(jobId, tenantId, 'deduplicating', totalDeduplicated, totalParsed);

        // Optionally emit individual finding events
        if (this.options.emitFindings) {
          for (const f of deduped) {
            await this.emitFinding(jobId, tenantId, f);
          }
        }
      }

      // --- Phase 4: Case creation ---
      await this.emitPhaseChange(jobId, tenantId, 'deduplicating', 'case-creation');

      const uniqueFindings = deduplicatedFindings.filter((f) => !f.duplicateOf);
      casesCreated = await this.stages.createCases(uniqueFindings);

      await this.tracker.update({
        jobId,
        tenantId,
        phase: 'case-creation',
        processed: casesCreated.length,
        total: uniqueFindings.length,
        message: `Created ${casesCreated.length} cases from ${uniqueFindings.length} unique findings`,
      });

      await this.emitProgress(jobId, tenantId, 'case-creation', casesCreated.length, uniqueFindings.length);

      // --- Complete ---
      await this.emitPhaseChange(jobId, tenantId, 'case-creation', 'complete');
      await this.tracker.complete(jobId, tenantId);

      await this.emitComplete(jobId, tenantId, {
        totalParsed,
        totalEnriched,
        totalDeduplicated,
        totalUnique,
        casesCreated: casesCreated.length,
        durationMs: Date.now() - startTime,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pipeline error';
      await this.tracker.fail(jobId, tenantId, message);
      await this.emitError(jobId, tenantId, message);

      return {
        jobId,
        tenantId,
        success: false,
        error: message,
        totalParsed,
        totalEnriched,
        totalDeduplicated,
        totalUnique,
        casesCreated: 0,
        durationMs: Date.now() - startTime,
      };
    }

    return {
      jobId,
      tenantId,
      success: true,
      totalParsed,
      totalEnriched,
      totalDeduplicated,
      totalUnique,
      casesCreated: casesCreated.length,
      durationMs: Date.now() - startTime,
    };
  }

  // ---------------------------------------------------------------------------
  // Event emission helpers
  // ---------------------------------------------------------------------------

  private async emitProgress(
    jobId: string,
    tenantId: string,
    phase: PipelinePhase,
    processed: number,
    total: number,
  ): Promise<void> {
    const event: StreamEvent<ProgressData> = {
      id: this.emitter.nextEventId(),
      type: 'progress',
      timestamp: new Date().toISOString(),
      tenantId,
      jobId,
      data: {
        phase,
        processed,
        total,
        percent: total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0,
        message: `${phase}: ${processed}/${total}`,
      },
    };

    await this.emitter.sendToTenant(tenantId, event);
  }

  private async emitPhaseChange(
    jobId: string,
    tenantId: string,
    previousPhase: PipelinePhase,
    newPhase: PipelinePhase,
  ): Promise<void> {
    const event: StreamEvent<PhaseChangeData> = {
      id: this.emitter.nextEventId(),
      type: 'phase-change',
      timestamp: new Date().toISOString(),
      tenantId,
      jobId,
      data: {
        previousPhase,
        newPhase,
        message: `Transitioning from ${previousPhase} to ${newPhase}`,
      },
    };

    await this.emitter.sendToTenant(tenantId, event);
  }

  private async emitFinding(
    jobId: string,
    tenantId: string,
    finding: DeduplicatedFinding,
  ): Promise<void> {
    const event: StreamEvent<FindingData> = {
      id: this.emitter.nextEventId(),
      type: 'finding',
      timestamp: new Date().toISOString(),
      tenantId,
      jobId,
      data: {
        findingId: finding.id,
        cveId: finding.cveId,
        severity: finding.severity,
        title: finding.title,
        enriched: finding.enrichedAt !== undefined,
        deduplicated: finding.duplicateOf !== null,
      },
    };

    await this.emitter.sendToTenant(tenantId, event);
  }

  private async emitComplete(
    jobId: string,
    tenantId: string,
    summary: Record<string, unknown>,
  ): Promise<void> {
    const event: StreamEvent<Record<string, unknown>> = {
      id: this.emitter.nextEventId(),
      type: 'complete',
      timestamp: new Date().toISOString(),
      tenantId,
      jobId,
      data: summary,
    };

    await this.emitter.sendToTenant(tenantId, event);
  }

  private async emitError(
    jobId: string,
    tenantId: string,
    message: string,
  ): Promise<void> {
    const currentProgress = await this.tracker.get(jobId);
    const event: StreamEvent<ErrorData> = {
      id: this.emitter.nextEventId(),
      type: 'error',
      timestamp: new Date().toISOString(),
      tenantId,
      jobId,
      data: {
        code: 'PIPELINE_ERROR',
        message,
        phase: currentProgress?.phase ?? 'error',
        recoverable: false,
      },
    };

    await this.emitter.sendToTenant(tenantId, event);
  }
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface PipelineResult {
  jobId: string;
  tenantId: string;
  success: boolean;
  error?: string;
  totalParsed: number;
  totalEnriched: number;
  totalDeduplicated: number;
  totalUnique: number;
  casesCreated: number;
  durationMs: number;
}
