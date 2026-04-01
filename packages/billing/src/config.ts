// @cveriskpilot/billing — tier configuration and entitlements

import type { TierEntitlements, TierConfig } from './types';

export const TIER_ENTITLEMENTS = {
  FREE: {
    max_users: 1,
    max_assets: 50,
    max_monthly_uploads: 3,
    max_ai_calls: 50,
    api_rate_limit: 60,       // 60 req/min
    features: ['api_access'],
    allowedFrameworks: ['nist-800-53', 'soc2-type2', 'cmmc-level2', 'fedramp-moderate', 'owasp-asvs', 'nist-ssdf'],
  },
  FOUNDERS_BETA: {
    max_users: 5,
    max_assets: 250,
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 250,
    api_rate_limit: 200,      // 200 req/min
    features: ['api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view'],
    allowedFrameworks: [
      'nist-800-53', 'soc2-type2', 'cmmc-level2', 'fedramp-moderate', 'owasp-asvs', 'nist-ssdf',
      'gdpr', 'hipaa', 'pci-dss', 'iso-27001',
    ],
  },
  PRO: {
    max_users: 10,
    max_assets: 1000,
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 1000,
    api_rate_limit: 500,      // 500 req/min
    features: ['api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view', 'scheduled_reports'],
    allowedFrameworks: [
      'nist-800-53', 'soc2-type2', 'cmmc-level2', 'fedramp-moderate', 'owasp-asvs', 'nist-ssdf',
      'gdpr', 'hipaa', 'pci-dss', 'iso-27001',
    ],
  },
  ENTERPRISE: {
    max_users: 'unlimited',
    max_assets: 'unlimited',
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 'unlimited',
    api_rate_limit: 2000,     // 2,000 req/min
    features: [
      'api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view',
      'scheduled_reports', 'sso', 'custom_parsers', 'multi_client',
    ],
    allowedFrameworks: 'all',
  },
  MSSP: {
    max_users: 'unlimited',
    max_assets: 'unlimited',
    max_monthly_uploads: 'unlimited',
    max_ai_calls: 'unlimited',
    api_rate_limit: 'unlimited',
    features: [
      'api_access', 'jira_sync', 'custom_sla', 'webhooks', 'portfolio_view',
      'scheduled_reports', 'sso', 'custom_parsers', 'multi_client', 'white_label',
    ],
    allowedFrameworks: 'all',
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
    monthlyPrice: 149,
    annualPrice: 1428, // ~$119/mo — 20% off
    description: 'Full compliance automation for teams preparing for SOC 2 or CMMC.',
    entitlements: TIER_ENTITLEMENTS.PRO,
    isPublic: true,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    monthlyPrice: -1,  // custom pricing — contact sales
    annualPrice: -1,
    description: 'Enterprise compliance automation with SSO, SCIM, and custom policies.',
    entitlements: TIER_ENTITLEMENTS.ENTERPRISE,
    isPublic: true,
    isContactSales: true,
  },
  MSSP: {
    name: 'MSSP',
    tier: 'MSSP',
    monthlyPrice: -1,  // custom pricing — contact sales
    annualPrice: -1,
    description: 'Multi-tenant compliance platform for managed security providers.',
    entitlements: TIER_ENTITLEMENTS.MSSP,
    isPublic: true,
    isContactSales: true,
    hasUsageBilling: true,
  },
};

/**
 * Stripe price IDs read from environment variables.
 */
export const STRIPE_PRICES = {
  PRO_MONTHLY: () => process.env.STRIPE_PRICE_PRO_MONTHLY || null,
  PRO_ANNUAL: () => process.env.STRIPE_PRICE_PRO_ANNUAL || null,
  FOUNDERS_BETA_MONTHLY: () => process.env.STRIPE_PRICE_FOUNDERS_BETA_MONTHLY || null,
  FOUNDERS_BETA_ANNUAL: () => process.env.STRIPE_PRICE_FOUNDERS_BETA_ANNUAL || null,
  ENTERPRISE_MONTHLY: () => process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null,
  ENTERPRISE_ANNUAL: () => process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || null,
  MSSP_MONTHLY: () => process.env.STRIPE_PRICE_MSSP_MONTHLY || null,
  MSSP_ANNUAL: () => process.env.STRIPE_PRICE_MSSP_ANNUAL || null,
  MSSP_METERED: () => process.env.STRIPE_PRICE_MSSP_METERED || null,
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
  const mappings: Array<{ getter: () => string | null; tier: string }> = [
    { getter: STRIPE_PRICES.FOUNDERS_BETA_MONTHLY, tier: 'FOUNDERS_BETA' },
    { getter: STRIPE_PRICES.FOUNDERS_BETA_ANNUAL, tier: 'FOUNDERS_BETA' },
    { getter: STRIPE_PRICES.PRO_MONTHLY, tier: 'PRO' },
    { getter: STRIPE_PRICES.PRO_ANNUAL, tier: 'PRO' },
    { getter: STRIPE_PRICES.ENTERPRISE_MONTHLY, tier: 'ENTERPRISE' },
    { getter: STRIPE_PRICES.ENTERPRISE_ANNUAL, tier: 'ENTERPRISE' },
    { getter: STRIPE_PRICES.MSSP_MONTHLY, tier: 'MSSP' },
    { getter: STRIPE_PRICES.MSSP_ANNUAL, tier: 'MSSP' },
    { getter: STRIPE_PRICES.MSSP_METERED, tier: 'MSSP' },
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
