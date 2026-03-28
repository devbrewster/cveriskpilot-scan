/**
 * @cveriskpilot/scan — CLI scanner + library exports
 *
 * Usage as CLI:
 *   npx @cveriskpilot/scan [flags]
 *
 * Usage as library:
 *   import { scanDependencies, scanSecrets, scanIaC } from '@cveriskpilot/scan';
 */

export { scanDependencies } from './scanners/sbom-scanner.js';
export type { SbomScanResult, Dependency, CycloneDxBom, Advisory } from './scanners/sbom-scanner.js';

export { scanSecrets } from './scanners/secrets-scanner.js';
export type { SecretsScanResult, SecretMatch, SecretPattern } from './scanners/secrets-scanner.js';

export { scanIaC } from './scanners/iac-scanner.js';
export type { IacScanResult, IacRule, IacViolation, IacFileType } from './scanners/iac-scanner.js';

export { formatOutput, severityRank } from './output.js';
export type { OutputFormat, ScanSummary } from './output.js';

export {
  IMPLEMENTED_FRAMEWORKS,
  FRAMEWORK_ALIASES,
  FRAMEWORK_PRESETS,
  PLANNED_FRAMEWORKS,
  SEVERITY_ORDER,
  resolveFrameworks,
  resolvePreset,
} from './constants.js';
export type { FrameworkResolution } from './constants.js';
