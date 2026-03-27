// @cveriskpilot/stamps — Type definitions for deployment stamps

/** Lifecycle phases of a deployment stamp */
export type StampLifecycle =
  | 'provisioning'
  | 'active'
  | 'draining'
  | 'decommissioned';

/** Cloud region identifiers */
export type StampRegion =
  | 'us-central1'
  | 'us-east1'
  | 'us-west1'
  | 'europe-west1'
  | 'europe-west3'
  | 'asia-southeast1'
  | 'asia-northeast1';

/** Tenant tier determines stamp placement strategy */
export type TenantTier = 'free' | 'team' | 'business' | 'enterprise';

/** Placement mode — shared pool or dedicated infrastructure */
export type PlacementMode = 'pooled' | 'dedicated';

/**
 * Describes a single resource provisioned within a stamp
 * (Cloud SQL instance, GCS bucket, KMS keyring, etc.)
 */
export interface StampResource {
  /** Globally-unique resource identifier (e.g. GCP resource name) */
  resourceId: string;

  /** Human-readable label */
  name: string;

  /** Resource category */
  kind: 'cloud-sql' | 'gcs-bucket' | 'kms-keyring' | 'vpc-network' | 'cloud-run';

  /** GCP project that owns the resource */
  projectId: string;

  /** Region the resource lives in */
  region: StampRegion;

  /** Current provisioning state */
  status: 'creating' | 'ready' | 'deleting' | 'deleted' | 'error';

  /** ISO-8601 creation timestamp */
  createdAt: string;

  /** Opaque metadata returned by the cloud provider */
  metadata: Record<string, unknown>;
}

/** Health snapshot for a stamp */
export interface StampHealthSnapshot {
  /** Overall health verdict */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Active database connection count */
  dbConnectionCount: number;

  /** Max allowed database connections */
  dbConnectionLimit: number;

  /** Database CPU utilization 0-1 */
  dbCpuUtilization: number;

  /** Storage bucket usage in bytes */
  storageBytesUsed: number;

  /** Number of active tenant sessions routed to this stamp */
  activeTenantSessions: number;

  /** ISO-8601 timestamp of this snapshot */
  checkedAt: string;

  /** Per-resource health details (keyed by resourceId) */
  resourceHealth: Record<string, { ok: boolean; message?: string }>;
}

/** Top-level stamp status combining lifecycle + health */
export interface StampStatus {
  stampId: string;
  lifecycle: StampLifecycle;
  health: StampHealthSnapshot;
  tenantCount: number;
  lastTransitionAt: string;
}

/** Full configuration for a deployment stamp */
export interface StampConfig {
  /** Unique stamp identifier (UUID) */
  stampId: string;

  /** Human-friendly name (e.g. "enterprise-acme-us-east1") */
  name: string;

  /** GCP project hosting the stamp's resources */
  projectId: string;

  /** Region */
  region: StampRegion;

  /** Current lifecycle phase */
  lifecycle: StampLifecycle;

  /** Dedicated vs pooled */
  placementMode: PlacementMode;

  /** Tenant IDs assigned to this stamp */
  tenantIds: string[];

  /** Max tenants allowed (1 for dedicated) */
  maxTenants: number;

  /** Provisioned resources */
  resources: StampResource[];

  /** Cloud SQL connection string */
  databaseUrl: string;

  /** GCS bucket name for tenant artifacts */
  storageBucket: string;

  /** KMS keyring resource name for tenant encryption */
  kmsKeyring: string;

  /** ISO-8601 */
  createdAt: string;

  /** ISO-8601 */
  updatedAt: string;
}

/** Parameters required to provision a new stamp */
export interface ProvisionStampParams {
  /** Organization / tenant that requested the stamp */
  tenantId: string;

  /** Desired region */
  region: StampRegion;

  /** Tier drives dedicated vs pooled */
  tier: TenantTier;

  /** Override placement mode (enterprise always gets dedicated) */
  placementMode?: PlacementMode;

  /** GCP project to provision into */
  projectId: string;

  /** Optional labels applied to all GCP resources */
  labels?: Record<string, string>;
}

/** Result of a stamp placement lookup */
export interface StampPlacement {
  stampId: string;
  databaseUrl: string;
  storageBucket: string;
  kmsKeyring: string;
  region: StampRegion;
  placementMode: PlacementMode;
}
