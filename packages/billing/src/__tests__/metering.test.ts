import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordUsageEvent,
  getClientUsage,
  getOrgUsageSummary,
  estimateUsageCost,
  _setMeteringRedisForTest,
} from '../metering';

// In-memory Redis mock with pipeline support
function createMockRedis() {
  const store: Record<string, string> = {};
  const sets: Record<string, Set<string>> = {};

  const redis = {
    incrby: vi.fn(async (key: string, amount: number) => {
      const val = (Number(store[key]) || 0) + amount;
      store[key] = String(val);
      return val;
    }),
    expire: vi.fn(async () => 1),
    get: vi.fn(async (key: string) => store[key] ?? null),
    sadd: vi.fn(async (key: string, member: string) => {
      if (!sets[key]) sets[key] = new Set();
      sets[key].add(member);
      return 1;
    }),
    smembers: vi.fn(async (key: string) => [...(sets[key] ?? [])]),
    pipeline: vi.fn(() => {
      const commands: Array<{ method: string; args: unknown[] }> = [];
      const pipe = {
        get: (key: string) => { commands.push({ method: 'get', args: [key] }); return pipe; },
        exec: vi.fn(async () =>
          commands.map((cmd) => {
            if (cmd.method === 'get') {
              return [null, store[cmd.args[0] as string] ?? null];
            }
            return [null, null];
          }),
        ),
      };
      return pipe;
    }),
    _store: store,
    _sets: sets,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return redis;
}

describe('metering', () => {
  const orgId = 'org_mssp_test';
  const clientA = 'client_a';
  const clientB = 'client_b';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = createMockRedis();
    _setMeteringRedisForTest(mockRedis);
  });

  afterEach(() => {
    _setMeteringRedisForTest(null);
  });

  describe('recordUsageEvent', () => {
    it('increments usage counter and returns new value', async () => {
      const result = await recordUsageEvent(orgId, clientA, 'assets_scanned', 5);
      expect(result).toBe(5);
      expect(mockRedis.incrby).toHaveBeenCalledWith(
        expect.stringContaining(`${orgId}:${clientA}:assets_scanned`),
        5,
      );
    });

    it('sets expiry on first record', async () => {
      await recordUsageEvent(orgId, clientA, 'ai_calls', 1);
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('tracks client in org clients set', async () => {
      await recordUsageEvent(orgId, clientA, 'ai_calls', 1);
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        expect.stringContaining(`metering:clients:${orgId}`),
        clientA,
      );
    });

    it('accumulates multiple events', async () => {
      await recordUsageEvent(orgId, clientA, 'findings_processed', 100);
      const result = await recordUsageEvent(orgId, clientA, 'findings_processed', 50);
      expect(result).toBe(150);
    });
  });

  describe('getClientUsage', () => {
    it('returns zero metrics for a new client', async () => {
      const usage = await getClientUsage(orgId, clientA);
      expect(usage.clientId).toBe(clientA);
      expect(usage.metrics.assets_scanned).toBe(0);
      expect(usage.metrics.ai_calls).toBe(0);
      expect(usage.metrics.findings_processed).toBe(0);
      expect(usage.metrics.storage_gb).toBe(0);
    });

    it('returns recorded metrics', async () => {
      await recordUsageEvent(orgId, clientA, 'assets_scanned', 10);
      await recordUsageEvent(orgId, clientA, 'ai_calls', 3);

      const usage = await getClientUsage(orgId, clientA);
      expect(usage.metrics.assets_scanned).toBe(10);
      expect(usage.metrics.ai_calls).toBe(3);
    });
  });

  describe('getOrgUsageSummary', () => {
    it('aggregates usage across clients', async () => {
      await recordUsageEvent(orgId, clientA, 'assets_scanned', 10);
      await recordUsageEvent(orgId, clientB, 'assets_scanned', 20);
      await recordUsageEvent(orgId, clientA, 'ai_calls', 5);

      const summary = await getOrgUsageSummary(orgId);

      expect(summary.orgId).toBe(orgId);
      expect(summary.totals.assets_scanned).toBe(30);
      expect(summary.totals.ai_calls).toBe(5);
      expect(summary.clients).toHaveLength(2);
    });

    it('returns empty totals when no usage', async () => {
      const summary = await getOrgUsageSummary(orgId);
      expect(summary.totals.assets_scanned).toBe(0);
      expect(summary.totals.ai_calls).toBe(0);
      expect(summary.clients).toHaveLength(0);
    });
  });

  describe('estimateUsageCost', () => {
    it('returns zero metered cost for non-MSSP tiers', () => {
      const estimate = estimateUsageCost('PRO', {
        assets_scanned: 100,
        findings_processed: 500,
        ai_calls: 50,
        storage_gb: 10,
      });

      expect(estimate.baseCost).toBe(149); // PRO monthly price
      expect(estimate.meteredCost).toBe(0); // no metered cost for PRO
      expect(estimate.totalEstimated).toBe(149);
    });

    it('calculates metered cost for MSSP tier', () => {
      const estimate = estimateUsageCost('MSSP', {
        assets_scanned: 100,   // 100 * $0.10 = $10
        findings_processed: 500, // 500 * $0.02 = $10
        ai_calls: 200,          // 200 * $0.05 = $10
        storage_gb: 10,         // 10 * $0.50 = $5
      });

      expect(estimate.baseCost).toBe(0); // MSSP is custom pricing (contact sales)
      expect(estimate.meteredCost).toBe(35); // $10 + $10 + $10 + $5
      expect(estimate.totalEstimated).toBe(35);
      expect(estimate.breakdown.assets_scanned.cost).toBe(10);
      expect(estimate.breakdown.findings_processed.cost).toBe(10);
      expect(estimate.breakdown.ai_calls.cost).toBe(10);
      expect(estimate.breakdown.storage_gb.cost).toBe(5);
    });

    it('handles zero usage', () => {
      const estimate = estimateUsageCost('MSSP', {
        assets_scanned: 0,
        findings_processed: 0,
        ai_calls: 0,
        storage_gb: 0,
      });

      expect(estimate.meteredCost).toBe(0);
      expect(estimate.totalEstimated).toBe(0); // MSSP is custom pricing (contact sales)
    });
  });
});
