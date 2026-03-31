import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ioredis before importing the module under test
vi.mock('ioredis', () => {
  const store = new Map<string, string>();

  const RedisMock = vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    incr: vi.fn((key: string) => {
      const current = parseInt(store.get(key) ?? '0', 10) + 1;
      store.set(key, String(current));
      return Promise.resolve(current);
    }),
    expire: vi.fn(() => Promise.resolve(1)),
    _store: store,
  }));

  return { default: RedisMock };
});

import {
  checkAiRateLimit,
  incrementAiUsage,
  getAiUsage,
  setRedisInstance,
  resetRedis,
} from '../rate-limit';
import Redis from 'ioredis';

describe('rate-limit', () => {
  let redis: InstanceType<typeof Redis>;

  beforeEach(() => {
    resetRedis();
    // Set env var so getRedis doesn't throw
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    redis = new Redis();
    setRedisInstance(redis);
    // Clear store between tests
    (redis as unknown as { _store: Map<string, string> })._store.clear();
  });

  describe('checkAiRateLimit', () => {
    it('allows requests when under the limit (FREE tier)', async () => {
      const result = await checkAiRateLimit('org-1', 'FREE');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
      expect(result.limit).toBe(50);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('allows requests for PRO tier with higher limit', async () => {
      const result = await checkAiRateLimit('org-1', 'PRO');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1000);
      expect(result.limit).toBe(1000);
    });

    it('allows requests for ENTERPRISE tier', async () => {
      const result = await checkAiRateLimit('org-1', 'ENTERPRISE');
      expect(result.limit).toBe(5000);
    });

    it('allows requests for MSSP tier', async () => {
      const result = await checkAiRateLimit('org-1', 'MSSP');
      expect(result.limit).toBe(10000);
    });

    it('denies requests when at the limit', async () => {
      const store = (redis as unknown as { _store: Map<string, string> })._store;
      const date = new Date().toISOString().slice(0, 10);
      store.set(`ai:usage:org-1:${date}`, '50');

      const result = await checkAiRateLimit('org-1', 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('denies when over the limit', async () => {
      const store = (redis as unknown as { _store: Map<string, string> })._store;
      const date = new Date().toISOString().slice(0, 10);
      store.set(`ai:usage:org-1:${date}`, '999');

      const result = await checkAiRateLimit('org-1', 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('defaults unknown tiers to FREE limits', async () => {
      const result = await checkAiRateLimit('org-1', 'UNKNOWN');
      expect(result.limit).toBe(50);
    });

    it('is case-insensitive for tier names', async () => {
      const result = await checkAiRateLimit('org-1', 'pro');
      expect(result.limit).toBe(1000);
    });
  });

  describe('incrementAiUsage', () => {
    it('increments from 0 to 1', async () => {
      const count = await incrementAiUsage('org-1');
      expect(count).toBe(1);
    });

    it('increments consecutively', async () => {
      await incrementAiUsage('org-1');
      const count = await incrementAiUsage('org-1');
      expect(count).toBe(2);
    });

    it('sets expiry on first increment', async () => {
      await incrementAiUsage('org-1');
      expect(redis.expire).toHaveBeenCalled();
    });
  });

  describe('getAiUsage', () => {
    it('returns zero usage when no calls made', async () => {
      const stats = await getAiUsage('org-1', 'PRO');
      expect(stats.used).toBe(0);
      expect(stats.limit).toBe(1000);
      expect(stats.resetAt).toBeInstanceOf(Date);
    });

    it('returns correct usage after increments', async () => {
      await incrementAiUsage('org-1');
      await incrementAiUsage('org-1');
      await incrementAiUsage('org-1');

      const stats = await getAiUsage('org-1', 'FREE');
      expect(stats.used).toBe(3);
      expect(stats.limit).toBe(50);
    });

    it('resetAt is in the future', async () => {
      const stats = await getAiUsage('org-1');
      expect(stats.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
