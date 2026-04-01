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
export { CMMC_FRAMEWORK, assessCMMC, CMMC_SPRS_WEIGHTS, calculateSPRSScore } from './frameworks/cmmc';
export { FEDRAMP_FRAMEWORK, assessFedRAMP } from './frameworks/fedramp';
export { NIST_800_53_FRAMEWORK, assessNIST80053 } from './frameworks/nist-800-53';
export { GDPR_FRAMEWORK, assessGDPR } from './frameworks/gdpr';
export { HIPAA_FRAMEWORK, assessHIPAA } from './frameworks/hipaa';
export { PCI_DSS_FRAMEWORK, assessPCIDSS } from './frameworks/pci-dss';
export { ISO27001_FRAMEWORK, assessISO27001 } from './frameworks/iso27001';
export { NIST_CSF_FRAMEWORK, assessNISTCSF } from './frameworks/nist-csf';
export { EU_CRA_FRAMEWORK, assessEUCRA } from './frameworks/eu-cra';
export { NIS2_FRAMEWORK, assessNIS2 } from './frameworks/nis2';

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
