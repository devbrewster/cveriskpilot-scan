/**
 * @cveriskpilot/db-scale — Read-replica routing.
 *
 * Routes read queries to healthy replicas and write queries to the primary.
 * Includes automatic failover detection via periodic health checks.
 */

import type { ReplicaConfig, ReplicaNode, ReplicaRole } from './types';

// ---------------------------------------------------------------------------
// ReadReplicaRouter
// ---------------------------------------------------------------------------

export class ReadReplicaRouter {
  private config: ReplicaConfig;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private roundRobinIndex = 0;

  constructor(config: ReplicaConfig) {
    this.config = {
      ...config,
      primary: { ...config.primary, healthy: true },
      replicas: config.replicas.map((r) => ({ ...r, healthy: true })),
    };
  }

  // -------------------------------------------------------------------------
  // Connection resolution
  // -------------------------------------------------------------------------

  /**
   * Returns the connection string for a given operation type.
   * Write operations always go to primary.
   * Read operations go to a healthy replica (round-robin), falling back to primary.
   */
  getConnectionString(operation: 'read' | 'write'): string {
    if (operation === 'write') {
      return this.getPrimaryConnectionString();
    }

    const healthy = this.config.replicas.filter((r) => r.healthy);
    if (healthy.length === 0) {
      // Fallback: all replicas down, route reads to primary
      return this.getPrimaryConnectionString();
    }

    const node = healthy[this.roundRobinIndex % healthy.length]!;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % healthy.length;
    return node.connectionString;
  }

  /** Returns the primary connection string. */
  getPrimaryConnectionString(): string {
    return this.config.primary.connectionString;
  }

  /**
   * Returns the node that would serve a given operation, useful for
   * logging/tracing which node handled a request.
   */
  resolveNode(operation: 'read' | 'write'): ReplicaNode {
    if (operation === 'write') {
      return { ...this.config.primary };
    }

    const healthy = this.config.replicas.filter((r) => r.healthy);
    if (healthy.length === 0) {
      return { ...this.config.primary };
    }

    const node = healthy[this.roundRobinIndex % healthy.length]!;
    return { ...node };
  }

  // -------------------------------------------------------------------------
  // Health checking
  // -------------------------------------------------------------------------

  /**
   * Starts periodic health checks against all nodes.
   * The `probe` function should attempt a lightweight query (e.g. `SELECT 1`)
   * against the given connection string and resolve to `true` if healthy.
   */
  startHealthChecks(probe: (connectionString: string) => Promise<boolean>): void {
    if (this.healthCheckTimer) return; // already running

    const check = async () => {
      await this.runHealthChecks(probe);
    };

    // Run immediately, then on interval
    void check();
    this.healthCheckTimer = setInterval(check, this.config.healthCheckIntervalMs);
  }

  /** Stops the periodic health-check loop. */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Runs a single round of health checks against all nodes.
   * Can be called manually outside the periodic loop.
   */
  async runHealthChecks(probe: (connectionString: string) => Promise<boolean>): Promise<void> {
    const checkNode = async (node: ReplicaNode): Promise<void> => {
      let consecutiveFailures = 0;

      try {
        const healthy = await Promise.race([
          probe(node.connectionString),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('health check timeout')), this.config.healthCheckTimeoutMs),
          ),
        ]);
        node.healthy = healthy;
        if (healthy) consecutiveFailures = 0;
        else consecutiveFailures++;
      } catch {
        consecutiveFailures++;
      }

      node.lastCheckedAt = new Date();

      if (consecutiveFailures >= this.config.failureThreshold) {
        node.healthy = false;
      }
    };

    await Promise.allSettled([
      checkNode(this.config.primary),
      ...this.config.replicas.map(checkNode),
    ]);
  }

  // -------------------------------------------------------------------------
  // Node management
  // -------------------------------------------------------------------------

  /** Adds a new replica node at runtime. */
  addReplica(node: Omit<ReplicaNode, 'healthy' | 'lastCheckedAt'>): void {
    this.config.replicas.push({
      ...node,
      role: 'replica' as ReplicaRole,
      healthy: true,
      lastCheckedAt: null,
    });
  }

  /** Removes a replica by id. */
  removeReplica(id: string): boolean {
    const idx = this.config.replicas.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.config.replicas.splice(idx, 1);
    return true;
  }

  /** Returns a snapshot of all nodes and their health status. */
  getNodes(): { primary: ReplicaNode; replicas: ReplicaNode[] } {
    return {
      primary: { ...this.config.primary },
      replicas: this.config.replicas.map((r) => ({ ...r })),
    };
  }

  /** Returns counts of healthy vs total replicas. */
  getHealthSummary(): { totalReplicas: number; healthyReplicas: number; primaryHealthy: boolean } {
    return {
      totalReplicas: this.config.replicas.length,
      healthyReplicas: this.config.replicas.filter((r) => r.healthy).length,
      primaryHealthy: this.config.primary.healthy,
    };
  }

  /** Manually mark a node healthy or unhealthy (e.g. during maintenance). */
  setNodeHealth(id: string, healthy: boolean): boolean {
    if (this.config.primary.id === id) {
      this.config.primary.healthy = healthy;
      return true;
    }
    const replica = this.config.replicas.find((r) => r.id === id);
    if (replica) {
      replica.healthy = healthy;
      return true;
    }
    return false;
  }

  /** Cleans up timers. Call when shutting down. */
  dispose(): void {
    this.stopHealthChecks();
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/**
 * Creates a ReadReplicaRouter from environment variables.
 *
 * Expected env vars:
 *   DATABASE_URL          — primary connection string
 *   DATABASE_REPLICA_URLS — comma-separated replica connection strings
 */
export function createReplicaRouterFromEnv(): ReadReplicaRouter {
  const primaryUrl = process.env.DATABASE_URL;
  if (!primaryUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const replicaUrls = (process.env.DATABASE_REPLICA_URLS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return new ReadReplicaRouter({
    primary: {
      id: 'primary',
      role: 'primary',
      connectionString: primaryUrl,
      healthy: true,
      lastCheckedAt: null,
    },
    replicas: replicaUrls.map((url, i) => ({
      id: `replica-${i}`,
      role: 'replica' as ReplicaRole,
      connectionString: url,
      healthy: true,
      lastCheckedAt: null,
    })),
    healthCheckIntervalMs: 10_000,
    healthCheckTimeoutMs: 3_000,
    failureThreshold: 3,
  });
}
