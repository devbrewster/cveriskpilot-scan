/**
 * Dogfood Validation Script
 *
 * Verifies all 10 compliance frameworks produce real control hits from the
 * cross-framework mapping engine.  Run with:
 *
 *   npx tsx scripts/dogfood-validate.ts
 */

import {
  mapCweToAllFrameworks,
  type CrossFrameworkMapping,
  type FrameworkControlRef,
} from '../packages/compliance/src/mapping/cross-framework';

import {
  IMPLEMENTED_FRAMEWORKS,
  PLANNED_FRAMEWORKS,
  FRAMEWORK_PRESETS,
  resolvePreset,
} from '../packages/scan/src/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
    if (detail) console.log(`        ${detail}`);
  }
}

/** Collect all unique framework IDs hit by a set of cross-framework mappings. */
function hitFrameworks(mappings: CrossFrameworkMapping[]): Set<string> {
  const ids = new Set<string>();
  for (const m of mappings) {
    for (const c of m.mappedControls) {
      ids.add(c.frameworkId);
    }
  }
  return ids;
}

/** Check that specific controls appear in the mapping results. */
function hasControl(
  mappings: CrossFrameworkMapping[],
  controlId: string,
): boolean {
  return mappings.some((m) =>
    m.mappedControls.some((c) => c.controlId === controlId),
  );
}

/** All unique NIST control IDs in the bridge that have cross-framework entries. */
function allNistControlIds(mappings: CrossFrameworkMapping[]): string[] {
  return [...new Set(mappings.map((m) => m.nistControlId))];
}

// ---------------------------------------------------------------------------
// Collect all mappings for the test CWEs up front
// ---------------------------------------------------------------------------

const CWE_798 = mapCweToAllFrameworks('CWE-798');
const CWE_862 = mapCweToAllFrameworks('CWE-862');
const CWE_79 = mapCweToAllFrameworks('CWE-79');
const CWE_522 = mapCweToAllFrameworks('CWE-522');

const ALL_TEST_CWES = [...CWE_798, ...CWE_862, ...CWE_79, ...CWE_522];

// ---------------------------------------------------------------------------
// 1. CWE-798 (Hardcoded Credentials) specific control checks
// ---------------------------------------------------------------------------

console.log('\n--- CWE-798 (Hardcoded Credentials) ---');

assert(CWE_798.length > 0, 'CWE-798 produces mappings');
assert(
  hasControl(CWE_798, '164.312(d)'),
  'CWE-798 -> HIPAA 164.312(d)',
  `Controls found: ${CWE_798.flatMap((m) => m.mappedControls.map((c) => c.controlId)).join(', ')}`,
);
assert(
  hasControl(CWE_798, 'Req-8.3'),
  'CWE-798 -> PCI-DSS Req-8.3',
);
assert(
  hasControl(CWE_798, 'A.8.5'),
  'CWE-798 -> ISO 27001 A.8.5',
);
assert(
  hasControl(CWE_798, 'Art.32'),
  'CWE-798 -> GDPR Art.32',
);

// ---------------------------------------------------------------------------
// 2. CWE-862 (Missing Authorization) framework coverage
// ---------------------------------------------------------------------------

console.log('\n--- CWE-862 (Missing Authorization) ---');

const hit862 = hitFrameworks(CWE_862);
assert(CWE_862.length > 0, 'CWE-862 produces mappings');

// CWE-862 maps to AC-3, which has bridges for: cmmc, soc2, fedramp, asvs,
// gdpr, hipaa, pci-dss, iso-27001 plus nist-800-53 itself = 9.
// nist-ssdf is not in the bridge table so 9 is the realistic max here.
const expected862 = [
  'nist-800-53',
  'cmmc-level2',
  'soc2-type2',
  'fedramp-moderate',
  'owasp-asvs',
  'gdpr',
  'hipaa',
  'pci-dss',
  'iso-27001',
];
for (const fw of expected862) {
  assert(
    hit862.has(fw),
    `CWE-862 hits ${fw}`,
    `Frameworks hit: ${[...hit862].join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// 3. CWE-79 (XSS) framework coverage
// ---------------------------------------------------------------------------

console.log('\n--- CWE-79 (XSS) ---');

const hit79 = hitFrameworks(CWE_79);
assert(CWE_79.length > 0, 'CWE-79 produces mappings');

const expected79 = [
  'nist-800-53',
  'soc2-type2',
  'cmmc-level2',
  'fedramp-moderate',
  'owasp-asvs',
];
for (const fw of expected79) {
  assert(
    hit79.has(fw),
    `CWE-79 hits ${fw}`,
    `Frameworks hit: ${[...hit79].join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// 4. CWE-522 (Insufficient Credential Protection) framework coverage
// ---------------------------------------------------------------------------

console.log('\n--- CWE-522 (Insufficient Credential Protection) ---');

const hit522 = hitFrameworks(CWE_522);
assert(CWE_522.length > 0, 'CWE-522 produces mappings');

const expected522 = ['nist-800-53', 'owasp-asvs'];
for (const fw of expected522) {
  assert(
    hit522.has(fw),
    `CWE-522 hits ${fw}`,
    `Frameworks hit: ${[...hit522].join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// 5. Coverage matrix: each NIST control -> which frameworks have mappings
// ---------------------------------------------------------------------------

console.log('\n--- Coverage Matrix (NIST control -> frameworks) ---');

const frameworkIds = Object.keys(IMPLEMENTED_FRAMEWORKS);
// nist-ssdf is implemented but not in the bridge, so we show all 10
const headerCols = frameworkIds.map((f) => f.replace(/-/g, '').slice(0, 8));

console.log(
  `  ${'NIST Ctrl'.padEnd(10)} ${headerCols.map((c) => c.padEnd(10)).join('')}`,
);
console.log(`  ${'─'.repeat(10)} ${headerCols.map(() => '─'.repeat(10)).join('')}`);

const nistIds = allNistControlIds(ALL_TEST_CWES);
nistIds.sort();

for (const nistId of nistIds) {
  const mappingsForCtrl = ALL_TEST_CWES.filter(
    (m) => m.nistControlId === nistId,
  );
  const fwHits = hitFrameworks(mappingsForCtrl);

  const row = frameworkIds
    .map((fw) => (fwHits.has(fw) ? '\u2713' : '\u2717').padEnd(10))
    .join('');
  console.log(`  ${nistId.padEnd(10)} ${row}`);
}

// ---------------------------------------------------------------------------
// 6. Each of the 10 implemented frameworks has >= 1 hit from test CWEs
// ---------------------------------------------------------------------------

console.log('\n--- Framework Completeness ---');

const allHitFw = hitFrameworks(ALL_TEST_CWES);

for (const fwId of frameworkIds) {
  assert(
    allHitFw.has(fwId),
    `Framework ${fwId} has >= 1 affected control from test CWEs`,
    `Frameworks with hits: ${[...allHitFw].join(', ')}`,
  );
}

// ---------------------------------------------------------------------------
// 7. PLANNED_FRAMEWORKS should be empty (all moved to IMPLEMENTED)
// ---------------------------------------------------------------------------

console.log('\n--- Planned Frameworks ---');

const plannedKeys = Object.keys(PLANNED_FRAMEWORKS);
assert(
  plannedKeys.length === 0,
  'PLANNED_FRAMEWORKS is empty (all promoted to IMPLEMENTED)',
  `Still planned: ${plannedKeys.join(', ')}`,
);

// ---------------------------------------------------------------------------
// 8. Each preset resolves to a non-null, non-empty array of valid framework IDs
// ---------------------------------------------------------------------------

console.log('\n--- Preset Resolution ---');

for (const preset of Object.keys(FRAMEWORK_PRESETS)) {
  const resolved = resolvePreset(preset);
  assert(
    resolved !== null && resolved.length > 0,
    `Preset "${preset}" resolves to ${resolved?.length ?? 0} framework(s)`,
    resolved ? `Frameworks: ${resolved.join(', ')}` : 'Returned null',
  );

  // Each resolved ID should be in IMPLEMENTED_FRAMEWORKS
  if (resolved) {
    for (const fwId of resolved) {
      assert(
        fwId in IMPLEMENTED_FRAMEWORKS,
        `Preset "${preset}" -> "${fwId}" is implemented`,
        `"${fwId}" not found in IMPLEMENTED_FRAMEWORKS`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60));
console.log(`  PASSED: ${passed}   FAILED: ${failed}   TOTAL: ${passed + failed}`);
console.log('='.repeat(60) + '\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All dogfood validations passed.\n');
  process.exit(0);
}
