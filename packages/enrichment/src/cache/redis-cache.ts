import Redis from 'ioredis';
import type { NvdCveData, EpssData } from '../types';

const TTL_SECONDS = 24 * 60 * 60; // 24 hours

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redisClient;
}

// ---------------------------------------------------------------------------
// NVD Cache
// ---------------------------------------------------------------------------

function nvdKey(cveId: string): string {
  return `enrich:nvd:${cveId}`;
}

/**
 * Retrieve cached NVD data for a list of CVE IDs.
 * Returns cached entries and the list of cache misses.
 */
export async function getCachedNvd(
  cveIds: string[],
): Promise<{ cached: Map<string, NvdCveData>; uncached: string[] }> {
  const cached = new Map<string, NvdCveData>();
  const uncached: string[] = [];

  if (cveIds.length === 0) return { cached, uncached };

  try {
    const redis = getRedis();
    const keys = cveIds.map(nvdKey);
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }
    const results = await pipeline.exec();

    if (!results) {
      return { cached, uncached: [...cveIds] };
    }

    for (let i = 0; i < cveIds.length; i++) {
      const result = results[i];
      const cveId = cveIds[i]!;
      if (result && !result[0] && result[1]) {
        try {
          const data = JSON.parse(result[1] as string) as NvdCveData;
          cached.set(cveId, data);
        } catch {
          uncached.push(cveId);
        }
      } else {
        uncached.push(cveId);
      }
    }
  } catch (err) {
    console.warn('Redis getCachedNvd error, treating all as uncached:', err);
    return { cached: new Map(), uncached: [...cveIds] };
  }

  return { cached, uncached };
}

/**
 * Bulk set NVD data in Redis with 24h TTL.
 */
export async function setCachedNvd(
  data: Map<string, NvdCveData>,
): Promise<void> {
  if (data.size === 0) return;

  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();

    for (const [cveId, nvdData] of data) {
      pipeline.setex(nvdKey(cveId), TTL_SECONDS, JSON.stringify(nvdData));
    }

    await pipeline.exec();
  } catch (err) {
    console.warn('Redis setCachedNvd error:', err);
  }
}

// ---------------------------------------------------------------------------
// EPSS Cache
// ---------------------------------------------------------------------------

function epssKey(cveId: string): string {
  return `enrich:epss:${cveId}`;
}

/**
 * Retrieve cached EPSS scores for a list of CVE IDs.
 * Returns cached entries and the list of cache misses.
 */
export async function getCachedEpss(
  cveIds: string[],
): Promise<{ cached: Map<string, EpssData>; uncached: string[] }> {
  const cached = new Map<string, EpssData>();
  const uncached: string[] = [];

  if (cveIds.length === 0) return { cached, uncached };

  try {
    const redis = getRedis();
    const keys = cveIds.map(epssKey);
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }
    const results = await pipeline.exec();

    if (!results) {
      return { cached, uncached: [...cveIds] };
    }

    for (let i = 0; i < cveIds.length; i++) {
      const result = results[i];
      const cveId = cveIds[i]!;
      if (result && !result[0] && result[1]) {
        try {
          const data = JSON.parse(result[1] as string) as EpssData;
          cached.set(cveId, data);
        } catch {
          uncached.push(cveId);
        }
      } else {
        uncached.push(cveId);
      }
    }
  } catch (err) {
    console.warn('Redis getCachedEpss error, treating all as uncached:', err);
    return { cached: new Map(), uncached: [...cveIds] };
  }

  return { cached, uncached };
}

/**
 * Bulk set EPSS data in Redis with 24h TTL.
 */
export async function setCachedEpss(
  data: Map<string, EpssData>,
): Promise<void> {
  if (data.size === 0) return;

  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();

    for (const [cveId, epssData] of data) {
      pipeline.setex(epssKey(cveId), TTL_SECONDS, JSON.stringify(epssData));
    }

    await pipeline.exec();
  } catch (err) {
    console.warn('Redis setCachedEpss error:', err);
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Disconnect from Redis. Call on shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Replace the Redis client instance. Useful for testing with mocks.
 */
export function _setRedisClient(client: Redis | null): void {
  redisClient = client;
}
