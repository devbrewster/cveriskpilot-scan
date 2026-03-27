// ---------------------------------------------------------------------------
// Tenant-aware Observability — Type Definitions
// ---------------------------------------------------------------------------

/** Severity levels matching Google Cloud Logging. */
export type LogSeverity = 'DEFAULT' | 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** Metric data types. */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/** Tier labels for multi-tenant metrics. */
export type TenantTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'mssp';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface MetricDefinition {
  /** Unique metric name (e.g. 'api_latency'). */
  name: string;
  /** Human-readable description. */
  description: string;
  /** Metric type. */
  type: MetricType;
  /** Unit of measurement (e.g. 'ms', 'bytes', 'count'). */
  unit: string;
  /** Histogram bucket boundaries (only for histogram type). */
  buckets?: number[];
}

export interface MetricLabels {
  tenantId?: string;
  tier?: TenantTier;
  [key: string]: string | undefined;
}

export interface MetricDataPoint {
  name: string;
  value: number;
  labels: MetricLabels;
  timestamp: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

// ---------------------------------------------------------------------------
// Tracing
// ---------------------------------------------------------------------------

export interface TracingConfig {
  /** Service name for trace attribution. */
  serviceName: string;
  /** Base sampling rate for normal requests (0.0 - 1.0). */
  normalSampleRate: number;
  /** Sample rate for error traces. */
  errorSampleRate: number;
  /** Sample rate for health check endpoints. */
  healthCheckSampleRate: number;
  /** Whether to propagate W3C trace context headers. */
  propagateW3C: boolean;
}

export interface SpanAttributes {
  tenantId: string;
  [key: string]: string | number | boolean;
}

export interface Span {
  /** Unique span ID. */
  spanId: string;
  /** Trace ID this span belongs to. */
  traceId: string;
  /** Parent span ID, if any. */
  parentSpanId?: string;
  /** Operation name. */
  name: string;
  /** Start timestamp (ISO 8601). */
  startTime: string;
  /** End timestamp, set when span is finished. */
  endTime?: string;
  /** Duration in milliseconds, computed on end(). */
  durationMs?: number;
  /** Span attributes including tenant context. */
  attributes: SpanAttributes;
  /** Status: ok, error, or unset. */
  status: 'ok' | 'error' | 'unset';
  /** Events recorded during the span. */
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export interface LogEntry {
  /** Severity level. */
  severity: LogSeverity;
  /** Log message. */
  message: string;
  /** Tenant ID for multi-tenant filtering. */
  tenantId?: string;
  /** User ID (will be partially redacted in output). */
  userId?: string;
  /** Request ID for correlation. */
  requestId?: string;
  /** Trace ID for correlation with tracing. */
  traceId?: string;
  /** Span ID for correlation with tracing. */
  spanId?: string;
  /** Timestamp (ISO 8601). */
  timestamp: string;
  /** Structured data. */
  data?: Record<string, unknown>;
  /** Source context (e.g. module name). */
  context?: string;
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export interface DashboardPanel {
  /** Panel title. */
  title: string;
  /** Panel type (graph, stat, table, etc.). */
  type: 'graph' | 'stat' | 'table' | 'heatmap' | 'gauge';
  /** Metric queries for this panel. */
  queries: DashboardQuery[];
  /** Grid position. */
  gridPos: { x: number; y: number; w: number; h: number };
}

export interface DashboardQuery {
  /** PromQL or compatible query expression. */
  expr: string;
  /** Legend format. */
  legendFormat?: string;
  /** Refresh interval in seconds. */
  intervalSeconds?: number;
}

export interface DashboardConfig {
  /** Dashboard unique ID. */
  uid: string;
  /** Dashboard title. */
  title: string;
  /** Tenant ID this dashboard is scoped to, or null for global. */
  tenantId: string | null;
  /** Tier filter. */
  tier?: TenantTier;
  /** Dashboard tags. */
  tags: string[];
  /** Panels in this dashboard. */
  panels: DashboardPanel[];
  /** Auto-refresh interval in seconds. */
  refreshIntervalSeconds: number;
  /** Time range for the dashboard. */
  timeRange: { from: string; to: string };
}
