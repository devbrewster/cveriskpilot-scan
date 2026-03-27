// @cveriskpilot/billing — tier configuration and entitlements

import type { TierEntitlements } from './types.js';

export const TIER_ENTITLEMENTS = {
  FREE: {
    max_users: 1,
    max_assets: 50,
    max_monthly_uploads: 3,
    max_ai_calls: 50,
  },
  PRO: {
    max_users: 10,
    max_assets: 500,
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 500,
  },
  ENTERPRISE: {
    max_users: 50,
    max_assets: 5000,
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 5000,
  },
  MSSP: {
    max_users: 200,
    max_assets: 'unlimited',
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 10000,
  },
} as const satisfies Record<string, TierEntitlements>;

export type TierName = keyof typeof TIER_ENTITLEMENTS;

/**
 * Stripe price IDs read from environment variables.
 * Only PRO prices are needed for MVP (Free has no Stripe price).
 */
export const STRIPE_PRICES = {
  PRO_MONTHLY: () => process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  PRO_ANNUAL: () => process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
} as const;

/**
 * Returns the entitlements for a given tier.
 * Falls back to FREE if the tier is unknown.
 */
export function getEntitlements(tier: string): TierEntitlements {
  const key = tier.toUpperCase() as TierName;
  return TIER_ENTITLEMENTS[key] ?? TIER_ENTITLEMENTS.FREE;
}

/**
 * Maps a Stripe price ID back to its tier name.
 * Returns null if the price ID is not recognized.
 */
export function getTierFromPriceId(priceId: string): string | null {
  const proMonthly = STRIPE_PRICES.PRO_MONTHLY();
  const proAnnual = STRIPE_PRICES.PRO_ANNUAL();

  if (proMonthly && priceId === proMonthly) return 'PRO';
  if (proAnnual && priceId === proAnnual) return 'PRO';

  // Future: add ENTERPRISE / MSSP price mappings here
  return null;
}
