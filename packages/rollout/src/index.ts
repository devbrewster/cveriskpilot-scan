// @cveriskpilot/rollout — barrel export

export type {
  DeploymentRing,
  RolloutConfig,
  FeatureFlag,
  RingAssignment,
} from './types';

export type { RingStore } from './rings';

export { RingManager, InMemoryRingStore } from './rings';

export { FeatureFlagService } from './feature-flags';

// A/B testing
export type { ABExperiment, ABAssignment, ABExperimentName } from './ab-testing';
export {
  AB_EXPERIMENTS,
  assignVariant,
  assignAllVariants,
  AB_VISITOR_COOKIE,
  AB_VARIANTS_COOKIE,
  generateVisitorId,
  serializeVariants,
  deserializeVariants,
  buildABParam,
} from './ab-testing';
