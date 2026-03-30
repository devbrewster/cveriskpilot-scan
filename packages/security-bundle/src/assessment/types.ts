/**
 * Self-Assessment Engine Types
 *
 * Types for generating compliance self-assessment reports,
 * including CMMC Level 2 SPRS scoring.
 */

import type {
  ComplianceFramework,
  ComplianceAssessment,
  ComplianceEvidence,
  ComplianceStatus,
} from '@cveriskpilot/compliance';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SelfAssessmentConfig {
  /** Framework ID to assess against (e.g., 'cmmc-level2', 'soc2-type2') */
  frameworkId: string;
  /** Target level within framework (e.g., 'Level 2' for CMMC) */
  targetLevel?: string;
  /** Organization being assessed */
  organizationName: string;
  /** Person performing the assessment */
  assessorName: string;
  /** Assessment date (ISO string) */
  assessmentDate: string;
  /** Description of systems in scope */
  scopeDescription: string;
  /** Optional: Previous assessment for delta comparison */
  previousAssessmentDate?: string;
}

// ---------------------------------------------------------------------------
// Report Output
// ---------------------------------------------------------------------------

export interface SelfAssessmentReport {
  config: SelfAssessmentConfig;
  framework: ComplianceFramework;
  assessment: ComplianceAssessment;
  domainScores: DomainScore[];
  gaps: GapItem[];
  recommendations: Recommendation[];
  /** CMMC-specific: Supplier Performance Risk System score (-203 to 110) */
  sprsScore: number | null;
  readinessLevel: ReadinessLevel;
  controlSummary: ControlSummary;
  generatedAt: string;
}

export type ReadinessLevel =
  | 'NOT_READY'
  | 'PARTIAL'
  | 'SUBSTANTIALLY_READY'
  | 'READY';

export interface ControlSummary {
  total: number;
  met: number;
  partial: number;
  notMet: number;
  notApplicable: number;
  percentMet: number;
  percentCompliant: number; // met + na / total
}

export interface DomainScore {
  domain: string;
  domainLabel: string;
  totalControls: number;
  metCount: number;
  partialCount: number;
  notMetCount: number;
  naCount: number;
  score: number; // 0-100 percentage
  status: ComplianceStatus;
}

export interface GapItem {
  controlId: string;
  controlTitle: string;
  domain: string;
  currentStatus: ComplianceStatus;
  evidence: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** For CMMC: SPRS weight deduction for this control */
  sprsWeight?: number;
  remediationGuidance: string;
}

export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedControls: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  category: RecommendationCategory;
}

export type RecommendationCategory =
  | 'technical'
  | 'organizational'
  | 'process'
  | 'documentation'
  | 'training';

// ---------------------------------------------------------------------------
// Framework Registry Entry
// ---------------------------------------------------------------------------

export interface FrameworkRegistryEntry {
  id: string;
  name: string;
  version: string;
  controlCount: number;
  hasAssessment: boolean;
  hasSPRS: boolean;
}
