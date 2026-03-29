// ---------------------------------------------------------------------------
// AI Package — Redis-based Rate Limiting
// ---------------------------------------------------------------------------

import Redis from 'ioredis';
import { AI_TIER_LIMITS } from './types';
import type { RateLimitResult, AiUsageStats } from './types';
import { createLogger } from '@cveriskpilot/shared';

const logger = createLogger('ai:rate-limit');

// ---------------------------------------------------------------------------
// Redis singleton
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env['REDIS_URL'];
  if (!url) {
    logger.warn('REDIS_URL not set — AI rate limiting disabled (fail-open)');
    return null;
  }

  _redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });
  return _redis;
}

/**
 * Reset the Redis singleton (useful for testing).
 */
export function resetRedis(): void {
  _redis = null;
}

/**
 * Inject a Redis instance (useful for testing with mocks).
 */
export function setRedisInstance(redis: Redis): void {
  _redis = redis;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayKey(orgId: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `ai:usage:${orgId}:${date}`;
}

function secondsUntilMidnightUtc(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0,
  ));
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

function midnightUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0,
  ));
}

function getLimitForTier(tier: string): number {
  return AI_TIER_LIMITS[tier.toUpperCase()] ?? AI_TIER_LIMITS['FREE']!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether an organization is allowed to make another AI call.
 * Fails open (allows request) if Redis is unavailable.
 */
export async function checkAiRateLimit(
  orgId: string,
  tier: string,
): Promise<RateLimitResult> {
  const limit = getLimitForTier(tier);

  try {
    const redis = getRedis();
    if (!redis) {
      return { allowed: true, remaining: limit, limit, resetAt: midnightUtc() };
    }

    const key = todayKey(orgId);
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    return {
      allowed: current < limit,
      remaining: Math.max(0, limit - current),
      limit,
      resetAt: midnightUtc(),
    };
  } catch (err) {
    logger.warn('Redis error in checkAiRateLimit — failing open', { error: String(err), orgId });
    return { allowed: true, remaining: limit, limit, resetAt: midnightUtc() };
  }
}

/**
 * Increment the daily AI usage counter for an organization.
 * Returns the new count. Returns 0 if Redis is unavailable.
 */
export async function incrementAiUsage(orgId: string): Promise<number> {
  try {
    const redis = getRedis();
    if (!redis) return 0;

    const key = todayKey(orgId);
    const ttl = secondsUntilMidnightUtc();

    const newCount = await redis.incr(key);
    // Set expiry only on first increment (when count becomes 1)
    if (newCount === 1) {
      await redis.expire(key, ttl);
    }

    return newCount;
  } catch (err) {
    logger.warn('Redis error in incrementAiUsage — skipping increment', { error: String(err), orgId });
    return 0;
  }
}

/**
 * Get current AI usage stats for an organization.
 * Returns zero usage if Redis is unavailable.
 */
export async function getAiUsage(
  orgId: string,
  tier = 'FREE',
): Promise<AiUsageStats> {
  const limit = getLimitForTier(tier);

  try {
    const redis = getRedis();
    if (!redis) {
      return { used: 0, limit, resetAt: midnightUtc() };
    }

    const key = todayKey(orgId);
    const currentStr = await redis.get(key);
    const used = currentStr ? parseInt(currentStr, 10) : 0;

    return { used, limit, resetAt: midnightUtc() };
  } catch (err) {
    logger.warn('Redis error in getAiUsage — returning zero usage', { error: String(err), orgId });
    return { used: 0, limit, resetAt: midnightUtc() };
  }
}
