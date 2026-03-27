// @cveriskpilot/rollout — feature flag service

import type { DeploymentRing, FeatureFlag } from './types';
import type { RingStore } from './rings';
import { InMemoryRingStore, RingManager } from './rings';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const FLAG_PREFIX = 'rollout:flag:';
const FLAG_INDEX_KEY = 'rollout:flag_index';

// ---------------------------------------------------------------------------
// FeatureFlagService
// ---------------------------------------------------------------------------

/**
 * Redis-backed feature flag service. Checks are designed for low-latency:
 * a single key lookup for the flag, plus a single key lookup for the tenant's ring.
 */
export class FeatureFlagService {
  private store: RingStore;
  private ringManager: RingManager;

  constructor(store?: RingStore, ringManager?: RingManager) {
    this.store = store ?? new InMemoryRingStore();
    this.ringManager = ringManager ?? new RingManager(this.store);
  }

  // -----------------------------------------------------------------------
  // Flag CRUD
  // -----------------------------------------------------------------------

  /** Create or update a feature flag. */
  async setFlag(
    flagName: string,
    rings: DeploymentRing[],
    options?: { description?: string; active?: boolean },
  ): Promise<FeatureFlag> {
    const existing = await this.getFlag(flagName);
    const now = new Date().toISOString();

    const flag: FeatureFlag = {
      name: flagName,
      description: options?.description ?? existing?.description ?? '',
      enabledRings: rings,
      active: options?.active ?? existing?.active ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.store.set(`${FLAG_PREFIX}${flagName}`, JSON.stringify(flag));

    // Maintain an index of all flag names for enumeration
    await this.addToIndex(flagName);

    return flag;
  }

  /** Retrieve a single flag definition. */
  async getFlag(flagName: string): Promise<FeatureFlag | null> {
    const raw = await this.store.get(`${FLAG_PREFIX}${flagName}`);
    if (!raw) return null;
    return JSON.parse(raw) as FeatureFlag;
  }

  /** Delete a feature flag. */
  async deleteFlag(flagName: string): Promise<void> {
    await this.store.del(`${FLAG_PREFIX}${flagName}`);
    await this.removeFromIndex(flagName);
  }

  /** List all registered feature flags. */
  async listFlags(): Promise<FeatureFlag[]> {
    const index = await this.getIndex();
    const flags: FeatureFlag[] = [];

    for (const name of index) {
      const flag = await this.getFlag(name);
      if (flag) flags.push(flag);
    }
    return flags;
  }

  // -----------------------------------------------------------------------
  // Evaluation
  // -----------------------------------------------------------------------

  /**
   * Check whether a feature flag is enabled for a specific tenant.
   * Returns false if the tenant has no ring assignment or the flag doesn't exist.
   */
  async isEnabled(flagName: string, tenantId: string): Promise<boolean> {
    const flag = await this.getFlag(flagName);
    if (!flag || !flag.active) return false;

    const assignment = await this.ringManager.getRing(tenantId);
    if (!assignment) return false;

    return flag.enabledRings.includes(assignment.ring);
  }

  /**
   * Return all flags with their enabled/disabled state for a specific tenant.
   */
  async getFlags(tenantId: string): Promise<Array<{ flag: FeatureFlag; enabled: boolean }>> {
    const allFlags = await this.listFlags();
    const assignment = await this.ringManager.getRing(tenantId);

    return allFlags.map((flag) => ({
      flag,
      enabled: flag.active && !!assignment && flag.enabledRings.includes(assignment.ring),
    }));
  }

  // -----------------------------------------------------------------------
  // Index management (tracks all flag names for enumeration)
  // -----------------------------------------------------------------------

  private async getIndex(): Promise<string[]> {
    const raw = await this.store.get(FLAG_INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  }

  private async addToIndex(flagName: string): Promise<void> {
    const index = await this.getIndex();
    if (!index.includes(flagName)) {
      index.push(flagName);
      await this.store.set(FLAG_INDEX_KEY, JSON.stringify(index));
    }
  }

  private async removeFromIndex(flagName: string): Promise<void> {
    const index = await this.getIndex();
    const filtered = index.filter((n) => n !== flagName);
    await this.store.set(FLAG_INDEX_KEY, JSON.stringify(filtered));
  }
}
