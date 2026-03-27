// @cveriskpilot/billing — barrel export

export type {
  TierEntitlements,
  TierConfig,
  CheckoutParams,
  SubscriptionStatus,
  UsageLimitResult,
  UsageSummary,
  GateResult,
  UsageMetric,
  UsageEvent,
  ClientUsage,
  OrgUsageSummary,
  UsageCostEstimate,
  UpgradeRequest,
  UpgradeResult,
} from './types';

export {
  TIER_ENTITLEMENTS,
  TIER_CONFIGS,
  STRIPE_PRICES,
  getEntitlements,
  getTierConfig,
  getTierFromPriceId,
  getPublicTiers,
} from './config';

export type { TierName } from './config';

export {
  createCheckoutSession,
  createCustomerPortalSession,
} from './checkout';

export {
  verifyWebhookSignature,
  handleWebhookEvent,
} from './webhooks';

export {
  getSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription,
} from './portal';

export {
  checkUploadLimit,
  incrementUploadCount,
  checkAiLimit,
  incrementAiCount,
  checkUserLimit,
  checkAssetLimit,
  getUsageSummary,
} from './usage';

export {
  checkFeatureGate,
  requireFeature,
} from './gate';

export {
  recordUsageEvent,
  getClientUsage,
  getOrgUsageSummary,
  reportUsageToStripe,
  estimateUsageCost,
} from './metering';
