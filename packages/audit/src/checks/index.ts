export { authChecks } from './auth-checks.js';
export { orgScopingCheck } from './org-scoping.js';
export { mockDataCheck } from './mock-data.js';
export { barrelExportsCheck } from './barrel-exports.js';
export { brokenImportsCheck } from './broken-imports.js';
export { hardcodedValuesCheck } from './hardcoded-values.js';
export { silentCatchesCheck } from './silent-catches.js';
export { ssrfVectorsCheck } from './ssrf-vectors.js';
export { secretsPlaintextCheck } from './secrets-plaintext.js';
export { missingDepsCheck } from './missing-deps.js';
export { deadComponentsCheck } from './dead-components.js';
export { csrfCheck } from './csrf-check.js';

import { authChecks } from './auth-checks.js';
import { orgScopingCheck } from './org-scoping.js';
import { mockDataCheck } from './mock-data.js';
import { barrelExportsCheck } from './barrel-exports.js';
import { brokenImportsCheck } from './broken-imports.js';
import { hardcodedValuesCheck } from './hardcoded-values.js';
import { silentCatchesCheck } from './silent-catches.js';
import { ssrfVectorsCheck } from './ssrf-vectors.js';
import { secretsPlaintextCheck } from './secrets-plaintext.js';
import { missingDepsCheck } from './missing-deps.js';
import { deadComponentsCheck } from './dead-components.js';
import { csrfCheck } from './csrf-check.js';
import type { AuditCheck } from '../types.js';

export const allChecks: AuditCheck[] = [
  authChecks,
  orgScopingCheck,
  mockDataCheck,
  barrelExportsCheck,
  brokenImportsCheck,
  hardcodedValuesCheck,
  silentCatchesCheck,
  ssrfVectorsCheck,
  secretsPlaintextCheck,
  missingDepsCheck,
  deadComponentsCheck,
  csrfCheck,
];
