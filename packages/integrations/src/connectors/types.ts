// @cveriskpilot/integrations — scanner connector type definitions

export type ConnectorType = 'nessus' | 'qualys' | 'openvas' | 'generic';

export type ConnectorStatus = 'online' | 'offline' | 'degraded' | 'pending';

export interface ConnectorAuthConfig {
  /** Authentication method: api_key, basic, certificate, oauth */
  method: 'api_key' | 'basic' | 'certificate' | 'oauth';
  /** Encrypted credential reference (never store raw secrets) */
  credentialRef?: string;
}

export interface ConnectorConfig {
  id?: string;
  orgId: string;
  name: string;
  type: ConnectorType;
  endpoint: string;
  authConfig: ConnectorAuthConfig;
  schedule?: string; // cron expression, e.g. "0 2 * * *"
  lastHeartbeat?: Date | null;
  status: ConnectorStatus;
  metadata?: Record<string, unknown>;
}

export interface ConnectorHeartbeat {
  connectorId: string;
  timestamp: Date;
  version: string;
  scannerVersion: string;
  status: ConnectorStatus;
  metrics?: {
    activeScanCount?: number;
    queuedScanCount?: number;
    memoryUsageMb?: number;
    cpuPercent?: number;
  };
}

export interface ConnectorRecord {
  id: string;
  orgId: string;
  name: string;
  type: ConnectorType;
  endpoint: string;
  authConfig: ConnectorAuthConfig;
  authKeyHash: string;
  schedule: string | null;
  lastHeartbeat: Date | null;
  lastHeartbeatData: ConnectorHeartbeat | null;
  status: ConnectorStatus;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanTriggerConfig {
  targets: string[];
  scanPolicy?: string;
  priority?: 'low' | 'normal' | 'high';
  callbackUrl?: string;
}

export interface ScanTriggerResult {
  connectorId: string;
  scanId: string;
  status: 'queued' | 'started' | 'failed';
  message?: string;
}
