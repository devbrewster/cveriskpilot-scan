// @cveriskpilot/integrations — scanner connector management

import crypto from 'node:crypto';
import type {
  ConnectorConfig,
  ConnectorHeartbeat,
  ConnectorRecord,
  ConnectorStatus,
  ScanTriggerConfig,
  ScanTriggerResult,
} from './types';

// ---------------------------------------------------------------------------
// Prisma interface (avoids hard coupling to @cveriskpilot/domain)
// ---------------------------------------------------------------------------

interface PrismaConnector {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  endpoint: string;
  authConfig: unknown;
  authKeyHash: string;
  schedule: string | null;
  lastHeartbeat: Date | null;
  lastHeartbeatData: unknown;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaLike {
  scannerConnector: {
    create: (args: { data: Record<string, unknown> }) => Promise<PrismaConnector>;
    findUnique: (args: { where: Record<string, unknown> }) => Promise<PrismaConnector | null>;
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<PrismaConnector[]>;
    update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<PrismaConnector>;
    delete: (args: { where: Record<string, unknown> }) => Promise<PrismaConnector>;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Connector is considered offline if no heartbeat in this many minutes */
const HEARTBEAT_TIMEOUT_MINUTES = 5;

/** Connector is degraded if heartbeat is older than this but newer than offline threshold */
const HEARTBEAT_DEGRADED_MINUTES = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateAuthKey(): { raw: string; hash: string } {
  const raw = `crpc_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function toRecord(row: PrismaConnector): ConnectorRecord {
  return {
    id: row.id,
    orgId: row.organizationId,
    name: row.name,
    type: row.type as ConnectorRecord['type'],
    endpoint: row.endpoint,
    authConfig: row.authConfig as ConnectorRecord['authConfig'],
    authKeyHash: row.authKeyHash,
    schedule: row.schedule,
    lastHeartbeat: row.lastHeartbeat,
    lastHeartbeatData: row.lastHeartbeatData as ConnectorRecord['lastHeartbeatData'],
    status: row.status as ConnectorStatus,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function computeStatus(lastHeartbeat: Date | null): ConnectorStatus {
  if (!lastHeartbeat) return 'pending';
  const diffMs = Date.now() - lastHeartbeat.getTime();
  const diffMinutes = diffMs / 1000 / 60;
  if (diffMinutes > HEARTBEAT_TIMEOUT_MINUTES) return 'offline';
  if (diffMinutes > HEARTBEAT_DEGRADED_MINUTES) return 'degraded';
  return 'online';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new scanner connector for an organization.
 * Returns the connector record and the raw authentication key (shown once).
 */
export async function registerConnector(
  prisma: unknown,
  config: ConnectorConfig,
): Promise<{ connector: ConnectorRecord; authKey: string }> {
  const db = prisma as PrismaLike;
  const { raw, hash } = generateAuthKey();

  const created = await db.scannerConnector.create({
    data: {
      organizationId: config.orgId,
      name: config.name,
      type: config.type,
      endpoint: config.endpoint,
      authConfig: config.authConfig as unknown,
      authKeyHash: hash,
      schedule: config.schedule ?? null,
      status: 'pending',
      metadata: (config.metadata as unknown) ?? {},
    },
  });

  return {
    connector: toRecord(created),
    authKey: raw,
  };
}

/**
 * Process a heartbeat from a connector agent.
 * Updates last heartbeat timestamp and computes health status.
 */
export async function processHeartbeat(
  prisma: unknown,
  connectorId: string,
  heartbeat: ConnectorHeartbeat,
): Promise<ConnectorRecord> {
  const db = prisma as PrismaLike;

  const status = heartbeat.status === 'online' ? 'online' : heartbeat.status;

  const updated = await db.scannerConnector.update({
    where: { id: connectorId },
    data: {
      lastHeartbeat: heartbeat.timestamp,
      lastHeartbeatData: heartbeat as unknown,
      status,
    },
  });

  return toRecord(updated);
}

/**
 * Get all connectors for an organization with computed health status.
 */
export async function getConnectorStatus(
  prisma: unknown,
  orgId: string,
): Promise<ConnectorRecord[]> {
  const db = prisma as PrismaLike;

  const connectors = await db.scannerConnector.findMany({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' },
  });

  return connectors.map((c) => {
    const record = toRecord(c);
    // Recompute status based on heartbeat freshness
    record.status = computeStatus(record.lastHeartbeat);
    return record;
  });
}

/**
 * Rotate the authentication key for a connector.
 * Returns the new raw key (shown once).
 */
export async function rotateConnectorKey(
  prisma: unknown,
  connectorId: string,
): Promise<{ authKey: string }> {
  const db = prisma as PrismaLike;
  const { raw, hash } = generateAuthKey();

  await db.scannerConnector.update({
    where: { id: connectorId },
    data: { authKeyHash: hash },
  });

  return { authKey: raw };
}

/**
 * Get a single connector by ID.
 */
export async function getConnector(
  prisma: unknown,
  connectorId: string,
): Promise<ConnectorRecord | null> {
  const db = prisma as PrismaLike;
  const row = await db.scannerConnector.findUnique({
    where: { id: connectorId },
  });
  if (!row) return null;
  const record = toRecord(row);
  record.status = computeStatus(record.lastHeartbeat);
  return record;
}

/**
 * Update connector configuration.
 */
export async function updateConnector(
  prisma: unknown,
  connectorId: string,
  data: Partial<Pick<ConnectorConfig, 'name' | 'endpoint' | 'authConfig' | 'schedule' | 'metadata'>>,
): Promise<ConnectorRecord> {
  const db = prisma as PrismaLike;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.endpoint !== undefined) updateData.endpoint = data.endpoint;
  if (data.authConfig !== undefined) updateData.authConfig = data.authConfig;
  if (data.schedule !== undefined) updateData.schedule = data.schedule;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;

  const updated = await db.scannerConnector.update({
    where: { id: connectorId },
    data: updateData,
  });

  return toRecord(updated);
}

/**
 * Delete a connector.
 */
export async function deleteConnector(
  prisma: unknown,
  connectorId: string,
): Promise<void> {
  const db = prisma as PrismaLike;
  await db.scannerConnector.delete({
    where: { id: connectorId },
  });
}

/**
 * Send a scan request to a connector agent.
 * This makes an HTTP call to the connector's endpoint.
 */
export async function triggerScan(
  connectorEndpoint: string,
  authKey: string,
  config: ScanTriggerConfig,
): Promise<ScanTriggerResult> {
  try {
    const response = await fetch(`${connectorEndpoint}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authKey}`,
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      return {
        connectorId: '',
        scanId: '',
        status: 'failed',
        message: `Connector returned ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      connectorId: data.connectorId ?? '',
      scanId: data.scanId ?? crypto.randomUUID(),
      status: data.status ?? 'queued',
      message: data.message,
    };
  } catch (err) {
    return {
      connectorId: '',
      scanId: '',
      status: 'failed',
      message: err instanceof Error ? err.message : 'Failed to reach connector',
    };
  }
}
