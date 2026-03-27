import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCachedNvd,
  setCachedNvd,
  getCachedEpss,
  setCachedEpss,
  _setRedisClient,
} from '../cache/redis-cache.js';
import type { NvdCveData, EpssData } from '../types.js';

// ---------------------------------------------------------------------------
// Mock Redis client
// ---------------------------------------------------------------------------

function createMockRedis(store: Map<string, string> = new Map()) {
  const pipelines: Array<{ op: string; args: unknown[] }> = [];

  const pipelineObj = {
    get(key: string) {
      pipelines.push({ op: 'get', args: [key] });
      return pipelineObj;
    },
    setex(key: string, ttl: number, value: string) {
      pipelines.push({ op: 'setex', args: [key, ttl, value] });
      return pipelineObj;
    },
    exec() {
      const results = pipelines.map((cmd) => {
        if (cmd.op === 'get') {
          const key = cmd.args[0] as string;
          const val = store.get(key);
          return [null, val ?? null] as [null, string | null];
        }
        if (cmd.op === 'setex') {
          const key = cmd.args[0] as string;
          const value = cmd.args[2] as string;
          store.set(key, value);
          return [null, 'OK'] as [null, string];
        }
        return [null, null] as [null, null];
      });
      pipelines.length = 0;
      return Promise.resolve(results);
    },
  };

  return {
    pipeline: () => pipelineObj,
    quit: vi.fn().mockResolvedValue('OK'),
    _store: store,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Redis enrichment cache', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    const mock = createMockRedis(store);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _setRedisClient(mock as any);
  });

  describe('NVD cache', () => {
    const sampleNvd: NvdCveData = {
      cveId: 'CVE-2021-44228',
      title: 'Log4Shell',
      description: 'Apache Log4j2 RCE',
      cweIds: ['CWE-502'],
      cvssV3: { score: 10.0, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', version: '3.1' },
      publishedDate: '2021-12-10T00:00:00Z',
      lastModified: '2024-01-01T00:00:00Z',
    };

    it('returns all uncached on empty store', async () => {
      const { cached, uncached } = await getCachedNvd(['CVE-2021-44228', 'CVE-2023-1234']);

      expect(cached.size).toBe(0);
      expect(uncached).toEqual(['CVE-2021-44228', 'CVE-2023-1234']);
    });

    it('sets and retrieves NVD data', async () => {
      const data = new Map<string, NvdCveData>();
      data.set('CVE-2021-44228', sampleNvd);

      await setCachedNvd(data);

      expect(store.has('enrich:nvd:CVE-2021-44228')).toBe(true);

      const { cached, uncached } = await getCachedNvd([
        'CVE-2021-44228',
        'CVE-2099-0001',
      ]);

      expect(cached.size).toBe(1);
      expect(cached.get('CVE-2021-44228')?.cveId).toBe('CVE-2021-44228');
      expect(uncached).toEqual(['CVE-2099-0001']);
    });

    it('handles empty input', async () => {
      const { cached, uncached } = await getCachedNvd([]);
      expect(cached.size).toBe(0);
      expect(uncached.length).toBe(0);
    });

    it('skips set on empty map', async () => {
      await setCachedNvd(new Map());
      expect(store.size).toBe(0);
    });
  });

  describe('EPSS cache', () => {
    const sampleEpss: EpssData = {
      cveId: 'CVE-2021-44228',
      score: 0.97565,
      percentile: 0.99998,
      date: '2024-01-15',
    };

    it('returns all uncached on empty store', async () => {
      const { cached, uncached } = await getCachedEpss(['CVE-2021-44228']);

      expect(cached.size).toBe(0);
      expect(uncached).toEqual(['CVE-2021-44228']);
    });

    it('sets and retrieves EPSS data', async () => {
      const data = new Map<string, EpssData>();
      data.set('CVE-2021-44228', sampleEpss);

      await setCachedEpss(data);

      expect(store.has('enrich:epss:CVE-2021-44228')).toBe(true);

      const { cached, uncached } = await getCachedEpss([
        'CVE-2021-44228',
        'CVE-2099-0001',
      ]);

      expect(cached.size).toBe(1);
      expect(cached.get('CVE-2021-44228')?.score).toBeCloseTo(0.97565, 4);
      expect(uncached).toEqual(['CVE-2099-0001']);
    });

    it('handles empty input', async () => {
      const { cached, uncached } = await getCachedEpss([]);
      expect(cached.size).toBe(0);
      expect(uncached.length).toBe(0);
    });
  });
});
