// ---------------------------------------------------------------------------
// SIEM Export Types (t110)
// ---------------------------------------------------------------------------

export interface SIEMConfig {
  type: 'splunk' | 'qradar' | 'sentinel';
  enabled: boolean;
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export interface SplunkConfig extends SIEMConfig {
  type: 'splunk';
  hecUrl: string;
  hecToken: string;
  index?: string;
  source?: string;
  sourcetype?: string;
  verifySsl?: boolean;
}

export interface QRadarConfig extends SIEMConfig {
  type: 'qradar';
  host: string;
  port: number;
  protocol: 'tcp' | 'udp';
  apiUrl?: string;
  apiToken?: string;
  logSourceIdentifier?: string;
}

export interface SentinelConfig extends SIEMConfig {
  type: 'sentinel';
  workspaceId: string;
  sharedKey: string;
  logType: string;
  apiVersion?: string;
}

/**
 * CloudEvents v1.0 spec envelope.
 * See https://cloudevents.io/
 */
export interface CloudEvent {
  specversion: '1.0';
  id: string;
  type: string;
  source: string;
  time: string;
  datacontenttype: string;
  subject?: string;
  data: Record<string, unknown>;
}

export interface SIEMExportJob {
  jobId: string;
  siemType: 'splunk' | 'qradar' | 'sentinel';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  eventsTotal: number;
  eventsExported: number;
  eventsFailed: number;
  startedAt: Date;
  completedAt: Date | null;
  error?: string;
}

export interface FindingEventData {
  findingId: string;
  caseId?: string;
  title: string;
  severity: string;
  cveIds: string[];
  cvssScore?: number | null;
  epssScore?: number | null;
  kevListed?: boolean;
  assetName?: string;
  status: string;
  discoveredAt: string;
  [key: string]: unknown;
}

export interface CaseEventData {
  caseId: string;
  title: string;
  severity: string;
  status: string;
  previousStatus?: string;
  assignedTo?: string;
  findingCount: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ComplianceEventData {
  frameworkId: string;
  frameworkName: string;
  controlId: string;
  controlName: string;
  status: string;
  previousStatus?: string;
  score?: number;
  evaluatedAt: string;
  [key: string]: unknown;
}

/**
 * Common interface implemented by all SIEM exporters.
 */
export interface SIEMExporter {
  readonly type: string;
  sendEvents(events: CloudEvent[]): Promise<SIEMExportResult>;
  testConnection(): Promise<boolean>;
}

export interface SIEMExportResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}
