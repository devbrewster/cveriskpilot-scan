// @cveriskpilot/billing — per-client usage metering for MSSP tiers

import Stripe from 'stripe';
import Redis from 'ioredis';
import type { UsageMetric, ClientUsage, OrgUsageSummary, UsageCostEstimate } from './types';
import { STRIPE_PRICES, getTierConfig } from './config';

// ---------------------------------------------------------------------------
// Redis connection (shared with usage.ts pattern)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!_redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      return null;
    }
    _redis = new Redis(url);
  }
  return _redis;
}

/** Visible for testing */
export function _setMeteringRedisForTest(redis: Redis | null): void {
  _redis = redis;
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function usageKey(orgId: string, clientId: string, metric: UsageMetric, period: string): string {
  return `metering:${orgId}:${clientId}:${metric}:${period}`;
}

function orgClientsKey(orgId: string, period: string): string {
  return `metering:clients:${orgId}:${period}`;
}

const NINETY_DAYS = 90 * 24 * 60 * 60;

const ALL_METRICS: UsageMetric[] = ['assets_scanned', 'findings_processed', 'ai_calls', 'storage_gb'];

// Per-unit cost for metered MSSP billing (in dollars)
const METERED_UNIT_COSTS: Record<UsageMetric, number> = {
  assets_scanned: 0.10,
  findings_processed: 0.02,
  ai_calls: 0.05,
  storage_gb: 0.50,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a usage event for a specific org/client/metric.
 * Atomically increments the counter in Redis.
 */
export async function recordUsageEvent(
  orgId: string,
  clientId: string,
  metric: UsageMetric,
  quantity: number,
): Promise<number> {
  const redis = getRedis();
  if (!redis) return quantity;
  const period = currentPeriod();
  const key = usageKey(orgId, clientId, metric, period);

  // Increment usage counter
  const newVal = await redis.incrby(key, quantity);

  // Auto-expire after 90 days
  if (newVal === quantity) {
    await redis.expire(key, NINETY_DAYS);
  }

  // Track which clients have usage in this period
  const cKey = orgClientsKey(orgId, period);
  await redis.sadd(cKey, clientId);
  await redis.expire(cKey, NINETY_DAYS);

  return newVal;
}

/**
 * Get usage for a specific client in a given period.
 */
export async function getClientUsage(
  orgId: string,
  clientId: string,
  period?: string,
): Promise<ClientUsage> {
  const redis = getRedis();
  const p = period ?? currentPeriod();

  if (!redis) {
    return {
      clientId,
      period: p,
      metrics: { assets_scanned: 0, findings_processed: 0, ai_calls: 0, storage_gb: 0 },
    };
  }

  const pipeline = redis.pipeline();
  for (const metric of ALL_METRICS) {
    pipeline.get(usageKey(orgId, clientId, metric, p));
  }
  const results = await pipeline.exec();

  const metrics: Record<string, number> = {};
  ALL_METRICS.forEach((metric, i) => {
    const val = results?.[i]?.[1];
    metrics[metric] = Number(val) || 0;
  });

  return {
    clientId,
    period: p,
    metrics: metrics as Record<UsageMetric, number>,
  };
}

/**
 * Get aggregated usage across all clients for an org.
 */
export async function getOrgUsageSummary(
  orgId: string,
  period?: string,
): Promise<OrgUsageSummary> {
  const redis = getRedis();
  const p = period ?? currentPeriod();

  if (!redis) {
    return {
      orgId,
      period: p,
      totals: { assets_scanned: 0, findings_processed: 0, ai_calls: 0, storage_gb: 0 },
      clients: [],
    };
  }

  // Get all clients with usage in this period
  const clientIds = await redis.smembers(orgClientsKey(orgId, p));

  const clients: ClientUsage[] = [];
  const totals: Record<string, number> = {};
  for (const metric of ALL_METRICS) {
    totals[metric] = 0;
  }

  // Fetch usage for each client
  for (const clientId of clientIds) {
    const clientUsage = await getClientUsage(orgId, clientId, p);
    clients.push(clientUsage);

    for (const metric of ALL_METRICS) {
      totals[metric] += clientUsage.metrics[metric];
    }
  }

  return {
    orgId,
    period: p,
    totals: totals as Record<UsageMetric, number>,
    clients,
  };
}

/**
 * Report metered usage to Stripe for MSSP billing.
 * Uses stripe.subscriptionItems.createUsageRecord() for metered line items.
 */
export async function reportUsageToStripe(
  orgId: string,
  subscriptionItemId: string,
  period?: string,
): Promise<{ reported: boolean; totalQuantity: number }> {
  const stripe = getStripe();
  const summary = await getOrgUsageSummary(orgId, period);

  // Calculate total metered units (weighted sum)
  const totalQuantity =
    summary.totals.assets_scanned +
    summary.totals.findings_processed +
    summary.totals.ai_calls +
    summary.totals.storage_gb * 10; // storage_gb weighted more heavily

  if (totalQuantity === 0) {
    return { reported: false, totalQuantity: 0 };
  }

  await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity: Math.ceil(totalQuantity),
    timestamp: Math.floor(Date.now() / 1000),
    action: 'set',
  });

  return { reported: true, totalQuantity };
}

/**
 * Estimate cost for current usage based on tier pricing.
 */
export function estimateUsageCost(
  tier: string,
  totals: Record<UsageMetric, number>,
): UsageCostEstimate {
  const config = getTierConfig(tier);
  const baseCost = config?.monthlyPrice ?? 0;

  let meteredCost = 0;
  const breakdown = {} as Record<UsageMetric, { quantity: number; unitCost: number; cost: number }>;

  for (const metric of ALL_METRICS) {
    const quantity = totals[metric] || 0;
    const unitCost = tier === 'MSSP' ? METERED_UNIT_COSTS[metric] : 0;
    const cost = quantity * unitCost;
    meteredCost += cost;
    breakdown[metric] = { quantity, unitCost, cost };
  }

  return {
    baseCost,
    meteredCost,
    totalEstimated: baseCost + meteredCost,
    breakdown,
  };
}
