// ---------------------------------------------------------------------------
// Tenant-aware Observability — Dashboard Builder
// ---------------------------------------------------------------------------

import type { DashboardConfig, DashboardPanel, TenantTier } from './types';

// ---------------------------------------------------------------------------
// DashboardBuilder
// ---------------------------------------------------------------------------

export class DashboardBuilder {
  private uid: string;
  private title: string;
  private tenantId: string | null;
  private tier?: TenantTier;
  private tags: string[] = [];
  private panels: DashboardPanel[] = [];
  private refreshIntervalSeconds = 30;
  private timeRange = { from: 'now-6h', to: 'now' };

  constructor(uid: string, title: string) {
    this.uid = uid;
    this.title = title;
    this.tenantId = null;
  }

  /** Scope this dashboard to a specific tenant. */
  forTenant(tenantId: string): this {
    this.tenantId = tenantId;
    this.tags.push(`tenant:${tenantId}`);
    return this;
  }

  /** Filter dashboard metrics by tier. */
  forTier(tier: TenantTier): this {
    this.tier = tier;
    this.tags.push(`tier:${tier}`);
    return this;
  }

  /** Add tags. */
  withTags(tags: string[]): this {
    this.tags.push(...tags);
    return this;
  }

  /** Set auto-refresh interval. */
  withRefreshInterval(seconds: number): this {
    this.refreshIntervalSeconds = seconds;
    return this;
  }

  /** Set time range. */
  withTimeRange(from: string, to: string): this {
    this.timeRange = { from, to };
    return this;
  }

  /** Add a custom panel. */
  addPanel(panel: DashboardPanel): this {
    this.panels.push(panel);
    return this;
  }

  /** Build the final dashboard configuration. */
  build(): DashboardConfig {
    return {
      uid: this.uid,
      title: this.title,
      tenantId: this.tenantId,
      tier: this.tier,
      tags: [...new Set(this.tags)],
      panels: [...this.panels],
      refreshIntervalSeconds: this.refreshIntervalSeconds,
      timeRange: { ...this.timeRange },
    };
  }

  // -----------------------------------------------------------------------
  // Pre-built panel generators
  // -----------------------------------------------------------------------

  /** Add API latency panel. */
  addApiLatencyPanel(row: number): this {
    const tenantFilter = this.tenantId ? `, tenantId="${this.tenantId}"` : '';
    return this.addPanel({
      title: 'API Latency (p50/p95/p99)',
      type: 'graph',
      gridPos: { x: 0, y: row, w: 12, h: 8 },
      queries: [
        {
          expr: `histogram_quantile(0.50, rate(api_latency_bucket{${tenantFilter}}[5m]))`,
          legendFormat: 'p50',
        },
        {
          expr: `histogram_quantile(0.95, rate(api_latency_bucket{${tenantFilter}}[5m]))`,
          legendFormat: 'p95',
        },
        {
          expr: `histogram_quantile(0.99, rate(api_latency_bucket{${tenantFilter}}[5m]))`,
          legendFormat: 'p99',
        },
      ],
    });
  }

  /** Add error rate panel. */
  addErrorRatePanel(row: number): this {
    const tenantFilter = this.tenantId ? `, tenantId="${this.tenantId}"` : '';
    return this.addPanel({
      title: 'Error Rate',
      type: 'graph',
      gridPos: { x: 12, y: row, w: 12, h: 8 },
      queries: [
        {
          expr: `rate(error_rate{${tenantFilter}}[5m])`,
          legendFormat: 'errors/sec',
        },
      ],
    });
  }

  /** Add active users gauge panel. */
  addActiveUsersPanel(row: number): this {
    const tenantFilter = this.tenantId ? `tenantId="${this.tenantId}"` : '';
    return this.addPanel({
      title: 'Active Users',
      type: 'stat',
      gridPos: { x: 0, y: row, w: 6, h: 4 },
      queries: [
        {
          expr: `active_users{${tenantFilter}}`,
          legendFormat: 'users',
        },
      ],
    });
  }

  /** Add scan processing time panel. */
  addScanProcessingPanel(row: number): this {
    const tenantFilter = this.tenantId ? `, tenantId="${this.tenantId}"` : '';
    return this.addPanel({
      title: 'Scan Processing Time',
      type: 'heatmap',
      gridPos: { x: 6, y: row, w: 18, h: 8 },
      queries: [
        {
          expr: `rate(scan_processing_time_bucket{${tenantFilter}}[5m])`,
          legendFormat: '{{le}}',
        },
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Factory functions for common dashboard types
// ---------------------------------------------------------------------------

/**
 * Generate a standard tenant overview dashboard.
 */
export function createTenantOverviewDashboard(
  tenantId: string,
  tier?: TenantTier,
): DashboardConfig {
  const builder = new DashboardBuilder(
    `tenant-overview-${tenantId}`,
    `Tenant Overview — ${tenantId}`,
  )
    .forTenant(tenantId)
    .withTags(['overview', 'auto-generated'])
    .addActiveUsersPanel(0)
    .addApiLatencyPanel(4)
    .addErrorRatePanel(4)
    .addScanProcessingPanel(12);

  if (tier) {
    builder.forTier(tier);
  }

  return builder.build();
}

/**
 * Generate a platform-wide operations dashboard (no tenant filter).
 */
export function createPlatformDashboard(): DashboardConfig {
  return new DashboardBuilder('platform-ops', 'Platform Operations')
    .withTags(['platform', 'ops', 'auto-generated'])
    .withRefreshInterval(15)
    .addApiLatencyPanel(0)
    .addErrorRatePanel(0)
    .addActiveUsersPanel(8)
    .addScanProcessingPanel(8)
    .build();
}
