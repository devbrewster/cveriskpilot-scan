/**
 * POAM (Plan of Action and Milestones) Types — NIST 800-171
 */

export type POAMStatus =
  | 'ONGOING'
  | 'COMPLETED'
  | 'DELAYED'
  | 'CANCELLED'
  | 'PENDING';

export interface POAMMilestone {
  id: string;
  description: string;
  scheduledDate: string; // ISO date
  completedDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface POAMItem {
  id: string;
  weaknessId: string; // CVE ID or CWE ID
  controlFamily: string; // NIST 800-171 control family (e.g. "3.11 Risk Assessment")
  securityControl: string; // Specific control (e.g. "3.11.1")
  weaknessDescription: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  responsibleEntity: string;
  milestones: POAMMilestone[];
  scheduledCompletionDate: string; // ISO date
  status: POAMStatus;
  resources: string;
  comments: string;
  cveIds: string[];
  cweIds: string[];
  sourceOfWeakness: string; // e.g. "Vulnerability Scan", "Penetration Test"
  originalDetectionDate: string; // ISO date
}

export interface POAMGenerationOptions {
  organizationName: string;
  clientId?: string;
  includeClosedCases?: boolean;
}

export interface POAMExportResult {
  items: POAMItem[];
  generatedAt: string;
  organizationName: string;
  totalItems: number;
}
