/**
 * @cveriskpilot/security-bundle
 *
 * Unified security and compliance package that aggregates all compliance
 * frameworks, security controls, and self-assessment capabilities.
 *
 * Provides:
 * - 10 compliance frameworks (SOC 2, CMMC, FedRAMP, NIST 800-53, SSDF, ASVS, GDPR, HIPAA, PCI-DSS, ISO 27001)
 * - Self-assessment engine with SPRS scoring
 * - Gap analysis and prioritized recommendations
 * - Multi-framework compliance audit
 * - CSV/JSON export for assessment reports
 */

// ---------------------------------------------------------------------------
// Re-export all compliance capabilities
// ---------------------------------------------------------------------------

// Framework definitions + assessment functions
export {
  // SOC 2
  SOC2_FRAMEWORK, assessSOC2,
  // CMMC Level 2
  CMMC_FRAMEWORK, assessCMMC, CMMC_SPRS_WEIGHTS, calculateSPRSScore,
  // FedRAMP Moderate
  FEDRAMP_FRAMEWORK, assessFedRAMP,
  // NIST SSDF
  SSDF_FRAMEWORK, assessSSDF,
  // OWASP ASVS
  ASVS_FRAMEWORK, assessASVS,
  // NIST 800-53
  NIST_800_53_FRAMEWORK, assessNIST80053,
  // GDPR
  GDPR_FRAMEWORK, assessGDPR,
  // HIPAA
  HIPAA_FRAMEWORK, assessHIPAA,
  // PCI-DSS
  PCI_DSS_FRAMEWORK, assessPCIDSS,
  // ISO 27001
  ISO27001_FRAMEWORK, assessISO27001,
} from '@cveriskpilot/compliance';

// POAM generation
export {
  generatePOAM, exportPOAMCsv, exportPOAMJson,
} from '@cveriskpilot/compliance';

// NIST 800-53 CWE mapping
export {
  mapFindingToControls, mapCveToControls,
  getAffectedControlIds, getControlCoverageByFamily,
  NIST_800_53_CONTROLS, NIST_CONTROLS_BY_ID, NIST_FAMILY_LABELS,
} from '@cveriskpilot/compliance';

// Cross-framework mapping
export {
  mapCweToAllFrameworks, mapFindingsToComplianceImpact, getSupportedFrameworks,
} from '@cveriskpilot/compliance';

// Types
export type {
  ComplianceFramework, ComplianceControl, ComplianceEvidence,
  ComplianceStatus, ComplianceAssessment, ComplianceAssessmentInput,
  POAMItem, POAMStatus, POAMMilestone,
  NistControl, NistControlFamily, NistControlMapping,
  CrossFrameworkMapping, FrameworkControlRef,
  ComplianceImpactEntry, ComplianceImpactReport, FrameworkImpactSummary,
} from '@cveriskpilot/compliance';

// ---------------------------------------------------------------------------
// Self-Assessment Engine
// ---------------------------------------------------------------------------

export {
  runSelfAssessment,
  runFullComplianceAudit,
  listFrameworks,
  computeSPRSScore,
  exportSelfAssessmentJson,
  exportSelfAssessmentCsv,
} from './assessment/self-assessment-engine';

export type {
  SelfAssessmentConfig,
  SelfAssessmentReport,
  DomainScore,
  GapItem,
  Recommendation,
  ReadinessLevel,
  ControlSummary,
  FrameworkRegistryEntry,
  RecommendationCategory,
} from './assessment/types';
