/**
 * CVERiskPilot Compliance Load Test — 1000 Concurrent Analysts
 *
 * Simulates 1000 analysts split across compliance verticals:
 *   - 250 × HIPAA assessment queries (healthcare customers)
 *   - 250 × PCI-DSS assessment queries (payment customers)
 *   - 250 × ISO 27001 assessment queries (international customers)
 *   - 250 × Cross-framework impact across all 10 frameworks
 *
 * Performance targets:
 *   Dashboard load:           P95 < 500ms,  max concurrent 1000
 *   Compliance assessment:    P95 < 1s,     max concurrent 500
 *   POAM generation:          P95 < 3s,     max concurrent 200
 *   PDF export:               P95 < 5s,     max concurrent 100
 *   Scan upload processing:   P95 < 10s,    max concurrent 200
 *   Webhook delivery:         P95 < 2s,     max concurrent 500
 *   AI triage call:           P95 < 8s,     max concurrent 50
 *
 * Usage:
 *   npx tsx tests/stress/compliance-load-1000.ts [BASE_URL] [ANALYST_COUNT]
 */

const BASE_URL = process.env.BASE_URL ?? process.argv[2] ?? 'http://localhost:3000';
const ANALYST_COUNT = parseInt(process.argv[3] ?? '1000', 10);
const BATCH_SIZE = 50;
const WAVE_DELAY_MS = 250;
const REQUEST_TIMEOUT = 30_000;

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimedResult {
  step: string;
  framework: string;
  status: number;
  durationMs: number;
  error?: string;
}

interface AnalystResult {
  analystId: number;
  vertical: string;
  framework: string;
  steps: TimedResult[];
  totalMs: number;
  success: boolean;
}

// ─── HTTP Helper ────────────────────────────────────────────────────────────

async function timedFetch(
  step: string,
  framework: string,
  method: string,
  url: string,
  body?: unknown,
): Promise<TimedResult> {
  const start = performance.now();
  try {
    const opts: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    await res.text(); // consume body
    return { step, framework, status: res.status, durationMs: Math.round(performance.now() - start) };
  } catch (err: unknown) {
    return { step, framework, status: 0, durationMs: Math.round(performance.now() - start), error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Verticals ──────────────────────────────────────────────────────────────

type Vertical = 'healthcare' | 'payments' | 'international' | 'cross-framework';

const VERTICAL_FRAMEWORKS: Record<Vertical, string[]> = {
  'healthcare': ['hipaa', 'nist-800-53'],
  'payments': ['pci-dss', 'nist-800-53', 'soc2-type2'],
  'international': ['iso-27001', 'gdpr'],
  'cross-framework': ['nist-800-53', 'soc2-type2', 'cmmc-level2', 'hipaa', 'pci-dss', 'iso-27001', 'gdpr', 'fedramp-moderate', 'owasp-asvs', 'nist-ssdf'],
};

function getVertical(analystId: number): Vertical {
  const quarter = Math.floor(analystId / (ANALYST_COUNT / 4));
  const verticals: Vertical[] = ['healthcare', 'payments', 'international', 'cross-framework'];
  return verticals[Math.min(quarter, 3)];
}

// ─── Analyst Workflow ───────────────────────────────────────────────────────

async function runAnalyst(analystId: number): Promise<AnalystResult> {
  const vertical = getVertical(analystId);
  const frameworks = VERTICAL_FRAMEWORKS[vertical];
  const primaryFw = frameworks[analystId % frameworks.length];
  const orgId = `stress-org-${analystId}`;
  const steps: TimedResult[] = [];
  const start = performance.now();
  let success = true;

  function push(r: TimedResult) {
    steps.push(r);
    if (r.status === 0 || r.status >= 500) success = false;
  }

  // Step 1: Dashboard load
  push(await timedFetch('dashboard', primaryFw, 'GET', `${BASE_URL}/api/dashboard?organizationId=${orgId}`));

  // Step 2: Framework assessment
  push(await timedFetch('assessment', primaryFw, 'GET', `${BASE_URL}/api/compliance/frameworks/${primaryFw}/assessment?organizationId=${orgId}`));

  // Step 3: POAM generation
  push(await timedFetch('poam', primaryFw, 'POST', `${BASE_URL}/api/compliance/poam/generate`, {
    organizationId: orgId,
    frameworks: [primaryFw],
  }));

  // Step 4: Cross-framework impact (all frameworks in vertical)
  const fwParam = frameworks.join(',');
  push(await timedFetch('impact', primaryFw, 'GET', `${BASE_URL}/api/compliance/impact?organizationId=${orgId}&frameworks=${fwParam}`));

  // Step 5: PDF export
  push(await timedFetch('pdf-export', primaryFw, 'POST', `${BASE_URL}/api/export/pdf`, {
    type: 'compliance',
    format: 'pdf',
    organizationId: orgId,
    framework: primaryFw,
  }));

  // Step 6: Findings filtered by framework
  push(await timedFetch('findings', primaryFw, 'GET', `${BASE_URL}/api/findings?organizationId=${orgId}&framework=${primaryFw}&limit=25`));

  return {
    analystId,
    vertical,
    framework: primaryFw,
    steps,
    totalMs: Math.round(performance.now() - start),
    success,
  };
}

// ─── Statistics ─────────────────────────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

interface StepStats {
  step: string;
  total: number;
  successes: number;
  errors: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

function computeStats(results: AnalystResult[]): { byStep: StepStats[]; byVertical: Record<string, { total: number; successes: number; avgMs: number; p95Ms: number }> } {
  const stepMap = new Map<string, number[]>();
  const stepErrors = new Map<string, number>();
  const verticalMap = new Map<string, { totals: number[]; successes: number }>();

  for (const r of results) {
    // Vertical stats
    const v = verticalMap.get(r.vertical) ?? { totals: [], successes: 0 };
    v.totals.push(r.totalMs);
    if (r.success) v.successes++;
    verticalMap.set(r.vertical, v);

    for (const s of r.steps) {
      const durations = stepMap.get(s.step) ?? [];
      durations.push(s.durationMs);
      stepMap.set(s.step, durations);
      if (s.status === 0 || s.status >= 500) {
        stepErrors.set(s.step, (stepErrors.get(s.step) ?? 0) + 1);
      }
    }
  }

  const byStep: StepStats[] = [];
  for (const [step, durations] of stepMap) {
    const errors = stepErrors.get(step) ?? 0;
    byStep.push({
      step,
      total: durations.length,
      successes: durations.length - errors,
      errors,
      avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
      maxMs: Math.max(...durations),
    });
  }

  const byVertical: Record<string, { total: number; successes: number; avgMs: number; p95Ms: number }> = {};
  for (const [vertical, data] of verticalMap) {
    byVertical[vertical] = {
      total: data.totals.length,
      successes: data.successes,
      avgMs: Math.round(data.totals.reduce((a, b) => a + b, 0) / data.totals.length),
      p95Ms: percentile(data.totals, 95),
    };
  }

  return { byStep, byVertical };
}

// ─── Performance Targets ────────────────────────────────────────────────────

const P95_TARGETS: Record<string, number> = {
  'dashboard': 500,
  'assessment': 1000,
  'poam': 3000,
  'impact': 1000,
  'pdf-export': 5000,
  'findings': 500,
};

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n  CVERiskPilot Compliance Load Test`);
  console.log(`  ${ANALYST_COUNT} analysts | ${BATCH_SIZE}/wave | ${BASE_URL}\n`);

  const allStart = performance.now();
  const results: AnalystResult[] = [];

  // Launch in waves
  for (let wave = 0; wave < Math.ceil(ANALYST_COUNT / BATCH_SIZE); wave++) {
    const start = wave * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, ANALYST_COUNT);
    const batch = Array.from({ length: end - start }, (_, i) => runAnalyst(start + i));

    process.stdout.write(`  Wave ${wave + 1}: analysts ${start}-${end - 1}...`);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    const batchSuccess = batchResults.filter(r => r.success).length;
    console.log(` ${batchSuccess}/${batchResults.length} ok`);

    if (wave < Math.ceil(ANALYST_COUNT / BATCH_SIZE) - 1) {
      await new Promise(resolve => setTimeout(resolve, WAVE_DELAY_MS));
    }
  }

  const totalMs = Math.round(performance.now() - allStart);
  const { byStep, byVertical } = computeStats(results);
  const totalSuccess = results.filter(r => r.success).length;
  const errorRate = ((results.length - totalSuccess) / results.length * 100).toFixed(1);

  // ── Summary ──
  console.log(`\n  ═══════════════════════════════════════════════════════════`);
  console.log(`  Results: ${totalSuccess}/${results.length} analysts succeeded (${errorRate}% error rate)`);
  console.log(`  Total duration: ${(totalMs / 1000).toFixed(1)}s`);

  // ── Per-Step Performance ──
  console.log(`\n  Per-Step Latency:`);
  console.log(`  ${'Step'.padEnd(20)} ${'Total'.padEnd(7)} ${'OK'.padEnd(7)} ${'Err'.padEnd(7)} ${'Avg'.padEnd(8)} ${'P50'.padEnd(8)} ${'P95'.padEnd(8)} ${'P99'.padEnd(8)} ${'Max'.padEnd(8)} Target`);
  console.log(`  ${'-'.repeat(100)}`);

  let targetsMet = 0;
  let targetsTotal = 0;
  for (const s of byStep) {
    const target = P95_TARGETS[s.step];
    const targetStr = target ? `${target}ms` : '-';
    const hit = target ? (s.p95Ms <= target ? '✓' : '✗') : ' ';
    if (target) {
      targetsTotal++;
      if (s.p95Ms <= target) targetsMet++;
    }
    console.log(
      `  ${hit} ${s.step.padEnd(18)} ${String(s.total).padEnd(7)} ${String(s.successes).padEnd(7)} ${String(s.errors).padEnd(7)} ${String(s.avgMs + 'ms').padEnd(8)} ${String(s.p50Ms + 'ms').padEnd(8)} ${String(s.p95Ms + 'ms').padEnd(8)} ${String(s.p99Ms + 'ms').padEnd(8)} ${String(s.maxMs + 'ms').padEnd(8)} ${targetStr}`,
    );
  }

  // ── Per-Vertical ──
  console.log(`\n  Per-Vertical:`);
  console.log(`  ${'Vertical'.padEnd(20)} ${'Total'.padEnd(7)} ${'OK'.padEnd(7)} ${'Avg'.padEnd(10)} P95`);
  console.log(`  ${'-'.repeat(55)}`);
  for (const [vertical, data] of Object.entries(byVertical)) {
    console.log(`  ${vertical.padEnd(20)} ${String(data.total).padEnd(7)} ${String(data.successes).padEnd(7)} ${String(data.avgMs + 'ms').padEnd(10)} ${data.p95Ms}ms`);
  }

  // ── Pass/Fail ──
  console.log(`\n  Performance targets: ${targetsMet}/${targetsTotal} met`);
  const errorRateNum = parseFloat(errorRate);
  const pass = errorRateNum < 1 && targetsMet === targetsTotal;
  console.log(`  Error rate: ${errorRate}% (target: <1%)`);
  console.log(`  Overall: ${pass ? 'PASS ✓' : 'FAIL ✗'}\n`);

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});
