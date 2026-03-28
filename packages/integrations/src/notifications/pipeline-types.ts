// ---------------------------------------------------------------------------
// Pipeline notification shared types
// ---------------------------------------------------------------------------

export type NotificationChannel = 'slack' | 'teams' | 'webhook';

export type PipelineVerdict = 'PASS' | 'FAIL' | 'WARN';

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ComplianceControlResult {
  controlId: string;
  title: string;
  status: 'pass' | 'fail' | 'partial';
  framework: string;
}

export interface PipelineScanResult {
  /** Unique scan run identifier */
  scanId: string;
  /** Overall verdict: PASS, FAIL, or WARN */
  verdict: PipelineVerdict;
  /** Repository name (e.g. "org/repo") */
  repository: string;
  /** Git branch scanned */
  branch: string;
  /** Short commit SHA */
  commitSha: string;
  /** Severity breakdown */
  severityCounts: SeverityCounts;
  /** Total number of findings */
  totalFindings: number;
  /** New findings introduced in this scan */
  newFindings: number;
  /** Fixed findings compared to previous scan */
  fixedFindings: number;
  /** Compliance controls affected */
  complianceControls: ComplianceControlResult[];
  /** Number of POAM entries created */
  poamEntriesCreated: number;
  /** Frameworks evaluated */
  frameworks: string[];
  /** Direct link to scan results in CVERiskPilot dashboard */
  dashboardUrl: string;
  /** ISO 8601 timestamp of scan completion */
  completedAt: string;
  /** Organization ID */
  organizationId: string;
}

export interface ComplianceAlert {
  /** Unique alert identifier */
  alertId: string;
  /** Organization ID */
  organizationId: string;
  /** Framework that was violated */
  framework: string;
  /** Control that was violated */
  controlId: string;
  /** Human-readable control title */
  controlTitle: string;
  /** Description of the violation */
  description: string;
  /** Severity of the violation */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Repository/asset affected */
  repository?: string;
  /** Link to view details */
  dashboardUrl: string;
  /** ISO 8601 timestamp */
  detectedAt: string;
}

export interface NotificationChannelConfig {
  id: string;
  channel: NotificationChannel;
  webhookUrl: string;
  label?: string;
  enabled: boolean;
}
