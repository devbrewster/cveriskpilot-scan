/**
 * Feature flags for tier-based gating.
 * Tier defaults + per-org entitlement overrides.
 */

export enum FeatureFlag {
  SSO = 'SSO',
  JIRA_SYNC = 'JIRA_SYNC',
  CUSTOM_SLA = 'CUSTOM_SLA',
  PORTFOLIO_VIEW = 'PORTFOLIO_VIEW',
  WEBHOOKS = 'WEBHOOKS',
  API_ACCESS = 'API_ACCESS',
  CUSTOM_PARSERS = 'CUSTOM_PARSERS',
  WHITE_LABEL = 'WHITE_LABEL',
}

export type Tier = 'FREE' | 'FOUNDERS_BETA' | 'PRO' | 'ENTERPRISE' | 'MSSP';

/** Default feature availability per tier */
const TIER_DEFAULTS: Record<Tier, Set<FeatureFlag>> = {
  FREE: new Set([
    FeatureFlag.API_ACCESS,
  ]),
  FOUNDERS_BETA: new Set([
    FeatureFlag.API_ACCESS,
    FeatureFlag.JIRA_SYNC,
    FeatureFlag.CUSTOM_SLA,
    FeatureFlag.WEBHOOKS,
    FeatureFlag.PORTFOLIO_VIEW,
  ]),
  PRO: new Set([
    FeatureFlag.API_ACCESS,
    FeatureFlag.JIRA_SYNC,
    FeatureFlag.CUSTOM_SLA,
    FeatureFlag.WEBHOOKS,
    FeatureFlag.PORTFOLIO_VIEW,
  ]),
  ENTERPRISE: new Set([
    FeatureFlag.API_ACCESS,
    FeatureFlag.JIRA_SYNC,
    FeatureFlag.CUSTOM_SLA,
    FeatureFlag.WEBHOOKS,
    FeatureFlag.PORTFOLIO_VIEW,
    FeatureFlag.SSO,
    FeatureFlag.CUSTOM_PARSERS,
  ]),
  MSSP: new Set([
    FeatureFlag.API_ACCESS,
    FeatureFlag.JIRA_SYNC,
    FeatureFlag.CUSTOM_SLA,
    FeatureFlag.WEBHOOKS,
    FeatureFlag.PORTFOLIO_VIEW,
    FeatureFlag.SSO,
    FeatureFlag.CUSTOM_PARSERS,
    FeatureFlag.WHITE_LABEL,
  ]),
};

/**
 * Entitlements JSON stored on Organization.entitlements:
 * { "enabledFeatures": ["SSO"], "disabledFeatures": ["WEBHOOKS"] }
 */
interface OrgEntitlements {
  enabledFeatures?: string[];
  disabledFeatures?: string[];
}

/** Platform admin emails — read from PLATFORM_ADMIN_EMAILS env var (comma-separated) */
const PLATFORM_ADMIN_EMAILS: Set<string> = new Set(
  (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean),
);

/**
 * Check if a feature is enabled for a given tier + optional org overrides.
 * Founder emails bypass all tier restrictions.
 */
export function isFeatureEnabled(
  tier: Tier,
  flag: FeatureFlag,
  entitlements?: OrgEntitlements | null,
  email?: string | null,
): boolean {
  // Platform admins get everything
  if (email && PLATFORM_ADMIN_EMAILS.has(email.toLowerCase().trim())) return true;

  // Per-org overrides take precedence
  if (entitlements?.enabledFeatures?.includes(flag)) return true;
  if (entitlements?.disabledFeatures?.includes(flag)) return false;

  // Fall back to tier defaults
  return TIER_DEFAULTS[tier]?.has(flag) ?? false;
}

/** Get all enabled features for a tier + org entitlements */
export function getEnabledFeatures(
  tier: Tier,
  entitlements?: OrgEntitlements | null,
  email?: string | null,
): FeatureFlag[] {
  const allFlags = Object.values(FeatureFlag);
  return allFlags.filter((flag) => isFeatureEnabled(tier, flag, entitlements, email));
}

/** Human-readable labels */
export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  [FeatureFlag.SSO]: 'Single Sign-On (SSO)',
  [FeatureFlag.JIRA_SYNC]: 'Jira Integration',
  [FeatureFlag.CUSTOM_SLA]: 'Custom SLA Policies',
  [FeatureFlag.PORTFOLIO_VIEW]: 'Portfolio Dashboard',
  [FeatureFlag.WEBHOOKS]: 'Webhooks',
  [FeatureFlag.API_ACCESS]: 'API Access',
  [FeatureFlag.CUSTOM_PARSERS]: 'Custom Parsers',
  [FeatureFlag.WHITE_LABEL]: 'White Labeling',
};

/** Minimum tier required for each feature (for upgrade prompts) */
export const FEATURE_MIN_TIER: Record<FeatureFlag, Tier> = {
  [FeatureFlag.API_ACCESS]: 'FREE',
  [FeatureFlag.JIRA_SYNC]: 'PRO',
  [FeatureFlag.CUSTOM_SLA]: 'PRO',
  [FeatureFlag.PORTFOLIO_VIEW]: 'PRO',
  [FeatureFlag.WEBHOOKS]: 'PRO',
  [FeatureFlag.SSO]: 'ENTERPRISE',
  [FeatureFlag.CUSTOM_PARSERS]: 'ENTERPRISE',
  [FeatureFlag.WHITE_LABEL]: 'MSSP',
};
