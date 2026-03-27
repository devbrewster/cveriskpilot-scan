// @cveriskpilot/rollout — deployment ring management

import type { DeploymentRing, RingAssignment, RolloutConfig } from './types';

// ---------------------------------------------------------------------------
// Ring ordering
// ---------------------------------------------------------------------------

const RING_ORDER: readonly DeploymentRing[] = ['canary', 'early_adopter', 'ga'] as const;

function nextRing(ring: DeploymentRing): DeploymentRing | null {
  const idx = RING_ORDER.indexOf(ring);
  if (idx === -1 || idx === RING_ORDER.length - 1) return null;
  return RING_ORDER[idx + 1]!;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: RolloutConfig = {
  canaryPercent: 5,
  earlyAdopterPercent: 20,
  autoPromoteAfterHours: 24,
  autoPromoteEnabled: false,
};

// ---------------------------------------------------------------------------
// Storage interface (Redis / in-memory abstraction)
// ---------------------------------------------------------------------------

export interface RingStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  /** Return all keys matching a pattern (e.g. "ring:*") */
  keys(pattern: string): Promise<string[]>;
}

/**
 * Simple in-memory store for development and testing.
 * Production deployments should supply a Redis-backed implementation.
 */
export class InMemoryRingStore implements RingStore {
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
// RingManager
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'rollout:ring:';
const CONFIG_KEY = 'rollout:config';

export class RingManager {
  private store: RingStore;

  constructor(store?: RingStore) {
    this.store = store ?? new InMemoryRingStore();
  }

  // -----------------------------------------------------------------------
  // Config
  // -----------------------------------------------------------------------

  async getConfig(): Promise<RolloutConfig> {
    const raw = await this.store.get(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return JSON.parse(raw) as RolloutConfig;
  }

  async setConfig(config: Partial<RolloutConfig>): Promise<RolloutConfig> {
    const current = await this.getConfig();
    const merged: RolloutConfig = { ...current, ...config };

    // Validate percentages
    const total = merged.canaryPercent + merged.earlyAdopterPercent;
    if (total > 100) {
      throw new Error(
        `Ring percentages exceed 100%: canary=${merged.canaryPercent}% + early_adopter=${merged.earlyAdopterPercent}% = ${total}%`,
      );
    }

    await this.store.set(CONFIG_KEY, JSON.stringify(merged));
    return merged;
  }

  // -----------------------------------------------------------------------
  // Assignment
  // -----------------------------------------------------------------------

  /** Assign a tenant to a specific deployment ring. */
  async assignTenantToRing(
    tenantId: string,
    ring: DeploymentRing,
    assignedBy = 'system',
  ): Promise<RingAssignment> {
    const assignment: RingAssignment = {
      tenantId,
      ring,
      assignedAt: new Date().toISOString(),
      promotedAt: null,
      assignedBy,
    };
    await this.store.set(`${KEY_PREFIX}${tenantId}`, JSON.stringify(assignment));
    return assignment;
  }

  /** Get the current ring assignment for a tenant. Returns null if unassigned. */
  async getRing(tenantId: string): Promise<RingAssignment | null> {
    const raw = await this.store.get(`${KEY_PREFIX}${tenantId}`);
    if (!raw) return null;
    return JSON.parse(raw) as RingAssignment;
  }

  /**
   * Promote a tenant to the next ring (canary -> early_adopter -> ga).
   * Returns the updated assignment, or null if already at GA.
   */
  async promoteRing(tenantId: string, promotedBy = 'system'): Promise<RingAssignment | null> {
    const current = await this.getRing(tenantId);
    if (!current) {
      throw new Error(`Tenant ${tenantId} has no ring assignment`);
    }

    const next = nextRing(current.ring);
    if (!next) return null; // Already at GA

    const updated: RingAssignment = {
      ...current,
      ring: next,
      promotedAt: new Date().toISOString(),
      assignedBy: promotedBy,
    };
    await this.store.set(`${KEY_PREFIX}${tenantId}`, JSON.stringify(updated));
    return updated;
  }

  /** List all tenants in a given ring. */
  async getRingTenants(ring: DeploymentRing): Promise<RingAssignment[]> {
    const keys = await this.store.keys(KEY_PREFIX);
    const results: RingAssignment[] = [];

    for (const key of keys) {
      const raw = await this.store.get(key);
      if (!raw) continue;
      const assignment = JSON.parse(raw) as RingAssignment;
      if (assignment.ring === ring) {
        results.push(assignment);
      }
    }
    return results;
  }

  /**
   * Auto-assign a tenant to a ring based on percentage-based distribution.
   * Uses a deterministic hash of the tenantId so the assignment is stable.
   */
  async autoAssign(tenantId: string, assignedBy = 'auto'): Promise<RingAssignment> {
    // Check if already assigned
    const existing = await this.getRing(tenantId);
    if (existing) return existing;

    const config = await this.getConfig();
    const bucket = deterministicBucket(tenantId);

    let ring: DeploymentRing;
    if (bucket < config.canaryPercent) {
      ring = 'canary';
    } else if (bucket < config.canaryPercent + config.earlyAdopterPercent) {
      ring = 'early_adopter';
    } else {
      ring = 'ga';
    }

    return this.assignTenantToRing(tenantId, ring, assignedBy);
  }

  /** Remove a tenant's ring assignment. */
  async removeAssignment(tenantId: string): Promise<void> {
    await this.store.del(`${KEY_PREFIX}${tenantId}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash that maps a tenant ID to a value in [0, 100).
 * This ensures the same tenant always lands in the same bucket.
 */
function deterministicBucket(tenantId: string): number {
  let hash = 0;
  for (let i = 0; i < tenantId.length; i++) {
    const char = tenantId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) % 100;
}
