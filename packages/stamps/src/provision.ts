// @cveriskpilot/stamps — Stamp provisioning & lifecycle management

import { randomUUID } from 'node:crypto';
import type {
  StampConfig,
  StampResource,
  StampLifecycle,
  ProvisionStampParams,
  StampRegion,
} from './types';

// ---------------------------------------------------------------------------
// In-memory stamp registry (replace with Firestore / Cloud SQL in production)
// ---------------------------------------------------------------------------

const stampRegistry = new Map<string, StampConfig>();

/** Retrieve a stamp by ID (returns undefined if missing) */
export function getStamp(stampId: string): StampConfig | undefined {
  return stampRegistry.get(stampId);
}

/** List all registered stamps */
export function listStamps(): StampConfig[] {
  return Array.from(stampRegistry.values());
}

// ---------------------------------------------------------------------------
// Resource naming helpers
// ---------------------------------------------------------------------------

function sqlInstanceName(projectId: string, region: StampRegion, stampId: string): string {
  const short = stampId.slice(0, 8);
  return `projects/${projectId}/instances/cverp-${region}-${short}`;
}

function bucketName(projectId: string, region: StampRegion, stampId: string): string {
  const short = stampId.slice(0, 8);
  return `${projectId}-cverp-${region}-${short}`;
}

function kmsKeyringName(projectId: string, region: StampRegion, stampId: string): string {
  const short = stampId.slice(0, 8);
  return `projects/${projectId}/locations/${region}/keyRings/cverp-${short}`;
}

// ---------------------------------------------------------------------------
// GCP resource provisioning (simulated calls — swap with real SDK clients)
// ---------------------------------------------------------------------------

async function provisionCloudSql(
  projectId: string,
  region: StampRegion,
  stampId: string,
  labels: Record<string, string>,
): Promise<StampResource> {
  const resourceId = sqlInstanceName(projectId, region, stampId);

  // In production: call google.cloud.sql.v1.SqlInstancesService.Insert
  // const sqlAdmin = new SqlInstancesServiceClient();
  // await sqlAdmin.insert({ project: projectId, body: { name, region, ... } });

  return {
    resourceId,
    name: `sql-${stampId.slice(0, 8)}`,
    kind: 'cloud-sql',
    projectId,
    region,
    status: 'ready',
    createdAt: new Date().toISOString(),
    metadata: { tier: 'db-custom-4-16384', availabilityType: 'REGIONAL', labels },
  };
}

async function provisionGcsBucket(
  projectId: string,
  region: StampRegion,
  stampId: string,
  labels: Record<string, string>,
): Promise<StampResource> {
  const name = bucketName(projectId, region, stampId);

  // In production: const storage = new Storage(); await storage.createBucket(name, { location: region, labels });

  return {
    resourceId: `projects/_/buckets/${name}`,
    name,
    kind: 'gcs-bucket',
    projectId,
    region,
    status: 'ready',
    createdAt: new Date().toISOString(),
    metadata: { storageClass: 'STANDARD', versioning: true, labels },
  };
}

async function provisionKmsKeyring(
  projectId: string,
  region: StampRegion,
  stampId: string,
): Promise<StampResource> {
  const resourceId = kmsKeyringName(projectId, region, stampId);

  // In production: const kms = new KeyManagementServiceClient();
  // await kms.createKeyRing({ parent: `projects/${projectId}/locations/${region}`, keyRingId, keyRing: {} });

  return {
    resourceId,
    name: `keyring-${stampId.slice(0, 8)}`,
    kind: 'kms-keyring',
    projectId,
    region,
    status: 'ready',
    createdAt: new Date().toISOString(),
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// Stamp provisioning
// ---------------------------------------------------------------------------

/**
 * Provisions a new deployment stamp for an enterprise tenant.
 *
 * Creates dedicated Cloud SQL instance, GCS bucket, and KMS keyring within the
 * specified GCP project. The stamp starts in `provisioning` and transitions to
 * `active` once all resources report ready.
 */
export async function provisionStamp(params: ProvisionStampParams): Promise<StampConfig> {
  const {
    tenantId,
    region,
    tier,
    projectId,
    labels = {},
  } = params;

  const placementMode = params.placementMode ?? (tier === 'enterprise' ? 'dedicated' : 'pooled');
  const stampId = randomUUID();
  const now = new Date().toISOString();

  const mergedLabels: Record<string, string> = {
    ...labels,
    'managed-by': 'cveriskpilot',
    tenant: tenantId,
    stamp: stampId.slice(0, 8),
  };

  // Create the stamp record in provisioning state
  const stamp: StampConfig = {
    stampId,
    name: `${placementMode === 'dedicated' ? 'ent' : 'pool'}-${region}-${stampId.slice(0, 8)}`,
    projectId,
    region,
    lifecycle: 'provisioning',
    placementMode,
    tenantIds: [tenantId],
    maxTenants: placementMode === 'dedicated' ? 1 : 50,
    resources: [],
    databaseUrl: '',
    storageBucket: '',
    kmsKeyring: '',
    createdAt: now,
    updatedAt: now,
  };

  stampRegistry.set(stampId, stamp);

  // Provision all resources in parallel
  const [sqlResource, gcsResource, kmsResource] = await Promise.all([
    provisionCloudSql(projectId, region, stampId, mergedLabels),
    provisionGcsBucket(projectId, region, stampId, mergedLabels),
    provisionKmsKeyring(projectId, region, stampId),
  ]);

  // Verify all resources are ready
  const allReady = [sqlResource, gcsResource, kmsResource].every((r) => r.status === 'ready');

  const bucket = bucketName(projectId, region, stampId);
  const dbUrl = `postgresql://cverp_app@/${stamp.name}?host=/cloudsql/${sqlInstanceName(projectId, region, stampId)}&sslmode=verify-ca`;

  // Update stamp to active
  stamp.resources = [sqlResource, gcsResource, kmsResource];
  stamp.databaseUrl = dbUrl;
  stamp.storageBucket = bucket;
  stamp.kmsKeyring = kmsKeyringName(projectId, region, stampId);
  stamp.lifecycle = allReady ? 'active' : 'provisioning';
  stamp.updatedAt = new Date().toISOString();

  stampRegistry.set(stampId, stamp);

  return stamp;
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<StampLifecycle, StampLifecycle[]> = {
  provisioning: ['active', 'decommissioned'],
  active: ['draining', 'decommissioned'],
  draining: ['decommissioned', 'active'],
  decommissioned: [],
};

/**
 * Transition a stamp to a new lifecycle phase.
 * Throws if the transition is invalid.
 */
export async function transitionStamp(
  stampId: string,
  targetLifecycle: StampLifecycle,
): Promise<StampConfig> {
  const stamp = stampRegistry.get(stampId);
  if (!stamp) {
    throw new Error(`Stamp not found: ${stampId}`);
  }

  const allowed = VALID_TRANSITIONS[stamp.lifecycle];
  if (!allowed.includes(targetLifecycle)) {
    throw new Error(
      `Invalid transition: ${stamp.lifecycle} -> ${targetLifecycle}. Allowed: ${allowed.join(', ')}`,
    );
  }

  stamp.lifecycle = targetLifecycle;
  stamp.updatedAt = new Date().toISOString();

  // When draining, prevent new tenant assignments
  if (targetLifecycle === 'draining') {
    stamp.maxTenants = 0;
  }

  // When decommissioning, mark all resources as deleting
  if (targetLifecycle === 'decommissioned') {
    for (const resource of stamp.resources) {
      resource.status = 'deleting';
    }
    // In production: trigger async resource deletion via Cloud Tasks
    // await enqueueResourceDeletion(stamp.resources);

    // Simulate deletion completion
    for (const resource of stamp.resources) {
      resource.status = 'deleted';
    }
  }

  stampRegistry.set(stampId, stamp);
  return stamp;
}

/**
 * Add a tenant to an existing stamp (pooled mode only).
 * Throws if the stamp is at capacity or not active.
 */
export async function assignTenantToStamp(
  stampId: string,
  tenantId: string,
): Promise<StampConfig> {
  const stamp = stampRegistry.get(stampId);
  if (!stamp) {
    throw new Error(`Stamp not found: ${stampId}`);
  }
  if (stamp.lifecycle !== 'active') {
    throw new Error(`Cannot assign tenant to stamp in ${stamp.lifecycle} state`);
  }
  if (stamp.tenantIds.length >= stamp.maxTenants) {
    throw new Error(`Stamp ${stampId} is at capacity (${stamp.maxTenants} tenants)`);
  }
  if (stamp.tenantIds.includes(tenantId)) {
    return stamp; // already assigned
  }

  stamp.tenantIds.push(tenantId);
  stamp.updatedAt = new Date().toISOString();
  stampRegistry.set(stampId, stamp);
  return stamp;
}

/**
 * Remove a tenant from a stamp (e.g. during migration or offboarding).
 */
export async function removeTenantFromStamp(
  stampId: string,
  tenantId: string,
): Promise<StampConfig> {
  const stamp = stampRegistry.get(stampId);
  if (!stamp) {
    throw new Error(`Stamp not found: ${stampId}`);
  }

  stamp.tenantIds = stamp.tenantIds.filter((id) => id !== tenantId);
  stamp.updatedAt = new Date().toISOString();
  stampRegistry.set(stampId, stamp);
  return stamp;
}
