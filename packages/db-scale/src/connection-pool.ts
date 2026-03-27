/**
 * @cveriskpilot/db-scale — PgBouncer connection-pool configuration and monitoring.
 *
 * Provides tier-based pool sizing (free=5, pro=20, enterprise=50) and
 * health-monitoring primitives to surface pool saturation early.
 */

import type { BillingTier, PoolConfig, PoolHealthStatus } from './types';

// ---------------------------------------------------------------------------
// Default pool configuration
// ---------------------------------------------------------------------------

const DEFAULT_POOL_CONFIG: PoolConfig = {
  host: process.env.PGBOUNCER_HOST ?? '127.0.0.1',
  port: parseInt(process.env.PGBOUNCER_PORT ?? '6432', 10),
  poolMode: 'transaction',
  maxConnectionsByTier: {
    free: 5,
    pro: 20,
    enterprise: 50,
  },
  defaultPoolSize: 5,
  serverIdleTimeoutSec: 600,
  clientIdleTimeoutSec: 30,
  connectionTimeoutMs: 5_000,
};

// ---------------------------------------------------------------------------
// PgBouncerPool
// ---------------------------------------------------------------------------

export class PgBouncerPool {
  private config: PoolConfig;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private lastHealth: PoolHealthStatus | null = null;

  constructor(config?: Partial<PoolConfig>) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  /** Returns the full resolved pool config. */
  getConfig(): PoolConfig {
    return { ...this.config };
  }

  /** Returns the max connection count for a given billing tier. */
  getMaxConnections(tier: BillingTier): number {
    return this.config.maxConnectionsByTier[tier] ?? this.config.defaultPoolSize;
  }

  /**
   * Builds a PgBouncer-compatible connection string for a given tier.
   * The pool_size query parameter instructs the bouncer proxy how many
   * server-side connections this client may consume.
   */
  buildConnectionString(
    database: string,
    user: string,
    password: string,
    tier: BillingTier,
  ): string {
    const maxConn = this.getMaxConnections(tier);
    const base =
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
      `@${this.config.host}:${this.config.port}/${encodeURIComponent(database)}`;

    const params = new URLSearchParams({
      pool_mode: this.config.poolMode,
      pool_size: String(maxConn),
      connect_timeout: String(Math.ceil(this.config.connectionTimeoutMs / 1000)),
    });

    return `${base}?${params.toString()}`;
  }

  /**
   * Generates the PgBouncer INI-style [databases] entry for a tenant.
   * Useful when dynamically managing pgbouncer.ini via the admin console.
   */
  generateDatabaseEntry(
    database: string,
    host: string,
    port: number,
    tier: BillingTier,
  ): string {
    const maxConn = this.getMaxConnections(tier);
    return `${database} = host=${host} port=${port} pool_size=${maxConn} pool_mode=${this.config.poolMode}`;
  }

  // -----------------------------------------------------------------------
  // Health monitoring
  // -----------------------------------------------------------------------

  /**
   * Starts periodic health monitoring.
   *
   * The `probe` callback should query PgBouncer's `SHOW POOLS` or similar
   * admin command and return a PoolHealthStatus.
   */
  startHealthMonitoring(
    probe: () => Promise<PoolHealthStatus>,
    intervalMs = 15_000,
  ): void {
    if (this.healthCheckTimer) return;

    const check = async () => {
      try {
        this.lastHealth = await probe();
      } catch {
        this.lastHealth = {
          accepting: false,
          activeConnections: 0,
          idleConnections: 0,
          waitingClients: 0,
          totalPool: 0,
          checkedAt: new Date(),
        };
      }
    };

    void check();
    this.healthCheckTimer = setInterval(check, intervalMs);
  }

  /** Stops health monitoring. */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /** Returns the most recent health status snapshot. */
  getHealthStatus(): PoolHealthStatus | null {
    return this.lastHealth ? { ...this.lastHealth } : null;
  }

  /**
   * Evaluates whether the pool is under pressure.
   * Returns a 0-1 saturation ratio (activeConnections / totalPool).
   */
  getSaturationRatio(tier: BillingTier): number {
    if (!this.lastHealth || this.lastHealth.totalPool === 0) return 0;
    const maxConn = this.getMaxConnections(tier);
    return Math.min(this.lastHealth.activeConnections / maxConn, 1);
  }

  /**
   * Returns true when more than 80% of the tier's connections are in use,
   * signaling that back-pressure or scaling should be considered.
   */
  isNearSaturation(tier: BillingTier, threshold = 0.8): boolean {
    return this.getSaturationRatio(tier) >= threshold;
  }

  /** Cleans up timers. Call when shutting down. */
  dispose(): void {
    this.stopHealthMonitoring();
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/**
 * Creates a PgBouncerPool from environment variables.
 *
 * Env vars:
 *   PGBOUNCER_HOST (default 127.0.0.1)
 *   PGBOUNCER_PORT (default 6432)
 *   PGBOUNCER_POOL_MODE (default transaction)
 */
export function createPoolFromEnv(): PgBouncerPool {
  return new PgBouncerPool({
    host: process.env.PGBOUNCER_HOST ?? '127.0.0.1',
    port: parseInt(process.env.PGBOUNCER_PORT ?? '6432', 10),
    poolMode: (process.env.PGBOUNCER_POOL_MODE as PoolConfig['poolMode']) ?? 'transaction',
  });
}
