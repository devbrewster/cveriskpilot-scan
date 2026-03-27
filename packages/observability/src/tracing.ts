// ---------------------------------------------------------------------------
// Tenant-aware Observability — Distributed Tracing
// ---------------------------------------------------------------------------

import { createLogger } from '@cveriskpilot/shared';
import type { Span, SpanAttributes, SpanEvent, TracingConfig } from './types';

const logger = createLogger('observability:tracing');

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

function generateId(length: number): string {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function generateTraceId(): string {
  return generateId(32);
}

function generateSpanId(): string {
  return generateId(16);
}

// ---------------------------------------------------------------------------
// Default tracing config
// ---------------------------------------------------------------------------

export const DEFAULT_TRACING_CONFIG: TracingConfig = {
  serviceName: 'cveriskpilot',
  normalSampleRate: 0.1,
  errorSampleRate: 1.0,
  healthCheckSampleRate: 0.01,
  propagateW3C: true,
};

// ---------------------------------------------------------------------------
// ActiveSpan — a mutable span that can be ended
// ---------------------------------------------------------------------------

export class ActiveSpan implements Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  attributes: SpanAttributes;
  status: 'ok' | 'error' | 'unset' = 'unset';
  events: SpanEvent[] = [];

  private onEnd?: (span: Span) => void;

  constructor(
    name: string,
    traceId: string,
    attributes: SpanAttributes,
    parentSpanId?: string,
    onEnd?: (span: Span) => void,
  ) {
    this.spanId = generateSpanId();
    this.traceId = traceId;
    this.parentSpanId = parentSpanId;
    this.name = name;
    this.startTime = new Date().toISOString();
    this.attributes = attributes;
    this.onEnd = onEnd;
  }

  /** Record an event within this span. */
  addEvent(name: string, eventAttributes?: Record<string, string | number | boolean>): void {
    this.events.push({
      name,
      timestamp: new Date().toISOString(),
      attributes: eventAttributes,
    });
  }

  /** Set a string attribute. */
  setAttribute(key: string, value: string | number | boolean): void {
    this.attributes[key] = value;
  }

  /** Mark the span as having an error. */
  setError(error: Error): void {
    this.status = 'error';
    this.setAttribute('error.type', error.name);
    this.setAttribute('error.message', error.message);
    this.addEvent('exception', {
      'exception.type': error.name,
      'exception.message': error.message,
    });
  }

  /** End the span and record duration. */
  end(): void {
    if (this.endTime) {
      logger.warn(`Span ${this.spanId} already ended`);
      return;
    }
    this.endTime = new Date().toISOString();
    this.durationMs = new Date(this.endTime).getTime() - new Date(this.startTime).getTime();
    if (this.status === 'unset') {
      this.status = 'ok';
    }
    this.onEnd?.(this);
  }

  /** Get a serializable snapshot. */
  toJSON(): Span {
    return {
      spanId: this.spanId,
      traceId: this.traceId,
      parentSpanId: this.parentSpanId,
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      durationMs: this.durationMs,
      attributes: { ...this.attributes },
      status: this.status,
      events: [...this.events],
    };
  }
}

// ---------------------------------------------------------------------------
// TenantTracer
// ---------------------------------------------------------------------------

export class TenantTracer {
  private config: TracingConfig;
  private completedSpans: Span[] = [];
  private maxSpanBuffer: number;
  private onSpanEnd?: (span: Span) => void;

  constructor(
    config: Partial<TracingConfig> = {},
    options?: { maxSpanBuffer?: number; onSpanEnd?: (span: Span) => void },
  ) {
    this.config = { ...DEFAULT_TRACING_CONFIG, ...config };
    this.maxSpanBuffer = options?.maxSpanBuffer ?? 5_000;
    this.onSpanEnd = options?.onSpanEnd;
  }

  /**
   * Start a new trace span with tenant context.
   * Sampling is applied based on the span name and config.
   * Returns null if the span is sampled out.
   */
  startSpan(
    name: string,
    tenantId: string,
    attributes: Record<string, string | number | boolean> = {},
    parentSpanId?: string,
    existingTraceId?: string,
  ): ActiveSpan | null {
    const sampleRate = this.getSampleRate(name);
    if (Math.random() > sampleRate) {
      return null;
    }

    const traceId = existingTraceId ?? generateTraceId();
    const spanAttrs: SpanAttributes = {
      tenantId,
      'service.name': this.config.serviceName,
      ...attributes,
    };

    const span = new ActiveSpan(name, traceId, spanAttrs, parentSpanId, (s) => {
      this.onSpanComplete(s);
    });

    logger.debug(`Span started: ${name} (trace=${traceId}, span=${span.spanId}, tenant=${tenantId})`);
    return span;
  }

  /**
   * Create a child span under an existing parent span, propagating tenant context.
   */
  startChildSpan(
    name: string,
    parent: ActiveSpan,
    attributes: Record<string, string | number | boolean> = {},
  ): ActiveSpan | null {
    return this.startSpan(
      name,
      parent.attributes.tenantId,
      attributes,
      parent.spanId,
      parent.traceId,
    );
  }

  /**
   * Generate W3C traceparent header value from a span.
   * Format: 00-{traceId}-{spanId}-{flags}
   */
  getTraceparent(span: ActiveSpan): string {
    const flags = '01'; // sampled
    return `00-${span.traceId}-${span.spanId}-${flags}`;
  }

  /**
   * Parse a W3C traceparent header and extract trace/span IDs.
   */
  parseTraceparent(header: string): { traceId: string; parentSpanId: string } | null {
    const parts = header.split('-');
    if (parts.length !== 4) return null;
    const [, traceId, parentSpanId] = parts;
    if (!traceId || !parentSpanId) return null;
    if (traceId.length !== 32 || parentSpanId.length !== 16) return null;
    return { traceId, parentSpanId };
  }

  /** Get completed spans, optionally filtered by tenant. */
  getCompletedSpans(tenantId?: string): Span[] {
    if (!tenantId) return [...this.completedSpans];
    return this.completedSpans.filter((s) => s.attributes.tenantId === tenantId);
  }

  /** Clear completed span buffer. */
  clearSpans(): void {
    this.completedSpans = [];
  }

  private getSampleRate(spanName: string): number {
    const lowerName = spanName.toLowerCase();
    if (lowerName.includes('health') || lowerName.includes('readiness') || lowerName.includes('liveness')) {
      return this.config.healthCheckSampleRate;
    }
    // Error spans are always sampled at a higher rate, but we don't know
    // at creation time if it will error. Normal rate applies; errors are
    // captured via the errorSampleRate at flush/export time.
    return this.config.normalSampleRate;
  }

  private onSpanComplete(span: Span): void {
    this.completedSpans.push(span);
    if (this.completedSpans.length > this.maxSpanBuffer) {
      // Evict oldest 20%
      const evictCount = Math.floor(this.maxSpanBuffer * 0.2);
      this.completedSpans.splice(0, evictCount);
    }
    this.onSpanEnd?.(span);
    logger.debug(
      `Span ended: ${span.name} (${span.durationMs}ms, status=${span.status}, tenant=${span.attributes.tenantId})`,
    );
  }
}
