// @cveriskpilot/stamps — Stamp health monitoring

import type { StampConfig, StampHealthSnapshot, StampStatus } from './types';
import { listStamps, getStamp } from './provision';

// ---------------------------------------------------------------------------
// Health-check thresholds
// ---------------------------------------------------------------------------

interface HealthThresholds {
  /** DB CPU utilization above this is "degraded" */
  dbCpuDegradedThreshold: number;
  /** DB CPU utilization above this is "unhealthy" */
  dbCpuUnhealthyThreshold: number;
  /** Ratio of active / max DB connections above which we flag degraded */
  dbConnectionDegradedRatio: number;
  /** Ratio above which we flag unhealthy */
  dbConnectionUnhealthyRatio: number;
  /** Storage usage (bytes) above which we flag degraded */
  storageDegradedBytes: number;
}

const DEFAULT_THRESHOLDS: HealthThresholds = {
  dbCpuDegradedThreshold: 0.7,
  dbCpuUnhealthyThreshold: 0.9,
  dbConnectionDegradedRatio: 0.75,
  dbConnectionUnhealthyRatio: 0.95,
  storageDegradedBytes: 50 * 1024 * 1024 * 1024, // 50 GB
};

// ---------------------------------------------------------------------------
// Resource-level health probes
// ---------------------------------------------------------------------------

async function probeCloudSql(resource: { resourceId: string }): Promise<{ ok: boolean; message?: string; cpu: number; connections: number; maxConnections: number }> {
  // In production: query Cloud Monitoring API or pg_stat_activity
  // const monitoring = new MetricServiceClient();
  // const [timeSeries] = await monitoring.listTimeSeries({ ... });

  // Simulated metrics — replace with real Cloud Monitoring queries
  const cpu = Math.random() * 0.5; // simulate 0-50% CPU
  const connections = Math.floor(Math.random() * 30);
  const maxConnections = 100;

  return {
    ok: cpu < 0.9 && connections < maxConnections * 0.95,
    message: cpu >= 0.9 ? `High CPU: ${(cpu * 100).toFixed(1)}%` : undefined,
    cpu,
    connections,
    maxConnections,
  };
}

async function probeGcsBucket(resource: { resourceId: string }): Promise<{ ok: boolean; message?: string; bytesUsed: number }> {
  // In production: storage.bucket(name).getMetadata()
  const bytesUsed = Math.floor(Math.random() * 10 * 1024 * 1024 * 1024); // simulate 0-10 GB
  return { ok: true, bytesUsed };
}

async function probeKmsKeyring(resource: { resourceId: string }): Promise<{ ok: boolean; message?: string }> {
  // In production: kms.getKeyRing({ name: resource.resourceId })
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Stamp health check
// ---------------------------------------------------------------------------

/**
 * Perform a health check on a single stamp, probing all its resources.
 */
export async function stampHealthCheck(
  stampId: string,
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS,
): Promise<StampStatus> {
  const stamp = getStamp(stampId);
  if (!stamp) {
    throw new Error(`Stamp not found: ${stampId}`);
  }

  const resourceHealth: Record<string, { ok: boolean; message?: string }> = {};
  let dbCpuUtilization = 0;
  let dbConnectionCount = 0;
  let dbConnectionLimit = 100;
  let storageBytesUsed = 0;

  // Probe each resource in parallel
  const probePromises = stamp.resources.map(async (resource) => {
    switch (resource.kind) {
      case 'cloud-sql': {
        const result = await probeCloudSql(resource);
        resourceHealth[resource.resourceId] = { ok: result.ok, message: result.message };
        dbCpuUtilization = result.cpu;
        dbConnectionCount = result.connections;
        dbConnectionLimit = result.maxConnections;
        break;
      }
      case 'gcs-bucket': {
        const result = await probeGcsBucket(resource);
        resourceHealth[resource.resourceId] = { ok: result.ok, message: result.message };
        storageBytesUsed = result.bytesUsed;
        break;
      }
      case 'kms-keyring': {
        const result = await probeKmsKeyring(resource);
        resourceHealth[resource.resourceId] = { ok: result.ok, message: result.message };
        break;
      }
      default: {
        resourceHealth[resource.resourceId] = { ok: true };
      }
    }
  });

  await Promise.all(probePromises);

  // Determine overall health status
  const anyResourceDown = Object.values(resourceHealth).some((r) => !r.ok);
  const connectionRatio = dbConnectionLimit > 0 ? dbConnectionCount / dbConnectionLimit : 0;

  let healthStatus: StampHealthSnapshot['status'] = 'healthy';

  if (
    anyResourceDown ||
    dbCpuUtilization >= thresholds.dbCpuUnhealthyThreshold ||
    connectionRatio >= thresholds.dbConnectionUnhealthyRatio
  ) {
    healthStatus = 'unhealthy';
  } else if (
    dbCpuUtilization >= thresholds.dbCpuDegradedThreshold ||
    connectionRatio >= thresholds.dbConnectionDegradedRatio ||
    storageBytesUsed >= thresholds.storageDegradedBytes
  ) {
    healthStatus = 'degraded';
  }

  const health: StampHealthSnapshot = {
    status: healthStatus,
    dbConnectionCount,
    dbConnectionLimit,
    dbCpuUtilization,
    storageBytesUsed,
    activeTenantSessions: stamp.tenantIds.length,
    checkedAt: new Date().toISOString(),
    resourceHealth,
  };

  return {
    stampId: stamp.stampId,
    lifecycle: stamp.lifecycle,
    health,
    tenantCount: stamp.tenantIds.length,
    lastTransitionAt: stamp.updatedAt,
  };
}

/**
 * Check health of all registered stamps.
 * Returns an array of StampStatus sorted by health severity (unhealthy first).
 */
export async function checkAllStampsHealth(
  thresholds?: HealthThresholds,
): Promise<StampStatus[]> {
  const stamps = listStamps().filter((s) => s.lifecycle !== 'decommissioned');

  const statuses = await Promise.all(
    stamps.map((s) => stampHealthCheck(s.stampId, thresholds)),
  );

  // Sort: unhealthy > degraded > healthy
  const severity: Record<StampHealthSnapshot['status'], number> = {
    unhealthy: 0,
    degraded: 1,
    healthy: 2,
  };

  return statuses.sort(
    (a, b) => severity[a.health.status] - severity[b.health.status],
  );
}

/**
 * Determine if a stamp should be drained based on persistent health issues.
 * Call this periodically; returns true if the stamp should transition to draining.
 */
export function shouldDrainStamp(
  status: StampStatus,
  consecutiveUnhealthyChecks: number,
  drainAfterUnhealthyCount: number = 3,
): boolean {
  if (status.lifecycle !== 'active') return false;
  if (status.health.status === 'unhealthy' && consecutiveUnhealthyChecks >= drainAfterUnhealthyCount) {
    return true;
  }
  return false;
}
