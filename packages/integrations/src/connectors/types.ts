// @cveriskpilot/integrations — scanner connector type definitions

export type ConnectorType = 'nessus' | 'qualys' | 'openvas' | 'tenable' | 'crowdstrike' | 'rapid7' | 'snyk' | 'generic';

export type ConnectorMode = 'pull' | 'push';

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
  /** Connector mode: pull (default) fetches from scanner, push receives webhooks */
  mode?: ConnectorMode;
  /** The URL the scanner should POST findings to in push mode */
  webhookUrl?: string;
  /** HMAC-SHA256 secret for verifying push payloads */
  webhookSecret?: string;
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

export interface PushWebhookConfig {
  connectorId: string;
  orgId: string;
  callbackUrl: string; // e.g., https://app.cveriskpilot.com/api/events/ingest
  secret: string; // HMAC-SHA256 secret
  events: string[]; // which events to receive
  registeredAt: Date;
}

export interface PushRegistrationResult {
  success: boolean;
  webhookId?: string;
  callbackUrl: string;
  error?: string;
}
