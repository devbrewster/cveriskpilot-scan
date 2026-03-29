// Billing middleware helpers for API route handlers
// Wires @cveriskpilot/billing gate checks and metering into Next.js routes

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  checkFeatureGate,
  incrementUploadCount,
  incrementAiCount,
  recordUsageEvent,
} from '@cveriskpilot/billing';
import { getTierApiLimiter } from '@cveriskpilot/auth';
import { getEntitlements } from '@cveriskpilot/billing';
import type { GateResult, UsageMetric } from '@cveriskpilot/billing';

// In-memory tier cache: orgId → { tier, expiresAt }
// Avoids a DB round-trip on every API request.
// TTL 60s means tier changes propagate within a minute.
const tierCache = new Map<string, { tier: string; expiresAt: number }>();
const TIER_CACHE_TTL_MS = 60_000;

/**
 * Fetch org tier — cached in-memory (60s TTL) to avoid per-request DB hits.
 */
export async function getOrgTier(orgId: string): Promise<string> {
  const cached = tierCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tier;
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { tier: true },
  });

  tierCache.set(orgId, { tier: org.tier, expiresAt: Date.now() + TIER_CACHE_TTL_MS });
  return org.tier;
}

/**
 * Check a billing gate for an org. Returns the gate result.
 */
export async function checkBillingGate(
  orgId: string,
  tier: string,
  feature: string,
  currentCount?: number,
): Promise<GateResult> {
  return checkFeatureGate(orgId, tier, feature, currentCount);
}

/**
 * Fire-and-forget metered usage recording.
 * Logs to Redis for MSSP billing. Failures are silently caught
 * so metering never blocks API responses.
 */
export function trackUsage(
  orgId: string,
  clientId: string,
  metric: UsageMetric,
  quantity: number,
): void {
  recordUsageEvent(orgId, clientId, metric, quantity).catch((err) => {
    console.warn(`[billing] Failed to record usage event ${metric}:`, err);
  });
}

/**
 * Increment upload counter and record metered usage.
 */
export async function trackUpload(orgId: string, clientId: string): Promise<void> {
  await incrementUploadCount(orgId);
  trackUsage(orgId, clientId, 'assets_scanned', 1);
}

/**
 * Increment AI call counter and record metered usage.
 */
export async function trackAiCall(orgId: string, clientId: string): Promise<void> {
  await incrementAiCount(orgId);
  trackUsage(orgId, clientId, 'ai_calls', 1);
}

// ---------------------------------------------------------------------------
// Tier-aware API rate limiting
// ---------------------------------------------------------------------------

/**
 * Check the tier-aware API rate limit for an organization.
 * Returns a 429 NextResponse if the limit is exceeded, or null if allowed.
 *
 * Rate limits per tier (req/min per org):
 *   FREE=60, FOUNDERS_BETA=200, PRO=500, ENTERPRISE=2000, MSSP=unlimited
 */
export async function checkApiRateLimit(
  organizationId: string,
): Promise<NextResponse | null> {
  try {
    const tier = await getOrgTier(organizationId);
    const limiter = getTierApiLimiter(tier);

    // null = unlimited (MSSP)
    if (!limiter) return null;

    const result = await limiter.check(organizationId);

    if (!result.allowed) {
      const entitlements = getEntitlements(tier);
      const limit = entitlements.api_rate_limit === 'unlimited' ? 0 : entitlements.api_rate_limit;

      return NextResponse.json(
        { error: 'Rate limit exceeded. Upgrade your plan for higher limits.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfter ?? 60),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toISOString(),
          },
        },
      );
    }

    return null;
  } catch {
    // Redis unavailable — don't block requests
    return null;
  }
}
