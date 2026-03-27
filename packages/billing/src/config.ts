// @cveriskpilot/billing — tier configuration and entitlements

import type { TierEntitlements, TierConfig } from './types';

export const TIER_ENTITLEMENTS = {
  FREE: {
    max_users: 1,
    max_assets: 50,
    max_monthly_uploads: 3,
    max_ai_calls: 50,
    features: ['api_access'],
  },
  FOUNDERS_BETA: {
    max_users: 5,
    max_assets: 250,
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 250,
    features: ['api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view'],
  },
  PRO: {
    max_users: 10,
    max_assets: 500,
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 500,
    features: ['api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view', 'scheduled_reports'],
  },
  ENTERPRISE: {
    max_users: 50,
    max_assets: 5000,
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 5000,
    features: [
      'api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view',
      'scheduled_reports', 'sso', 'custom_parsers', 'multi_client',
    ],
  },
  MSSP: {
    max_users: 'unlimited',
    max_assets: 'unlimited',
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 'unlimited',
    features: [
      'api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view',
      'scheduled_reports', 'sso', 'custom_parsers', 'multi_client', 'white_label',
    ],
  },
} as const satisfies Record<string, TierEntitlements>;

export type TierName = keyof typeof TIER_ENTITLEMENTS;

/**
 * Complete tier configuration with pricing and metadata.
 */
export const TIER_CONFIGS: Record<TierName, TierConfig> = {
  FREE: {
    name: 'Free',
    tier: 'FREE',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'For individual security researchers getting started.',
    entitlements: TIER_ENTITLEMENTS.FREE,
    isPublic: true,
  },
  FOUNDERS_BETA: {
    name: 'Founders Beta',
    tier: 'FOUNDERS_BETA',
    monthlyPrice: 29,
    annualPrice: 278, // ~$23.17/mo — 20% off
    description: 'Early adopter pricing. Locked in forever.',
    entitlements: TIER_ENTITLEMENTS.FOUNDERS_BETA,
    isPublic: false, // invite-only
    badge: 'Limited',
  },
  PRO: {
    name: 'Pro',
    tier: 'PRO',
    monthlyPrice: 49,
    annualPrice: 470, // ~$39.17/mo — 20% off
    description: 'For security teams that need full coverage.',
    entitlements: TIER_ENTITLEMENTS.PRO,
    isPublic: true,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    monthlyPrice: 199,
    annualPrice: 1910, // ~$159.17/mo — 20% off
    description: 'For organizations with advanced security needs.',
    entitlements: TIER_ENTITLEMENTS.ENTERPRISE,
    isPublic: true,
  },
  MSSP: {
    name: 'MSSP',
    tier: 'MSSP',
    monthlyPrice: 499,
    annualPrice: 4790, // ~$399.17/mo — 20% off
    description: 'Multi-tenant managed security service provider.',
    entitlements: TIER_ENTITLEMENTS.MSSP,
    isPublic: true,
    hasUsageBilling: true,
  },
};

/**
 * Stripe price IDs read from environment variables.
 */
export const STRIPE_PRICES = {
  PRO_MONTHLY: () => process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
  PRO_ANNUAL: () => process.env.STRIPE_PRICE_PRO_ANNUAL ?? '',
  FOUNDERS_BETA_MONTHLY: () => process.env.STRIPE_PRICE_FOUNDERS_MONTHLY ?? '',
  FOUNDERS_BETA_ANNUAL: () => process.env.STRIPE_PRICE_FOUNDERS_ANNUAL ?? '',
  ENTERPRISE_MONTHLY: () => process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? '',
  ENTERPRISE_ANNUAL: () => process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? '',
  MSSP_MONTHLY: () => process.env.STRIPE_PRICE_MSSP_MONTHLY ?? '',
  MSSP_ANNUAL: () => process.env.STRIPE_PRICE_MSSP_ANNUAL ?? '',
  MSSP_METERED: () => process.env.STRIPE_PRICE_MSSP_METERED ?? '',
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
 * Returns the full tier config for a given tier name.
 */
export function getTierConfig(tier: string): TierConfig | null {
  const key = tier.toUpperCase() as TierName;
  return TIER_CONFIGS[key] ?? null;
}

/**
 * Maps a Stripe price ID back to its tier name.
 * Returns null if the price ID is not recognized.
 */
export function getTierFromPriceId(priceId: string): string | null {
  const mappings: Array<{ getter: () => string; tier: string }> = [
    { getter: STRIPE_PRICES.FOUNDERS_BETA_MONTHLY, tier: 'FOUNDERS_BETA' },
    { getter: STRIPE_PRICES.FOUNDERS_BETA_ANNUAL, tier: 'FOUNDERS_BETA' },
    { getter: STRIPE_PRICES.PRO_MONTHLY, tier: 'PRO' },
    { getter: STRIPE_PRICES.PRO_ANNUAL, tier: 'PRO' },
    { getter: STRIPE_PRICES.ENTERPRISE_MONTHLY, tier: 'ENTERPRISE' },
    { getter: STRIPE_PRICES.ENTERPRISE_ANNUAL, tier: 'ENTERPRISE' },
    { getter: STRIPE_PRICES.MSSP_MONTHLY, tier: 'MSSP' },
    { getter: STRIPE_PRICES.MSSP_ANNUAL, tier: 'MSSP' },
  ];

  for (const { getter, tier } of mappings) {
    const id = getter();
    if (id && priceId === id) return tier;
  }

  return null;
}

/**
 * Get all public tiers for display purposes.
 */
export function getPublicTiers(): TierConfig[] {
  return Object.values(TIER_CONFIGS).filter((t) => t.isPublic);
}
