import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkFeatureGate, requireFeature } from '../gate.js';
import { _setRedisForTest } from '../usage.js';

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

describe('gate', () => {
  const orgId = 'org_test_gate';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = createMockRedis();
    _setRedisForTest(mockRedis);
  });

  afterEach(() => {
    _setRedisForTest(null);
  });

  describe('checkFeatureGate', () => {
    // Tier-based gates (no usage check)
    it('allows api_access for PRO', async () => {
      const result = await checkFeatureGate(orgId, 'PRO', 'api_access');
      expect(result.allowed).toBe(true);
    });

    it('denies api_access for FREE', async () => {
      const result = await checkFeatureGate(orgId, 'FREE', 'api_access');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('PRO');
    });

    it('allows sso for ENTERPRISE', async () => {
      const result = await checkFeatureGate(orgId, 'ENTERPRISE', 'sso');
      expect(result.allowed).toBe(true);
    });

    it('allows sso for MSSP', async () => {
      const result = await checkFeatureGate(orgId, 'MSSP', 'sso');
      expect(result.allowed).toBe(true);
    });

    it('denies sso for PRO', async () => {
      const result = await checkFeatureGate(orgId, 'PRO', 'sso');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('ENTERPRISE');
    });

    it('denies multi_client for FREE', async () => {
      const result = await checkFeatureGate(orgId, 'FREE', 'multi_client');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('ENTERPRISE');
    });

    it('allows scheduled_reports for PRO', async () => {
      const result = await checkFeatureGate(orgId, 'PRO', 'scheduled_reports');
      expect(result.allowed).toBe(true);
    });

    it('denies scheduled_reports for FREE', async () => {
      const result = await checkFeatureGate(orgId, 'FREE', 'scheduled_reports');
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe('PRO');
    });

    it('allows custom_sla for ENTERPRISE', async () => {
      const result = await checkFeatureGate(orgId, 'ENTERPRISE', 'custom_sla');
      expect(result.allowed).toBe(true);
    });

    it('denies custom_sla for PRO', async () => {
      const result = await checkFeatureGate(orgId, 'PRO', 'custom_sla');
      expect(result.allowed).toBe(false);
    });

    // Usage-based gates
    it('allows upload when under limit', async () => {
      const result = await checkFeatureGate(orgId, 'FREE', 'upload');
      expect(result.allowed).toBe(true);
    });

    it('denies upload when at limit', async () => {
      mockRedis.get.mockResolvedValueOnce('3');
      const result = await checkFeatureGate(orgId, 'FREE', 'upload');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('upload limit');
    });

    it('allows ai_remediation when under limit', async () => {
      mockRedis.get.mockResolvedValueOnce('10');
      const result = await checkFeatureGate(orgId, 'FREE', 'ai_remediation');
      expect(result.allowed).toBe(true);
    });

    it('denies ai_remediation when at limit', async () => {
      mockRedis.get.mockResolvedValueOnce('50');
      const result = await checkFeatureGate(orgId, 'FREE', 'ai_remediation');
      expect(result.allowed).toBe(false);
    });

    it('allows add_user when under limit', async () => {
      const result = await checkFeatureGate(orgId, 'PRO', 'add_user', 5);
      expect(result.allowed).toBe(true);
    });

    it('denies add_user when at limit', async () => {
      const result = await checkFeatureGate(orgId, 'FREE', 'add_user', 1);
      expect(result.allowed).toBe(false);
    });

    it('allows add_asset when under limit', async () => {
      const result = await checkFeatureGate(orgId, 'FREE', 'add_asset', 10);
      expect(result.allowed).toBe(true);
    });

    it('denies add_asset when at limit', async () => {
      const result = await checkFeatureGate(orgId, 'FREE', 'add_asset', 50);
      expect(result.allowed).toBe(false);
    });

    // Unknown feature
    it('denies unknown features', async () => {
      const result = await checkFeatureGate(orgId, 'PRO', 'nonexistent_feature');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown feature');
    });
  });

  describe('requireFeature', () => {
    it('does not throw for allowed features', async () => {
      await expect(
        requireFeature(orgId, 'PRO', 'api_access'),
      ).resolves.toBeUndefined();
    });

    it('throws for denied features', async () => {
      await expect(
        requireFeature(orgId, 'FREE', 'sso'),
      ).rejects.toThrow('SSO requires an Enterprise or MSSP plan');
    });

    it('includes upgradeRequired on thrown error', async () => {
      try {
        await requireFeature(orgId, 'FREE', 'api_access');
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error & { upgradeRequired?: string }).upgradeRequired).toBe('PRO');
      }
    });
  });
});
