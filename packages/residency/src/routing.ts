// @cveriskpilot/residency — regional routing

import type { DataRegion, RegionalConfig, RegionalEndpoints } from './types';
import type { PlacementStore } from './placement';
import { InMemoryPlacementStore, PlacementService } from './placement';

// ---------------------------------------------------------------------------
// Regional configuration registry
// ---------------------------------------------------------------------------

const REGIONAL_CONFIGS: Record<DataRegion, RegionalConfig> = {
  'us-east1': {
    region: 'us-east1',
    displayName: 'US East (South Carolina)',
    endpoints: {
      region: 'us-east1',
      databaseHost: 'db-us-east1.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-us-east1',
      kmsKeyRing: 'cveriskpilot-us-east1',
      kmsLocation: 'us-east1',
    },
    available: true,
    complianceFrameworks: ['SOC2', 'HIPAA', 'FedRAMP'],
  },
  'us-central1': {
    region: 'us-central1',
    displayName: 'US Central (Iowa)',
    endpoints: {
      region: 'us-central1',
      databaseHost: 'db-us-central1.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-us-central1',
      kmsKeyRing: 'cveriskpilot-us-central1',
      kmsLocation: 'us-central1',
    },
    available: true,
    complianceFrameworks: ['SOC2', 'HIPAA'],
  },
  'us-west1': {
    region: 'us-west1',
    displayName: 'US West (Oregon)',
    endpoints: {
      region: 'us-west1',
      databaseHost: 'db-us-west1.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-us-west1',
      kmsKeyRing: 'cveriskpilot-us-west1',
      kmsLocation: 'us-west1',
    },
    available: true,
    complianceFrameworks: ['SOC2'],
  },
  'europe-west1': {
    region: 'europe-west1',
    displayName: 'Europe West (Belgium)',
    endpoints: {
      region: 'europe-west1',
      databaseHost: 'db-europe-west1.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-europe-west1',
      kmsKeyRing: 'cveriskpilot-europe-west1',
      kmsLocation: 'europe-west1',
    },
    available: true,
    complianceFrameworks: ['SOC2', 'GDPR'],
  },
  'europe-west3': {
    region: 'europe-west3',
    displayName: 'Europe West (Frankfurt)',
    endpoints: {
      region: 'europe-west3',
      databaseHost: 'db-europe-west3.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-europe-west3',
      kmsKeyRing: 'cveriskpilot-europe-west3',
      kmsLocation: 'europe-west3',
    },
    available: true,
    complianceFrameworks: ['SOC2', 'GDPR', 'BSI'],
  },
  'asia-southeast1': {
    region: 'asia-southeast1',
    displayName: 'Asia Southeast (Singapore)',
    endpoints: {
      region: 'asia-southeast1',
      databaseHost: 'db-asia-southeast1.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-asia-southeast1',
      kmsKeyRing: 'cveriskpilot-asia-southeast1',
      kmsLocation: 'asia-southeast1',
    },
    available: true,
    complianceFrameworks: ['SOC2', 'PDPA'],
  },
  'asia-northeast1': {
    region: 'asia-northeast1',
    displayName: 'Asia Northeast (Tokyo)',
    endpoints: {
      region: 'asia-northeast1',
      databaseHost: 'db-asia-northeast1.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-asia-northeast1',
      kmsKeyRing: 'cveriskpilot-asia-northeast1',
      kmsLocation: 'asia-northeast1',
    },
    available: true,
    complianceFrameworks: ['SOC2', 'APPI'],
  },
  'australia-southeast1': {
    region: 'australia-southeast1',
    displayName: 'Australia Southeast (Sydney)',
    endpoints: {
      region: 'australia-southeast1',
      databaseHost: 'db-australia-southeast1.cveriskpilot.internal',
      databasePort: 5432,
      gcsEndpoint: 'https://storage.googleapis.com',
      gcsBucket: 'cveriskpilot-data-australia-southeast1',
      kmsKeyRing: 'cveriskpilot-australia-southeast1',
      kmsLocation: 'australia-southeast1',
    },
    available: true,
    complianceFrameworks: ['SOC2', 'APPs'],
  },
};

// ---------------------------------------------------------------------------
// RegionalRouter
// ---------------------------------------------------------------------------

export class RegionalRouter {
  private placementService: PlacementService;

  constructor(store?: PlacementStore) {
    const s = store ?? new InMemoryPlacementStore();
    this.placementService = new PlacementService(s);
  }

  /** Construct with an existing PlacementService instance. */
  static withPlacementService(placementService: PlacementService): RegionalRouter {
    const router = Object.create(RegionalRouter.prototype) as RegionalRouter;
    (router as unknown as { placementService: PlacementService }).placementService =
      placementService;
    return router;
  }

  /**
   * Route a tenant to its regional endpoints (DB, GCS, KMS).
   * Returns null if the tenant has no placement or the region is unavailable.
   */
  async routeToRegion(tenantId: string): Promise<RegionalEndpoints | null> {
    const region = await this.placementService.getRegion(tenantId);
    if (!region) return null;

    const config = this.getRegionalConfig(region);
    if (!config || !config.available) return null;

    return config.endpoints;
  }

  /** Get infrastructure configuration for a specific region. */
  getRegionalConfig(region: DataRegion): RegionalConfig | null {
    return REGIONAL_CONFIGS[region] ?? null;
  }

  /** List all available regions. */
  getAvailableRegions(): RegionalConfig[] {
    return Object.values(REGIONAL_CONFIGS).filter((c) => c.available);
  }

  /** Find regions that support a specific compliance framework. */
  getRegionsForCompliance(framework: string): RegionalConfig[] {
    return Object.values(REGIONAL_CONFIGS).filter(
      (c) => c.available && c.complianceFrameworks.includes(framework),
    );
  }
}
