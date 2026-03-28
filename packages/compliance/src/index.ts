// @cveriskpilot/compliance — barrel exports

// POAM
export type {
  POAMItem,
  POAMStatus,
  POAMMilestone,
  POAMGenerationOptions,
  POAMExportResult,
} from './poam/types';
export { generatePOAM, exportPOAMCsv, exportPOAMJson } from './poam/generator';
export type { VulnerabilityCaseInput } from './poam/generator';

// Framework types
export type {
  ComplianceFramework,
  ComplianceControl,
  ComplianceEvidence,
  ComplianceStatus,
  ComplianceAssessment,
  ComplianceAssessmentInput,
} from './frameworks/types';

// Frameworks
export { SOC2_FRAMEWORK, assessSOC2 } from './frameworks/soc2';
export { SSDF_FRAMEWORK, assessSSDF } from './frameworks/ssdf';
export { ASVS_FRAMEWORK, assessASVS } from './frameworks/asvs';
export { CMMC_FRAMEWORK, assessCMMC } from './frameworks/cmmc';
export { FEDRAMP_FRAMEWORK, assessFedRAMP } from './frameworks/fedramp';

// NIST 800-53 Control Mapping
export {
  mapFindingToControls,
  mapCveToControls,
  getAffectedControlIds,
  getControlCoverageByFamily,
  NIST_800_53_CONTROLS,
  NIST_CONTROLS_BY_ID,
  NIST_FAMILY_LABELS,
} from './mapping';

export type {
  NistControl,
  NistControlFamily,
  NistControlMapping,
} from './mapping';

// Cross-framework mapping
export {
  mapCweToAllFrameworks,
  mapFindingsToComplianceImpact,
  getSupportedFrameworks,
} from './mapping';

export type {
  CrossFrameworkMapping,
  FrameworkControlRef,
  ComplianceImpactEntry,
  ComplianceImpactReport,
  FrameworkImpactSummary,
} from './mapping';

// Pipeline CI/CD integration
export {
  formatGitHubComment,
  formatGitLabComment,
  evaluatePolicy,
  getDefaultPolicy,
  generatePipelinePOAM,
} from './pipeline';

export type {
  PipelineScanResult,
  AffectedControl,
  PipelinePOAMEntry,
  SeveritySummary,
  PolicyConfig,
  FindingSeverity,
  PipelinePolicy,
  PolicyVerdict,
  PolicyEvaluationResult,
  AutoExceptionRule,
  Severity,
  PipelineMetadata,
} from './pipeline';
