import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkUploadLimit,
  incrementUploadCount,
  checkAiLimit,
  incrementAiCount,
  checkUserLimit,
  checkAssetLimit,
  getUsageSummary,
  _setRedisForTest,
} from '../usage';

// Mock Redis
function createMockRedis(store: Record<string, string> = {}) {
  return {
    get: vi.fn(async (key: string) => store[key] ?? null),
    incr: vi.fn(async (key: string) => {
      const val = (Number(store[key]) || 0) + 1;
      store[key] = String(val);
      return val;
    }),
    expire: vi.fn(async () => 1),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('usage', () => {
  const orgId = 'org_test_123';
  let store: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRedis: any;

  beforeEach(() => {
    store = {};
    mockRedis = createMockRedis(store);
    _setRedisForTest(mockRedis);
  });

  afterEach(() => {
    _setRedisForTest(null);
  });

  describe('checkUploadLimit', () => {
    it('allows uploads when under limit (FREE)', async () => {
      const result = await checkUploadLimit(orgId, 'FREE');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(3);
    });

    it('denies uploads when at limit (FREE)', async () => {
      // Simulate 3 uploads already done
      const key = Object.keys(store).length === 0 ? '' : '';
      // Pre-set the store via mock behavior
      mockRedis.get.mockResolvedValueOnce('3');
      const result = await checkUploadLimit(orgId, 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(3);
      expect(result.remaining).toBe(0);
      void key;
    });

    it('always allows uploads for PRO (unlimited)', async () => {
      mockRedis.get.mockResolvedValueOnce('9999');
      const result = await checkUploadLimit(orgId, 'PRO');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe('unlimited');
      expect(result.remaining).toBe('unlimited');
    });
  });

  describe('incrementUploadCount', () => {
    it('increments and returns new count', async () => {
      const count = await incrementUploadCount(orgId);
      expect(count).toBe(1);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('sets expiry on first increment', async () => {
      await incrementUploadCount(orgId);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.any(String),
        60 * 24 * 60 * 60,
      );
    });

    it('does not set expiry on subsequent increments', async () => {
      // Simulate second increment (returns 2)
      mockRedis.incr.mockResolvedValueOnce(2);
      await incrementUploadCount(orgId);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });

  describe('checkAiLimit', () => {
    it('allows AI calls under FREE limit', async () => {
      mockRedis.get.mockResolvedValueOnce('10');
      const result = await checkAiLimit(orgId, 'FREE');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(40);
    });

    it('denies AI calls at FREE limit', async () => {
      mockRedis.get.mockResolvedValueOnce('50');
      const result = await checkAiLimit(orgId, 'FREE');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('incrementAiCount', () => {
    it('increments and returns new count', async () => {
      const count = await incrementAiCount(orgId);
      expect(count).toBe(1);
    });
  });

  describe('checkUserLimit', () => {
    it('allows adding users under limit', async () => {
      const result = await checkUserLimit(orgId, 'FREE', 0);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
    });

    it('denies adding users at limit', async () => {
      const result = await checkUserLimit(orgId, 'FREE', 1);
      expect(result.allowed).toBe(false);
    });

    it('allows more users on PRO', async () => {
      const result = await checkUserLimit(orgId, 'PRO', 5);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
    });
  });

  describe('checkAssetLimit', () => {
    it('allows adding assets under limit', async () => {
      const result = await checkAssetLimit(orgId, 'FREE', 10);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
    });

    it('denies adding assets at limit', async () => {
      const result = await checkAssetLimit(orgId, 'FREE', 50);
      expect(result.allowed).toBe(false);
    });

    it('allows unlimited assets on MSSP', async () => {
      const result = await checkAssetLimit(orgId, 'MSSP', 99999);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe('unlimited');
    });
  });

  describe('getUsageSummary', () => {
    it('returns full usage summary', async () => {
      mockRedis.get
        .mockResolvedValueOnce('2')  // uploads
        .mockResolvedValueOnce('15') // ai calls
        .mockResolvedValueOnce('30') // assets
        .mockResolvedValueOnce('1'); // users

      const summary = await getUsageSummary(orgId, 'FREE');

      expect(summary.uploads.current).toBe(2);
      expect(summary.uploads.limit).toBe(3);
      expect(summary.aiCalls.current).toBe(15);
      expect(summary.aiCalls.limit).toBe(50);
      expect(summary.assets.current).toBe(30);
      expect(summary.assets.limit).toBe(50);
      expect(summary.users.current).toBe(1);
      expect(summary.users.limit).toBe(1);
    });
  });
});
