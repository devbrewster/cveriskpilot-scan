export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  file: string;
  line?: number;
  fix?: string;
}

export interface CheckResult {
  name: string;
  findings: Finding[];
  duration_ms: number;
}

export interface AuditReport {
  timestamp: string;
  duration_ms: number;
  checks: CheckResult[];
  summary: Record<Severity, number>;
  totalFindings: number;
}

export interface AuditCheck {
  name: string;
  description: string;
  run(rootDir: string): Promise<Finding[]>;
}
