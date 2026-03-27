// @cveriskpilot/stamps — Stamp routing & connection pooling

import type {
  StampConfig,
  StampPlacement,
  StampRegion,
  TenantTier,
  PlacementMode,
} from './types';
import { listStamps, provisionStamp } from './provision';

// ---------------------------------------------------------------------------
// Placement rules
// ---------------------------------------------------------------------------

export interface PlacementRule {
  /** Tenant tier this rule applies to */
  tier: TenantTier;
  /** Placement mode for this tier */
  placementMode: PlacementMode;
  /** Preferred regions (first match wins) */
  preferredRegions: StampRegion[];
  /** Max tenants per pooled stamp before creating a new one */
  poolCapacityThreshold: number;
}

const DEFAULT_PLACEMENT_RULES: PlacementRule[] = [
  {
    tier: 'enterprise',
    placementMode: 'dedicated',
    preferredRegions: ['us-central1', 'europe-west1', 'asia-southeast1'],
    poolCapacityThreshold: 1,
  },
  {
    tier: 'business',
    placementMode: 'pooled',
    preferredRegions: ['us-central1', 'europe-west1'],
    poolCapacityThreshold: 25,
  },
  {
    tier: 'team',
    placementMode: 'pooled',
    preferredRegions: ['us-central1'],
    poolCapacityThreshold: 50,
  },
  {
    tier: 'free',
    placementMode: 'pooled',
    preferredRegions: ['us-central1'],
    poolCapacityThreshold: 100,
  },
];

// ---------------------------------------------------------------------------
// Connection pool for stamp database connections
// ---------------------------------------------------------------------------

interface PooledConnection {
  stampId: string;
  databaseUrl: string;
  activeCount: number;
  maxConnections: number;
  createdAt: number;
  lastUsedAt: number;
}

// ---------------------------------------------------------------------------
// StampRouter
// ---------------------------------------------------------------------------

/**
 * Routes tenants to their assigned deployment stamp.
 * Manages a connection pool per stamp and enforces placement rules.
 */
export class StampRouter {
  private connectionPool = new Map<string, PooledConnection>();
  private tenantStampCache = new Map<string, string>();
  private placementRules: PlacementRule[];
  private defaultProjectId: string;
  private maxConnectionsPerStamp: number;
  private connectionIdleTimeoutMs: number;

  constructor(options?: {
    placementRules?: PlacementRule[];
    defaultProjectId?: string;
    maxConnectionsPerStamp?: number;
    connectionIdleTimeoutMs?: number;
  }) {
    this.placementRules = options?.placementRules ?? DEFAULT_PLACEMENT_RULES;
    this.defaultProjectId = options?.defaultProjectId ?? process.env.GCP_PROJECT_ID ?? 'cveriskpilot-prod';
    this.maxConnectionsPerStamp = options?.maxConnectionsPerStamp ?? 20;
    this.connectionIdleTimeoutMs = options?.connectionIdleTimeoutMs ?? 300_000; // 5 min
  }

  /**
   * Resolve the stamp placement for a given tenant.
   * Looks up existing assignment first, otherwise finds or provisions a stamp.
   */
  async resolveStamp(
    tenantId: string,
    options?: { tier?: TenantTier; region?: StampRegion },
  ): Promise<StampPlacement> {
    // 1. Check cache
    const cachedStampId = this.tenantStampCache.get(tenantId);
    if (cachedStampId) {
      const stamp = this.findStampById(cachedStampId);
      if (stamp && stamp.lifecycle === 'active') {
        return this.toPlacement(stamp);
      }
      // Cached stamp is no longer active — evict
      this.tenantStampCache.delete(tenantId);
    }

    // 2. Search existing stamps for this tenant
    const allStamps = listStamps();
    const existingStamp = allStamps.find(
      (s) => s.tenantIds.includes(tenantId) && s.lifecycle === 'active',
    );
    if (existingStamp) {
      this.tenantStampCache.set(tenantId, existingStamp.stampId);
      return this.toPlacement(existingStamp);
    }

    // 3. Find a pooled stamp with capacity, or provision a new one
    const tier = options?.tier ?? 'team';
    const rule = this.getPlacementRule(tier);
    const region = options?.region ?? rule.preferredRegions[0] ?? 'us-central1';

    if (rule.placementMode === 'pooled') {
      const candidate = this.findPooledStampWithCapacity(region, rule.poolCapacityThreshold);
      if (candidate) {
        // Assign tenant to the existing pooled stamp
        candidate.tenantIds.push(tenantId);
        candidate.updatedAt = new Date().toISOString();
        this.tenantStampCache.set(tenantId, candidate.stampId);
        return this.toPlacement(candidate);
      }
    }

    // 4. Provision new stamp
    const newStamp = await provisionStamp({
      tenantId,
      region,
      tier,
      projectId: this.defaultProjectId,
      labels: { 'routing-tier': tier },
    });

    this.tenantStampCache.set(tenantId, newStamp.stampId);
    return this.toPlacement(newStamp);
  }

  /**
   * Acquire a pooled database connection for a stamp.
   * Returns the connection URL and increments the active count.
   */
  acquireConnection(stampId: string): string {
    let pool = this.connectionPool.get(stampId);

    if (!pool) {
      const stamp = this.findStampById(stampId);
      if (!stamp) {
        throw new Error(`Cannot acquire connection: stamp ${stampId} not found`);
      }
      pool = {
        stampId,
        databaseUrl: stamp.databaseUrl,
        activeCount: 0,
        maxConnections: this.maxConnectionsPerStamp,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };
      this.connectionPool.set(stampId, pool);
    }

    if (pool.activeCount >= pool.maxConnections) {
      throw new Error(
        `Connection pool exhausted for stamp ${stampId} (${pool.maxConnections} max)`,
      );
    }

    pool.activeCount++;
    pool.lastUsedAt = Date.now();
    return pool.databaseUrl;
  }

  /**
   * Release a pooled connection back.
   */
  releaseConnection(stampId: string): void {
    const pool = this.connectionPool.get(stampId);
    if (pool && pool.activeCount > 0) {
      pool.activeCount--;
      pool.lastUsedAt = Date.now();
    }
  }

  /**
   * Evict idle connections that have not been used within the timeout window.
   */
  evictIdleConnections(): number {
    const now = Date.now();
    let evicted = 0;

    for (const [stampId, pool] of this.connectionPool.entries()) {
      if (pool.activeCount === 0 && now - pool.lastUsedAt > this.connectionIdleTimeoutMs) {
        this.connectionPool.delete(stampId);
        evicted++;
      }
    }

    return evicted;
  }

  /** Get connection pool stats */
  getPoolStats(): {
    totalPools: number;
    totalActiveConnections: number;
    pools: Array<{ stampId: string; active: number; max: number; idleMs: number }>;
  } {
    const pools: Array<{ stampId: string; active: number; max: number; idleMs: number }> = [];
    let totalActive = 0;
    const now = Date.now();

    for (const [, pool] of this.connectionPool) {
      totalActive += pool.activeCount;
      pools.push({
        stampId: pool.stampId,
        active: pool.activeCount,
        max: pool.maxConnections,
        idleMs: now - pool.lastUsedAt,
      });
    }

    return { totalPools: this.connectionPool.size, totalActiveConnections: totalActive, pools };
  }

  /** Invalidate the tenant-to-stamp cache for a specific tenant (e.g. after migration) */
  invalidateCache(tenantId: string): void {
    this.tenantStampCache.delete(tenantId);
  }

  /** Clear all cached mappings */
  clearCache(): void {
    this.tenantStampCache.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getPlacementRule(tier: TenantTier): PlacementRule {
    return (
      this.placementRules.find((r) => r.tier === tier) ??
      this.placementRules[this.placementRules.length - 1]!
    );
  }

  private findStampById(stampId: string): StampConfig | undefined {
    return listStamps().find((s) => s.stampId === stampId);
  }

  private findPooledStampWithCapacity(
    region: StampRegion,
    capacityThreshold: number,
  ): StampConfig | undefined {
    return listStamps().find(
      (s) =>
        s.lifecycle === 'active' &&
        s.placementMode === 'pooled' &&
        s.region === region &&
        s.tenantIds.length < capacityThreshold &&
        s.tenantIds.length < s.maxTenants,
    );
  }

  private toPlacement(stamp: StampConfig): StampPlacement {
    return {
      stampId: stamp.stampId,
      databaseUrl: stamp.databaseUrl,
      storageBucket: stamp.storageBucket,
      kmsKeyring: stamp.kmsKeyring,
      region: stamp.region,
      placementMode: stamp.placementMode,
    };
  }
}
