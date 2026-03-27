/**
 * Compliance Framework Types
 */

export type ComplianceStatus = 'met' | 'partial' | 'not_met' | 'na';

export interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  category: string;
  evidenceRequirements: string[];
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  controls: ComplianceControl[];
}

export interface ComplianceEvidence {
  controlId: string;
  status: ComplianceStatus;
  evidence: string;
  lastVerified: string; // ISO date
  autoAssessed: boolean;
}

export interface ComplianceAssessment {
  frameworkId: string;
  frameworkName: string;
  assessedAt: string;
  totalControls: number;
  metCount: number;
  partialCount: number;
  notMetCount: number;
  naCount: number;
  overallScore: number; // percentage
  evidences: ComplianceEvidence[];
}

/** Input data for auto-assessment from the platform */
export interface ComplianceAssessmentInput {
  totalOpenCases: number;
  totalClosedCases: number;
  averageRemediationDays: number;
  slaComplianceRate: number; // 0-100
  scanFrequencyDays: number; // average days between scans
  hasSlaPolicies: boolean;
  hasRiskExceptions: boolean;
  hasAuditLogs: boolean;
  totalFindings: number;
  criticalOpenCount: number;
  highOpenCount: number;
  kevOpenCount: number;
  hasIntegrations: boolean;
  lastScanDate: string | null;
}
