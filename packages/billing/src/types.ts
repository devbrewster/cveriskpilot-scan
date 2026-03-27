// @cveriskpilot/billing — shared type definitions

export interface TierEntitlements {
  max_users: number | 'unlimited';
  max_assets: number | 'unlimited';
  max_monthly_uploads: number | 'unlimited';
  max_ai_calls: number | 'unlimited';
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
