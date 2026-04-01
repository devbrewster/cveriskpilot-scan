// @cveriskpilot/billing — plan-gated feature checks

import type { GateResult } from './types';
import { checkUploadLimit, checkAiLimit, checkUserLimit, checkAssetLimit } from './usage';
import { getEntitlements } from './config';

// ---------------------------------------------------------------------------
// Tier hierarchy helpers
// ---------------------------------------------------------------------------

const TIER_RANK: Record<string, number> = {
  FREE: 0,
  FOUNDERS_BETA: 1,
  PRO: 1,
  ENTERPRISE: 2,
  MSSP: 3,
};

function tierRank(tier: string): number {
  return TIER_RANK[tier.toUpperCase()] ?? 0;
}

function isAtLeast(tier: string, minTier: string): boolean {
  return tierRank(tier) >= tierRank(minTier);
}

// ---------------------------------------------------------------------------
// Feature gate definitions
// ---------------------------------------------------------------------------

type GateChecker = (
  orgId: string,
  tier: string,
  currentCount?: number,
) => Promise<GateResult>;

const FEATURE_GATES: Record<string, GateChecker> = {
  upload: async (orgId, tier) => {
    const result = await checkUploadLimit(orgId, tier);
    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      reason: `Monthly upload limit reached (${result.current}/${result.limit})`,
      upgradeRequired: tier === 'FREE' ? 'PRO' : 'ENTERPRISE',
    };
  },

  ai_remediation: async (orgId, tier) => {
    const result = await checkAiLimit(orgId, tier);
    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      reason: `Monthly AI call limit reached (${result.current}/${result.limit})`,
      upgradeRequired: tier === 'FREE' ? 'PRO' : 'ENTERPRISE',
    };
  },

  add_user: async (orgId, tier, currentCount) => {
    const result = await checkUserLimit(orgId, tier, currentCount ?? 0);
    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      reason: `User limit reached (${result.current}/${result.limit})`,
      upgradeRequired: tier === 'FREE' ? 'PRO' : 'ENTERPRISE',
    };
  },

  add_asset: async (orgId, tier, currentCount) => {
    const result = await checkAssetLimit(orgId, tier, currentCount ?? 0);
    if (result.allowed) return { allowed: true };
    return {
      allowed: false,
      reason: `Asset limit reached (${result.current}/${result.limit})`,
      upgradeRequired: tier === 'FREE' ? 'PRO' : 'ENTERPRISE',
    };
  },

  sso: async (_orgId, tier) => {
    if (isAtLeast(tier, 'ENTERPRISE')) return { allowed: true };
    return {
      allowed: false,
      reason: 'SSO requires an Enterprise or MSSP plan',
      upgradeRequired: 'ENTERPRISE',
    };
  },

  multi_client: async (_orgId, tier) => {
    if (isAtLeast(tier, 'ENTERPRISE')) return { allowed: true };
    return {
      allowed: false,
      reason: 'Multi-client management requires an Enterprise or MSSP plan',
      upgradeRequired: 'ENTERPRISE',
    };
  },

  api_access: async (_orgId, tier) => {
    if (isAtLeast(tier, 'PRO')) return { allowed: true };
    return {
      allowed: false,
      reason: 'API access requires a Pro plan or higher',
      upgradeRequired: 'PRO',
    };
  },

  scheduled_reports: async (_orgId, tier) => {
    if (isAtLeast(tier, 'PRO')) return { allowed: true };
    return {
      allowed: false,
      reason: 'Scheduled reports require a Pro plan or higher',
      upgradeRequired: 'PRO',
    };
  },

  custom_sla: async (_orgId, tier) => {
    if (isAtLeast(tier, 'ENTERPRISE')) return { allowed: true };
    return {
      allowed: false,
      reason: 'Custom SLA configuration requires an Enterprise or MSSP plan',
      upgradeRequired: 'ENTERPRISE',
    };
  },
};

// ---------------------------------------------------------------------------
// Framework-specific gate
// ---------------------------------------------------------------------------

/**
 * Check if a specific compliance framework is available for the given tier.
 * Returns the list of allowed framework IDs for the tier.
 */
export function getAllowedFrameworks(tier: string): readonly string[] | 'all' {
  const entitlements = getEntitlements(tier);
  return entitlements.allowedFrameworks ?? [];
}

/**
 * Check if a specific framework ID is allowed for the given tier.
 */
export function isFrameworkAllowed(tier: string, frameworkId: string): boolean {
  const allowed = getAllowedFrameworks(tier);
  if (allowed === 'all') return true;
  return allowed.includes(frameworkId);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a feature is available for the given org and tier.
 */
export async function checkFeatureGate(
  orgId: string,
  tier: string,
  feature: string,
  currentCount?: number,
): Promise<GateResult> {
  const checker = FEATURE_GATES[feature];
  if (!checker) {
    return { allowed: false, reason: `Unknown feature: ${feature}` };
  }
  return checker(orgId, tier, currentCount);
}

/**
 * Throws an error if the feature is not available for the org's tier.
 */
export async function requireFeature(
  orgId: string,
  tier: string,
  feature: string,
  currentCount?: number,
): Promise<void> {
  const result = await checkFeatureGate(orgId, tier, feature, currentCount);
  if (!result.allowed) {
    const err = new Error(result.reason ?? 'Feature not available on your current plan');
    (err as Error & { upgradeRequired?: string }).upgradeRequired = result.upgradeRequired;
    throw err;
  }
}
