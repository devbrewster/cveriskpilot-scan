// @cveriskpilot/residency — barrel export

export type {
  DataRegion,
  ResidencyResource,
  ResidencyPolicy,
  TenantPlacement,
  MigrationStatus,
  RegionalEndpoints,
  RegionalConfig,
} from './types';

export type { PlacementStore } from './placement';

export { PlacementService, InMemoryPlacementStore } from './placement';

export { RegionalRouter } from './routing';
