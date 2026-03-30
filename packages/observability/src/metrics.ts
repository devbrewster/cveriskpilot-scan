// ---------------------------------------------------------------------------
// Tenant-aware Observability — Metrics Collector
// ---------------------------------------------------------------------------

import { createLogger } from '@cveriskpilot/shared';
import type {
  MetricDataPoint,
  MetricDefinition,
  MetricLabels,
  MetricType,
  TimeRange,
} from './types';

const logger = createLogger('observability:metrics');

// ---------------------------------------------------------------------------
// Built-in metric definitions
// ---------------------------------------------------------------------------

export const BUILTIN_METRICS: MetricDefinition[] = [
  {
    name: 'api_latency',
    description: 'API request latency in milliseconds',
    type: 'histogram',
    unit: 'ms',
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  },
  {
    name: 'scan_processing_time',
    description: 'Time to process a vulnerability scan in milliseconds',
    type: 'histogram',
    unit: 'ms',
    buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
  },
  {
    name: 'active_users',
    description: 'Number of active users per tenant',
    type: 'gauge',
    unit: 'count',
  },
  {
    name: 'error_rate',
    description: 'Error rate per tenant',
    type: 'counter',
    unit: 'count',
  },
];

// ---------------------------------------------------------------------------
// MetricsCollector
// ---------------------------------------------------------------------------

export class MetricsCollector {
  private definitions: Map<string, MetricDefinition> = new Map();
  private dataPoints: MetricDataPoint[] = [];
  private maxBufferSize: number;
  private onFlush?: (points: MetricDataPoint[]) => void;

  constructor(options?: { maxBufferSize?: number; onFlush?: (points: MetricDataPoint[]) => void }) {
    this.maxBufferSize = options?.maxBufferSize ?? 10_000;
    this.onFlush = options?.onFlush;

    // Register built-in metrics
    for (const def of BUILTIN_METRICS) {
      this.definitions.set(def.name, def);
    }
  }

  /** Register a custom metric definition. */
  registerMetric(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);
    logger.debug(`Metric registered: ${definition.name} (${definition.type})`);
  }

  /** Get a metric definition by name. */
  getDefinition(name: string): MetricDefinition | undefined {
    return this.definitions.get(name);
  }

  /** Record a metric data point with tenant-aware labels. */
  recordMetric(name: string, value: number, labels: MetricLabels = {}): void {
    const definition = this.definitions.get(name);
    if (!definition) {
      logger.warn(`Recording unknown metric: ${name}. Consider registering it first.`);
    }

    const point: MetricDataPoint = {
      name,
      value,
      labels,
      timestamp: new Date().toISOString(),
    };

    this.dataPoints.push(point);

    if (this.dataPoints.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Query metrics for a specific tenant within a time range.
   * Returns matching data points filtered by tenantId and time window.
   */
  getMetrics(tenantId: string, timeRange: TimeRange): MetricDataPoint[] {
    const start = new Date(timeRange.start).getTime();
    const end = new Date(timeRange.end).getTime();

    return this.dataPoints.filter((point) => {
      if (point.labels.tenantId !== tenantId) return false;
      const ts = new Date(point.timestamp).getTime();
      return ts >= start && ts <= end;
    });
  }

  /** Query metrics by name, optionally filtered by labels. */
  getMetricsByName(
    name: string,
    labels?: Partial<MetricLabels>,
    timeRange?: TimeRange,
  ): MetricDataPoint[] {
    return this.dataPoints.filter((point) => {
      if (point.name !== name) return false;
      if (timeRange) {
        const ts = new Date(point.timestamp).getTime();
        const start = new Date(timeRange.start).getTime();
        const end = new Date(timeRange.end).getTime();
        if (ts < start || ts > end) return false;
      }
      if (labels) {
        for (const [key, val] of Object.entries(labels)) {
          if (val !== undefined && point.labels[key] !== val) return false;
        }
      }
      return true;
    });
  }

  /**
   * Export metrics in OpenTelemetry-compatible format.
   * Returns a serializable object suitable for OTLP export.
   */
  exportOTLP(): OTLPExportPayload {
    const metricsByName = new Map<string, MetricDataPoint[]>();
    for (const point of this.dataPoints) {
      const existing = metricsByName.get(point.name) ?? [];
      existing.push(point);
      metricsByName.set(point.name, existing);
    }

    const metrics: OTLPMetric[] = [];
    for (const [name, points] of metricsByName) {
      const definition = this.definitions.get(name);
      const metricType: MetricType = definition?.type ?? 'gauge';

      metrics.push({
        name,
        description: definition?.description ?? '',
        unit: definition?.unit ?? '',
        type: metricType,
        dataPoints: points.map((p) => ({
          value: p.value,
          timeUnixNano: new Date(p.timestamp).getTime() * 1_000_000,
          attributes: Object.entries(p.labels)
            .filter(([, v]) => v !== undefined)
            .map(([key, value]) => ({ key, value: { stringValue: value! } })),
        })),
      });
    }

    return {
      resourceMetrics: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'cveriskpilot' } },
            ],
          },
          scopeMetrics: [
            {
              scope: { name: '@cveriskpilot/observability', version: '0.2.0' },
              metrics,
            },
          ],
        },
      ],
    };
  }

  /** Flush buffered data points via the configured flush handler. */
  flush(): void {
    if (this.dataPoints.length === 0) return;
    const toFlush = [...this.dataPoints];
    this.dataPoints = [];
    logger.debug(`Flushing ${toFlush.length} metric data points`);
    this.onFlush?.(toFlush);
  }

  /** Clear all buffered data points. */
  clear(): void {
    this.dataPoints = [];
  }

  /** Get current buffer size. */
  get bufferSize(): number {
    return this.dataPoints.length;
  }
}

// ---------------------------------------------------------------------------
// OTLP export types
// ---------------------------------------------------------------------------

export interface OTLPAttribute {
  key: string;
  value: { stringValue: string };
}

export interface OTLPDataPoint {
  value: number;
  timeUnixNano: number;
  attributes: OTLPAttribute[];
}

export interface OTLPMetric {
  name: string;
  description: string;
  unit: string;
  type: MetricType;
  dataPoints: OTLPDataPoint[];
}

export interface OTLPScopeMetrics {
  scope: { name: string; version: string };
  metrics: OTLPMetric[];
}

export interface OTLPResourceMetrics {
  resource: { attributes: OTLPAttribute[] };
  scopeMetrics: OTLPScopeMetrics[];
}

export interface OTLPExportPayload {
  resourceMetrics: OTLPResourceMetrics[];
}
