// @cveriskpilot/billing — shared type definitions

export interface TierEntitlements {
  max_users: number | 'unlimited';
  max_assets: number | 'unlimited';
  max_monthly_uploads: number | 'unlimited';
  max_ai_calls: number | 'unlimited';
  /** API requests per minute per org */
  api_rate_limit: number | 'unlimited';
  features?: readonly string[];
  /** Framework IDs available for detailed compliance output. 'all' = unlimited. */
  allowedFrameworks?: readonly string[] | 'all';
}

export interface TierConfig {
  name: string;
  tier: string;
  /** Monthly price in USD. -1 means custom/contact-sales pricing. */
  monthlyPrice: number;
  /** Annual price in USD. -1 means custom/contact-sales pricing. */
  annualPrice: number;
  description: string;
  entitlements: TierEntitlements;
  isPublic: boolean;
  badge?: string;
  hasUsageBilling?: boolean;
  /** If true, pricing is negotiated per-deal (Enterprise, MSSP). */
  isContactSales?: boolean;
}

export interface CheckoutParams {
  organizationId: string;
  email: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface SubscriptionStatus {
  tier: string;
  isActive: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  usage: {
    uploads: number;
    aiCalls: number;
  };
}

export interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
}

export interface UsageSummary {
  uploads: UsageLimitResult;
  aiCalls: UsageLimitResult;
  users: UsageLimitResult;
  assets: UsageLimitResult;
}

export interface GateResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: string;
}

// ---------------------------------------------------------------------------
// Metering types (per-client usage tracking)
// ---------------------------------------------------------------------------

export type UsageMetric =
  | 'assets_scanned'
  | 'findings_processed'
  | 'ai_calls'
  | 'storage_gb';

export interface UsageEvent {
  id?: string;
  orgId: string;
  clientId: string;
  metric: UsageMetric;
  quantity: number;
  timestamp: Date;
}

export interface ClientUsage {
  clientId: string;
  clientName?: string;
  period: string;
  metrics: Record<UsageMetric, number>;
}

export interface OrgUsageSummary {
  orgId: string;
  period: string;
  totals: Record<UsageMetric, number>;
  clients: ClientUsage[];
}

export interface UsageCostEstimate {
  baseCost: number;
  meteredCost: number;
  totalEstimated: number;
  breakdown: Record<UsageMetric, { quantity: number; unitCost: number; cost: number }>;
}

// ---------------------------------------------------------------------------
// Upgrade / downgrade
// ---------------------------------------------------------------------------

export interface UpgradeRequest {
  organizationId: string;
  targetTier: string;
  billingInterval: 'monthly' | 'annual';
}

export interface UpgradeResult {
  checkoutUrl?: string;
  tier: string;
  message: string;
}
