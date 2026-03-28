// Redis-based sliding window rate limiter
// Uses sorted sets for accurate sliding-window counting.

import crypto from 'node:crypto';
import type Redis from 'ioredis';
import { getRedisClient } from '../session/redis-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Prefix for the Redis key (e.g. "login", "api") */
  keyPrefix: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** When the current window resets */
  resetAt: Date;
  /** Seconds until the caller may retry (only set when denied) */
  retryAfter?: number;
}

export interface RateLimiter {
  /** Check (and consume one token from) the rate limit for the given key. */
  check(key: string): Promise<RateLimitResult>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a sliding-window rate limiter backed by Redis sorted sets.
 *
 * Each request is stored as a member scored by its timestamp.  On every
 * check we:
 *   1. Remove entries older than `windowMs`.
 *   2. Count remaining entries.
 *   3. If under `maxRequests`, add the current request.
 *
 * All operations run inside a Redis pipeline for atomicity.
 */
export function createRateLimiter(
  config: RateLimitConfig,
  redis?: Redis,
): RateLimiter {
  const { windowMs, maxRequests, keyPrefix } = config;

  function redisKey(key: string, windowStart: number): string {
    // Window id keeps keys rotating so old sets are auto-cleaned by TTL
    const windowId = Math.floor(windowStart / windowMs);
    return `ratelimit:${keyPrefix}:${key}:${windowId}`;
  }

  return {
    async check(key: string): Promise<RateLimitResult> {
      const client = redis ?? getRedisClient();
      const now = Date.now();
      const windowStart = now - windowMs;
      const rKey = redisKey(key, now);
      const ttlSeconds = Math.ceil(windowMs / 1000);
      const resetAt = new Date(now + windowMs);

      // Unique member per request to avoid deduplication
      const member = `${now}:${crypto.randomBytes(8).toString('hex')}`;

      const pipeline = client.pipeline();
      // Remove entries outside the window
      pipeline.zremrangebyscore(rKey, 0, windowStart);
      // Count current entries
      pipeline.zcard(rKey);
      // Add the new entry optimistically (we'll remove it if denied)
      pipeline.zadd(rKey, now, member);
      // Ensure the key expires eventually
      pipeline.expire(rKey, ttlSeconds);

      const results = await pipeline.exec();

      // results[1] is [err, count] from zcard
      const currentCount = (results?.[1]?.[1] as number) ?? 0;

      if (currentCount >= maxRequests) {
        // Over limit — remove the optimistically added member
        await client.zrem(rKey, member);

        // Find the oldest entry to compute retryAfter
        const oldest = await client.zrangebyscore(rKey, '-inf', '+inf', 'LIMIT', 0, 1);
        let retryAfter = Math.ceil(windowMs / 1000);
        if (oldest && oldest.length > 0) {
          const oldestTs = parseInt(oldest[0]!.split(':')[0]!, 10);
          if (!isNaN(oldestTs)) {
            retryAfter = Math.max(1, Math.ceil((oldestTs + windowMs - now) / 1000));
          }
        }

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetAt,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-configured limiters (lazy-initialised)
// ---------------------------------------------------------------------------

let _loginLimiter: RateLimiter | undefined;
let _apiLimiter: RateLimiter | undefined;
let _uploadLimiter: RateLimiter | undefined;
let _aiLimiter: RateLimiter | undefined;

/** 5 attempts per 15 minutes per IP */
export function getLoginLimiter(): RateLimiter {
  if (!_loginLimiter) {
    _loginLimiter = createRateLimiter({
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: 'login',
    });
  }
  return _loginLimiter;
}

/** 100 requests per minute per org */
export function getApiLimiter(): RateLimiter {
  if (!_apiLimiter) {
    _apiLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 100,
      keyPrefix: 'api',
    });
  }
  return _apiLimiter;
}

/** 10 uploads per hour per org */
export function getUploadLimiter(): RateLimiter {
  if (!_uploadLimiter) {
    _uploadLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: 'upload',
    });
  }
  return _uploadLimiter;
}

/** AI limiter — delegates to billing rate limits (low default ceiling) */
export function getAiLimiter(): RateLimiter {
  if (!_aiLimiter) {
    _aiLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 20,
      keyPrefix: 'ai',
    });
  }
  return _aiLimiter;
}
