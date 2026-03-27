// @cveriskpilot/residency — tenant placement service

import type {
  DataRegion,
  MigrationStatus,
  ResidencyPolicy,
  ResidencyResource,
  TenantPlacement,
} from './types';

// ---------------------------------------------------------------------------
// Storage interface
// ---------------------------------------------------------------------------

export interface PlacementStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

/** In-memory store for development and testing. */
export class InMemoryPlacementStore implements PlacementStore {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace('*', '');
    return Array.from(this.data.keys()).filter((k) => k.startsWith(prefix));
  }
}

// ---------------------------------------------------------------------------
// Default residency policy
// ---------------------------------------------------------------------------

const DEFAULT_POLICY: ResidencyPolicy = {
  primaryRegion: 'us-east1',
  failoverRegion: null,
  restrictedResources: ['database', 'storage', 'kms', 'backup'],
  complianceFramework: null,
  allowCrossRegionReplication: false,
};

// ---------------------------------------------------------------------------
// PlacementService
// ---------------------------------------------------------------------------

const PLACEMENT_PREFIX = 'residency:placement:';

export class PlacementService {
  private store: PlacementStore;

  constructor(store?: PlacementStore) {
    this.store = store ?? new InMemoryPlacementStore();
  }

  /**
   * Assign a data residency region for a tenant.
   * Optionally provide a custom residency policy; otherwise the default is used.
   */
  async assignRegion(
    tenantId: string,
    region: DataRegion,
    policyOverrides?: Partial<ResidencyPolicy>,
  ): Promise<TenantPlacement> {
    const existing = await this.getPlacement(tenantId);
    if (existing && existing.migrationStatus?.state === 'in_progress') {
      throw new Error(
        `Cannot reassign region for tenant ${tenantId}: migration already in progress`,
      );
    }

    const now = new Date().toISOString();
    const policy: ResidencyPolicy = {
      ...DEFAULT_POLICY,
      ...policyOverrides,
      primaryRegion: region,
    };

    const placement: TenantPlacement = {
      tenantId,
      region,
      policy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      migrationStatus: null,
    };

    await this.store.set(`${PLACEMENT_PREFIX}${tenantId}`, JSON.stringify(placement));
    return placement;
  }

  /** Get the assigned region for a tenant. Returns null if no placement exists. */
  async getRegion(tenantId: string): Promise<DataRegion | null> {
    const placement = await this.getPlacement(tenantId);
    return placement?.region ?? null;
  }

  /** Get full placement record for a tenant. */
  async getPlacement(tenantId: string): Promise<TenantPlacement | null> {
    const raw = await this.store.get(`${PLACEMENT_PREFIX}${tenantId}`);
    if (!raw) return null;
    return JSON.parse(raw) as TenantPlacement;
  }

  /**
   * Validate that a resource operation respects the tenant's residency constraints.
   * Returns { valid: true } if the operation is allowed, or { valid: false, reason } otherwise.
   */
  async validatePlacement(
    tenantId: string,
    resourceType: ResidencyResource,
    targetRegion?: DataRegion,
  ): Promise<{ valid: boolean; reason?: string }> {
    const placement = await this.getPlacement(tenantId);
    if (!placement) {
      return { valid: false, reason: `No placement found for tenant ${tenantId}` };
    }

    // If no target region specified, the operation is in the tenant's primary region
    if (!targetRegion || targetRegion === placement.region) {
      return { valid: true };
    }

    // Check if the resource is restricted to the primary region
    if (placement.policy.restrictedResources.includes(resourceType)) {
      // Allow if target is the failover region and cross-region replication is allowed
      if (
        placement.policy.allowCrossRegionReplication &&
        targetRegion === placement.policy.failoverRegion
      ) {
        return { valid: true };
      }

      return {
        valid: false,
        reason: `Resource type "${resourceType}" for tenant ${tenantId} must remain in ${placement.region} (policy: ${placement.policy.complianceFramework ?? 'default'})`,
      };
    }

    return { valid: true };
  }

  /**
   * Orchestrate a cross-region migration for a tenant.
   * This sets up the migration record; actual data movement is handled by infrastructure.
   */
  async migrateRegion(
    tenantId: string,
    fromRegion: DataRegion,
    toRegion: DataRegion,
  ): Promise<TenantPlacement> {
    const placement = await this.getPlacement(tenantId);
    if (!placement) {
      throw new Error(`No placement found for tenant ${tenantId}`);
    }

    if (placement.region !== fromRegion) {
      throw new Error(
        `Tenant ${tenantId} is in region ${placement.region}, not ${fromRegion}`,
      );
    }

    if (fromRegion === toRegion) {
      throw new Error(`Source and target regions are the same: ${fromRegion}`);
    }

    if (placement.migrationStatus?.state === 'in_progress') {
      throw new Error(`Migration already in progress for tenant ${tenantId}`);
    }

    const now = new Date().toISOString();
    const migration: MigrationStatus = {
      fromRegion,
      toRegion,
      state: 'pending',
      startedAt: now,
      completedAt: null,
      progressPercent: 0,
      error: null,
    };

    const updated: TenantPlacement = {
      ...placement,
      migrationStatus: migration,
      updatedAt: now,
    };

    await this.store.set(`${PLACEMENT_PREFIX}${tenantId}`, JSON.stringify(updated));
    return updated;
  }

  /**
   * Update migration progress. Called by the migration infrastructure during execution.
   */
  async updateMigrationProgress(
    tenantId: string,
    state: MigrationStatus['state'],
    progressPercent: number,
    error?: string,
  ): Promise<TenantPlacement> {
    const placement = await this.getPlacement(tenantId);
    if (!placement || !placement.migrationStatus) {
      throw new Error(`No active migration for tenant ${tenantId}`);
    }

    const now = new Date().toISOString();
    const isTerminal = state === 'completed' || state === 'failed' || state === 'rolled_back';

    const migration: MigrationStatus = {
      ...placement.migrationStatus,
      state,
      progressPercent,
      completedAt: isTerminal ? now : null,
      error: error ?? null,
    };

    // On completion, update the tenant's region to the target
    const region =
      state === 'completed' ? placement.migrationStatus.toRegion : placement.region;

    const updated: TenantPlacement = {
      ...placement,
      region,
      policy: { ...placement.policy, primaryRegion: region },
      migrationStatus: isTerminal ? null : migration,
      updatedAt: now,
    };

    await this.store.set(`${PLACEMENT_PREFIX}${tenantId}`, JSON.stringify(updated));
    return updated;
  }
}
