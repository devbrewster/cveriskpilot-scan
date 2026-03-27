// @cveriskpilot/streaming — Type definitions for SSE streaming pipeline

/** Phases of the scan processing pipeline */
export type PipelinePhase =
  | 'uploading'
  | 'parsing'
  | 'enriching'
  | 'deduplicating'
  | 'case-creation'
  | 'complete'
  | 'error';

/** Categories of events sent over SSE */
export type StreamEventType =
  | 'progress'
  | 'phase-change'
  | 'finding'
  | 'error'
  | 'heartbeat'
  | 'complete';

/**
 * A single event pushed over the SSE connection.
 * Wire format follows the SSE spec: `event:`, `data:`, `id:` fields.
 */
export interface StreamEvent<T = unknown> {
  /** Event ID for resumption via Last-Event-ID */
  id: string;
  /** Event type — maps to SSE `event:` field */
  type: StreamEventType;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Tenant this event belongs to */
  tenantId: string;
  /** Scan job ID this event relates to */
  jobId: string;
  /** Arbitrary payload */
  data: T;
}

/** Payload shape for progress events */
export interface ProgressData {
  phase: PipelinePhase;
  /** Findings processed so far */
  processed: number;
  /** Total findings expected (0 if unknown yet) */
  total: number;
  /** Percentage 0-100 */
  percent: number;
  /** Human-readable status message */
  message: string;
}

/** Payload shape for phase-change events */
export interface PhaseChangeData {
  previousPhase: PipelinePhase;
  newPhase: PipelinePhase;
  message: string;
}

/** Payload shape for finding events (individual finding streamed out) */
export interface FindingData {
  findingId: string;
  cveId: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  enriched: boolean;
  deduplicated: boolean;
}

/** Payload for error events */
export interface ErrorData {
  code: string;
  message: string;
  phase: PipelinePhase;
  recoverable: boolean;
}

/**
 * Represents a connected SSE client.
 */
export interface SSEConnection {
  /** Unique connection ID */
  connectionId: string;
  /** Tenant that owns the connection */
  tenantId: string;
  /** Job IDs this client is subscribed to (empty = all jobs for tenant) */
  subscribedJobs: string[];
  /** The writable stream to push events into */
  writer: WritableStreamDefaultWriter<Uint8Array>;
  /** Timestamp the client connected */
  connectedAt: number;
  /** Last event ID sent (for resumption) */
  lastEventId: string;
}

/**
 * Progress update stored in Redis for multi-instance consistency.
 */
export interface ProgressUpdate {
  jobId: string;
  tenantId: string;
  phase: PipelinePhase;
  processed: number;
  total: number;
  percent: number;
  message: string;
  updatedAt: string;
}

/** Options for the streaming pipeline */
export interface PipelineOptions {
  /** Maximum findings to buffer before flushing (backpressure) */
  batchSize: number;
  /** Interval in ms between progress event broadcasts */
  progressIntervalMs: number;
  /** Whether to emit individual finding events */
  emitFindings: boolean;
}
