// NIST 800-53 mapping barrel exports
export {
  mapFindingToControls,
  mapCveToControls,
  getAffectedControlIds,
  getControlCoverageByFamily,
  NIST_800_53_CONTROLS,
  NIST_CONTROLS_BY_ID,
  NIST_FAMILY_LABELS,
} from './nist-800-53';

export type {
  NistControl,
  NistControlFamily,
  NistControlMapping,
} from './nist-800-53';

// Cross-framework mapping
export {
  mapCweToAllFrameworks,
  mapFindingsToComplianceImpact,
  getSupportedFrameworks,
} from './cross-framework';

export type {
  CrossFrameworkMapping,
  FrameworkControlRef,
  ComplianceImpactEntry,
  ComplianceImpactReport,
  FrameworkImpactSummary,
} from './cross-framework';
