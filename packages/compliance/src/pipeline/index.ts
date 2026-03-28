// Pipeline CI/CD integration — barrel exports

export {
  formatGitHubComment,
  formatGitLabComment,
} from './comment-formatter';

export type {
  PipelineScanResult,
  AffectedControl,
  PipelinePOAMEntry,
  SeveritySummary,
  PolicyConfig,
  FindingSeverity,
} from './comment-formatter';

export {
  evaluatePolicy,
  getDefaultPolicy,
} from './policy-engine';

export type {
  PipelinePolicy,
  PolicyVerdict,
  PolicyEvaluationResult,
  AutoExceptionRule,
  Severity,
} from './policy-engine';

export {
  generatePipelinePOAM,
} from './auto-poam';

export type {
  PipelineMetadata,
} from './auto-poam';
