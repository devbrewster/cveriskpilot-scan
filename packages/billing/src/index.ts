// @cveriskpilot/billing — barrel export

export type {
  TierEntitlements,
  CheckoutParams,
  SubscriptionStatus,
  UsageLimitResult,
  UsageSummary,
  GateResult,
} from './types.js';

export {
  TIER_ENTITLEMENTS,
  STRIPE_PRICES,
  getEntitlements,
  getTierFromPriceId,
} from './config.js';

export {
  createCheckoutSession,
  createCustomerPortalSession,
} from './checkout.js';

export {
  verifyWebhookSignature,
  handleWebhookEvent,
} from './webhooks.js';

export {
  getSubscriptionStatus,
  cancelSubscription,
  reactivateSubscription,
} from './portal.js';

export {
  checkUploadLimit,
  incrementUploadCount,
  checkAiLimit,
  incrementAiCount,
  checkUserLimit,
  checkAssetLimit,
  getUsageSummary,
} from './usage.js';

export {
  checkFeatureGate,
  requireFeature,
} from './gate.js';
