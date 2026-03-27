// @cveriskpilot/residency — shared type definitions

/** Supported GCP regions for data residency. */
export type DataRegion =
  | 'us-east1'
  | 'us-central1'
  | 'us-west1'
  | 'europe-west1'
  | 'europe-west3'
  | 'asia-southeast1'
  | 'asia-northeast1'
  | 'australia-southeast1';

/** Resource types that are subject to residency constraints. */
export type ResidencyResource = 'database' | 'storage' | 'kms' | 'backup' | 'logs';

/** Policy defining which resources must remain in which regions. */
export interface ResidencyPolicy {
  /** Primary region for all tenant data */
  primaryRegion: DataRegion;
  /** Optional failover region */
  failoverRegion: DataRegion | null;
  /** Resources that must strictly remain in the primary region */
  restrictedResources: ResidencyResource[];
  /** Compliance framework driving this policy (e.g. GDPR, SOC2) */
  complianceFramework: string | null;
  /** Whether cross-region replication is allowed */
  allowCrossRegionReplication: boolean;
}

/** Tenant-to-region placement record. */
export interface TenantPlacement {
  tenantId: string;
  region: DataRegion;
  policy: ResidencyPolicy;
  /** ISO timestamp when placement was created */
  createdAt: string;
  /** ISO timestamp when placement was last updated */
  updatedAt: string;
  /** Current migration status, null if not migrating */
  migrationStatus: MigrationStatus | null;
}

/** Status of a cross-region migration. */
export interface MigrationStatus {
  fromRegion: DataRegion;
  toRegion: DataRegion;
  state: 'pending' | 'in_progress' | 'validating' | 'completed' | 'failed' | 'rolled_back';
  /** ISO timestamp when migration started */
  startedAt: string;
  /** ISO timestamp when migration completed or failed */
  completedAt: string | null;
  /** Progress percentage 0-100 */
  progressPercent: number;
  /** Error message if failed */
  error: string | null;
}

/** Regional infrastructure endpoints. */
export interface RegionalEndpoints {
  region: DataRegion;
  databaseHost: string;
  databasePort: number;
  gcsEndpoint: string;
  gcsBucket: string;
  kmsKeyRing: string;
  kmsLocation: string;
}

/** Full regional infrastructure configuration. */
export interface RegionalConfig {
  region: DataRegion;
  displayName: string;
  endpoints: RegionalEndpoints;
  available: boolean;
  /** Supported compliance frameworks in this region */
  complianceFrameworks: string[];
}
