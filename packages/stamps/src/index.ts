// @cveriskpilot/stamps — Deployment stamp management for enterprise tenants

export type {
  StampLifecycle,
  StampRegion,
  TenantTier,
  PlacementMode,
  StampResource,
  StampHealthSnapshot,
  StampStatus,
  StampConfig,
  ProvisionStampParams,
  StampPlacement,
} from './types';

export {
  provisionStamp,
  getStamp,
  listStamps,
  transitionStamp,
  assignTenantToStamp,
  removeTenantFromStamp,
} from './provision';

export { StampRouter } from './routing';
export type { PlacementRule } from './routing';

export {
  stampHealthCheck,
  checkAllStampsHealth,
  shouldDrainStamp,
} from './health';
