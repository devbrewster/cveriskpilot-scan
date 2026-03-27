// @cveriskpilot/billing — Redis-based usage tracking and limit enforcement

import Redis from 'ioredis';
import { getEntitlements } from './config';
import type { UsageLimitResult, UsageSummary } from './types';

// Singleton Redis connection (lazy-initialized)
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    _redis = new Redis(url);
  }
  return _redis;
}

/** Visible for testing — replace the Redis instance. */
export function _setRedisForTest(redis: Redis | null): void {
  _redis = redis;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function currentMonthKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function uploadKey(orgId: string): string {
  return `billing:uploads:${orgId}:${currentMonthKey()}`;
}

function aiKey(orgId: string): string {
  return `billing:ai:${orgId}:${currentMonthKey()}`;
}

function assetKey(orgId: string): string {
  return `billing:assets:${orgId}`;
}

function userKey(orgId: string): string {
  return `billing:users:${orgId}`;
}

const SIXTY_DAYS_SECONDS = 60 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Limit-check helper
// ---------------------------------------------------------------------------

function buildResult(
  current: number,
  limit: number | 'unlimited',
): UsageLimitResult {
  if (limit === 'unlimited') {
    return { allowed: true, current, limit, remaining: 'unlimited' };
  }
  const remaining = Math.max(0, limit - current);
  return {
    allowed: current < limit,
    current,
    limit,
    remaining,
  };
}

// ---------------------------------------------------------------------------
// Upload tracking
// ---------------------------------------------------------------------------

export async function checkUploadLimit(
  orgId: string,
  tier: string,
): Promise<UsageLimitResult> {
  const redis = getRedis();
  const current = Number(await redis.get(uploadKey(orgId))) || 0;
  const entitlements = getEntitlements(tier);
  return buildResult(current, entitlements.max_monthly_uploads);
}

export async function incrementUploadCount(orgId: string): Promise<number> {
  const redis = getRedis();
  const key = uploadKey(orgId);
  const val = await redis.incr(key);
  // Set expiry on first increment so historical data auto-cleans
  if (val === 1) {
    await redis.expire(key, SIXTY_DAYS_SECONDS);
  }
  return val;
}

// ---------------------------------------------------------------------------
// AI call tracking
// ---------------------------------------------------------------------------

export async function checkAiLimit(
  orgId: string,
  tier: string,
): Promise<UsageLimitResult> {
  const redis = getRedis();
  const current = Number(await redis.get(aiKey(orgId))) || 0;
  const entitlements = getEntitlements(tier);
  return buildResult(current, entitlements.max_ai_calls);
}

export async function incrementAiCount(orgId: string): Promise<number> {
  const redis = getRedis();
  const key = aiKey(orgId);
  const val = await redis.incr(key);
  if (val === 1) {
    await redis.expire(key, SIXTY_DAYS_SECONDS);
  }
  return val;
}

// ---------------------------------------------------------------------------
// User limit (count-based, not Redis-tracked — passed in)
// ---------------------------------------------------------------------------

export async function checkUserLimit(
  orgId: string,
  tier: string,
  currentCount: number,
): Promise<UsageLimitResult> {
  // orgId reserved for future Redis-backed tracking
  void orgId;
  const entitlements = getEntitlements(tier);
  return buildResult(currentCount, entitlements.max_users);
}

// ---------------------------------------------------------------------------
// Asset limit (count-based, not Redis-tracked — passed in)
// ---------------------------------------------------------------------------

export async function checkAssetLimit(
  orgId: string,
  tier: string,
  currentCount: number,
): Promise<UsageLimitResult> {
  void orgId;
  const entitlements = getEntitlements(tier);
  return buildResult(currentCount, entitlements.max_assets);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export async function getUsageSummary(
  orgId: string,
  tier: string,
): Promise<UsageSummary> {
  const redis = getRedis();
  const [uploadCount, aiCount, assetCount, userCount] = await Promise.all([
    redis.get(uploadKey(orgId)).then((v) => Number(v) || 0),
    redis.get(aiKey(orgId)).then((v) => Number(v) || 0),
    redis.get(assetKey(orgId)).then((v) => Number(v) || 0),
    redis.get(userKey(orgId)).then((v) => Number(v) || 0),
  ]);

  const ent = getEntitlements(tier);
  return {
    uploads: buildResult(uploadCount, ent.max_monthly_uploads),
    aiCalls: buildResult(aiCount, ent.max_ai_calls),
    assets: buildResult(assetCount, ent.max_assets),
    users: buildResult(userCount, ent.max_users),
  };
}
