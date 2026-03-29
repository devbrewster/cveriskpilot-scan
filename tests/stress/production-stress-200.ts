/**
 * CVERiskPilot Production Stress Test — 200 Concurrent Analysts
 *
 * Simulates 200 analysts performing the complete workflow:
 *   1. Login/Signup
 *   2. Dashboard load
 *   3. Upload scan file
 *   4. Browse & filter findings
 *   5. Create/manage cases
 *   6. AI remediation request
 *   7. Generate reports
 *   8. Compliance checks
 *   9. Export findings
 *  10. Logout
 *
 * Usage:
 *   npx tsx tests/stress/production-stress-200.ts [BASE_URL] [ANALYST_COUNT]
 *
 * Defaults: http://localhost:3000, 200 analysts
 */

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ANALYST_COUNT = parseInt(process.argv[3] ?? '200', 10);
const RUN_ID = Date.now();
const BATCH_SIZE = 25; // Concurrent analysts per wave
const WAVE_DELAY_MS = 500; // Delay between waves (ramp-up)

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimedResult {
  step: string;
  status: number;
  durationMs: number;
  error?: string;
  body?: Record<string, unknown>;
}

interface AnalystResult {
  analystId: number;
  email: string;
  steps: TimedResult[];
  totalMs: number;
  success: boolean;
}

interface StepAggregate {
  step: string;
  total: number;
  successes: number;
  failures: number;
  errors: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

// ─── HTTP Helpers ───────────────────────────────────────────────────────────

async function timedFetch(
  step: string,
  url: string,
  opts: RequestInit,
): Promise<TimedResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...opts,
      signal: AbortSignal.timeout(30_000),
    });
    const durationMs = Math.round(performance.now() - start);
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // non-JSON
    }
    return { step, status: res.status, durationMs, body };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return { step, status: 0, durationMs, error: message };
  }
}

function jsonPost(step: string, url: string, data: unknown, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, url, { method: 'POST', headers, body: JSON.stringify(data) });
}

function jsonPut(step: string, url: string, data: unknown, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, url, { method: 'PUT', headers, body: JSON.stringify(data) });
}

function jsonGet(step: string, url: string, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, url, { method: 'GET', headers });
}

// ─── Sample Scan Data ───────────────────────────────────────────────────────

function generateNessusXml(analystId: number): string {
  const findings = Array.from({ length: 5 }, (_, i) => `
    <ReportHost name="host-${analystId}-${i}.corp.local">
      <HostProperties>
        <tag name="host-ip">10.${analystId % 256}.${i}.1</tag>
        <tag name="HOST_START">Mon Mar 27 08:00:00 2026</tag>
        <tag name="HOST_END">Mon Mar 27 09:00:00 2026</tag>
      </HostProperties>
      <ReportItem port="${80 + i}" svc_name="http" protocol="tcp" severity="${(i % 4) + 1}" pluginID="${10000 + analystId * 10 + i}" pluginName="Test Vuln ${analystId}-${i}" pluginFamily="Web Servers">
        <description>Stress test vulnerability ${analystId}-${i} found on host.</description>
        <synopsis>Test finding for stress test analyst ${analystId}.</synopsis>
        <solution>Apply vendor patch or upgrade to latest version.</solution>
        <risk_factor>${['None', 'Low', 'Medium', 'High', 'Critical'][i % 5]}</risk_factor>
        <cvss3_base_score>${(5.0 + (i * 1.5)).toFixed(1)}</cvss3_base_score>
        <cve>CVE-2024-${String(analystId * 10 + i).padStart(5, '0')}</cve>
      </ReportItem>
    </ReportHost>`).join('\n');

  return `<?xml version="1.0"?>
<NessusClientData_v2>
  <Report name="stress-scan-${analystId}">
    ${findings}
  </Report>
</NessusClientData_v2>`;
}

function generateSarifJson(analystId: number): string {
  const results = Array.from({ length: 3 }, (_, i) => ({
    ruleId: `VULN-${analystId}-${i}`,
    level: ['error', 'warning', 'note'][i % 3],
    message: { text: `SARIF finding ${analystId}-${i}: potential vulnerability in component` },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: `src/app/module-${analystId}/file-${i}.ts` },
        region: { startLine: 10 + i, startColumn: 1 },
      },
    }],
  }));

  return JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: `StressTool-${analystId}`, version: '1.0.0', rules: [] } },
      results,
    }],
  });
}

function generateCsvContent(analystId: number): string {
  const header = 'CVE,Title,Severity,Host,Description,Solution\n';
  const rows = Array.from({ length: 4 }, (_, i) =>
    `CVE-2024-${String(analystId * 100 + i).padStart(5, '0')},CSV Vuln ${analystId}-${i},${['Critical', 'High', 'Medium', 'Low'][i % 4]},csv-host-${analystId}-${i}.local,"CSV finding ${analystId}-${i}","Upgrade package"`,
  ).join('\n');
  return header + rows;
}

// ─── Analyst Workflow ───────────────────────────────────────────────────────

async function runAnalystWorkflow(analystId: number): Promise<AnalystResult> {
  const workflowStart = performance.now();
  const steps: TimedResult[] = [];
  const email = `analyst${analystId}_${RUN_ID}@stresstest.com`;
  const password = 'StressTest1!xx';
  const orgName = `StressOrg-${analystId}-${RUN_ID}`;
  let cookie = '';
  let organizationId = '';
  let findingIds: string[] = [];
  let caseIds: string[] = [];

  // ── Step 1: Signup ──
  const signup = await jsonPost('1-signup', `${BASE_URL}/api/auth/signup`, {
    name: `Analyst ${analystId}`,
    email,
    password,
    orgName,
  });
  steps.push(signup);
  if (signup.body?.organizationId) {
    organizationId = String(signup.body.organizationId);
  }

  // ── Step 2: Login ──
  const login = await jsonPost('2-login', `${BASE_URL}/api/auth/login`, {
    email,
    password,
  });
  steps.push(login);
  if (login.body?.token) {
    cookie = `session=${login.body.token}`;
  }

  // ── Step 3: Load Dashboard ──
  const dashboard = await jsonGet(
    '3-dashboard',
    `${BASE_URL}/api/dashboard?organizationId=${organizationId}`,
    cookie,
  );
  steps.push(dashboard);

  // ── Step 4: Upload Nessus Scan ──
  const scanFormat = analystId % 3; // Rotate formats
  let scanContent: string;
  let fileName: string;
  let mimeType: string;

  if (scanFormat === 0) {
    scanContent = generateNessusXml(analystId);
    fileName = `stress-scan-${analystId}.nessus`;
    mimeType = 'text/xml';
  } else if (scanFormat === 1) {
    scanContent = generateSarifJson(analystId);
    fileName = `stress-scan-${analystId}.sarif`;
    mimeType = 'application/json';
  } else {
    scanContent = generateCsvContent(analystId);
    fileName = `stress-scan-${analystId}.csv`;
    mimeType = 'text/csv';
  }

  const formData = new FormData();
  formData.append('file', new Blob([scanContent], { type: mimeType }), fileName);
  if (organizationId) formData.append('organizationId', organizationId);

  const uploadStart = performance.now();
  try {
    const uploadHeaders: Record<string, string> = {};
    if (cookie) uploadHeaders['Cookie'] = cookie;

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
    const uploadDuration = Math.round(performance.now() - uploadStart);
    let uploadBody: Record<string, unknown> = {};
    try { uploadBody = (await uploadRes.json()) as Record<string, unknown>; } catch { /* ignored */ }
    steps.push({ step: '4-upload-scan', status: uploadRes.status, durationMs: uploadDuration, body: uploadBody });

    // Poll job status if we got a jobId
    if (uploadBody.jobId) {
      let jobComplete = false;
      let pollCount = 0;
      while (!jobComplete && pollCount < 10) {
        await new Promise((r) => setTimeout(r, 1000));
        const jobCheck = await jsonGet(
          '4b-upload-poll',
          `${BASE_URL}/api/upload/${uploadBody.jobId}`,
          cookie,
        );
        pollCount++;
        if (jobCheck.body?.status === 'COMPLETE' || jobCheck.body?.status === 'FAILED') {
          jobComplete = true;
          steps.push(jobCheck);
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: '4-upload-scan', status: 0, durationMs: Math.round(performance.now() - uploadStart), error: msg });
  }

  // ── Step 5: List Findings (with filters) ──
  const findingsQueries = [
    `organizationId=${organizationId}&severity=CRITICAL&limit=20`,
    `organizationId=${organizationId}&severity=HIGH&limit=20`,
    `organizationId=${organizationId}&limit=50`,
  ];

  for (let qi = 0; qi < findingsQueries.length; qi++) {
    const findingsResult = await jsonGet(
      `5-findings-filter-${qi}`,
      `${BASE_URL}/api/findings?${findingsQueries[qi]}`,
      cookie,
    );
    steps.push(findingsResult);

    // Collect finding IDs for case creation
    if (findingsResult.body?.findings && Array.isArray(findingsResult.body.findings)) {
      const ids = (findingsResult.body.findings as Array<{ id?: string }>)
        .filter((f) => f.id)
        .map((f) => f.id!);
      findingIds.push(...ids);
    }
  }

  // ── Step 6: View Individual Finding Detail ──
  if (findingIds.length > 0) {
    const detailId = findingIds[0];
    const findingDetail = await jsonGet(
      '6-finding-detail',
      `${BASE_URL}/api/findings/${detailId}`,
      cookie,
    );
    steps.push(findingDetail);
  } else {
    steps.push({ step: '6-finding-detail', status: -1, durationMs: 0, error: 'No findings available' });
  }

  // ── Step 7: Build Cases from Findings ──
  const buildCases = await jsonPost('7-build-cases', `${BASE_URL}/api/cases/build`, {
    organizationId,
    findingIds: findingIds.slice(0, 10),
  }, cookie);
  steps.push(buildCases);

  // ── Step 8: List Cases ──
  const listCases = await jsonGet(
    '8-list-cases',
    `${BASE_URL}/api/cases?organizationId=${organizationId}&limit=20`,
    cookie,
  );
  steps.push(listCases);

  if (listCases.body?.cases && Array.isArray(listCases.body.cases)) {
    caseIds = (listCases.body.cases as Array<{ id?: string }>)
      .filter((c) => c.id)
      .map((c) => c.id!);
  }

  // ── Step 9: Update Case Status (Triage) ──
  if (caseIds.length > 0) {
    const triageCase = await jsonPut('9-triage-case', `${BASE_URL}/api/cases/${caseIds[0]}`, {
      status: 'IN_TRIAGE',
      organizationId,
    }, cookie);
    steps.push(triageCase);
  } else {
    steps.push({ step: '9-triage-case', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // ── Step 10: Add Case Comment ──
  if (caseIds.length > 0) {
    const comment = await jsonPost('10-case-comment', `${BASE_URL}/api/cases/${caseIds[0]}/comments`, {
      content: `Stress test comment from analyst ${analystId}. Investigating vulnerability details and verifying remediation steps.`,
      organizationId,
    }, cookie);
    steps.push(comment);
  } else {
    steps.push({ step: '10-case-comment', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // ── Step 11: Bulk Update Cases ──
  if (caseIds.length >= 2) {
    const bulkUpdate = await jsonPost('11-bulk-update', `${BASE_URL}/api/cases/bulk`, {
      caseIds: caseIds.slice(0, 5),
      status: 'IN_REMEDIATION',
      organizationId,
    }, cookie);
    steps.push(bulkUpdate);
  } else {
    steps.push({ step: '11-bulk-update', status: -1, durationMs: 0, error: 'Not enough cases' });
  }

  // ── Step 12: AI Remediation ──
  const aiRemediation = await jsonPost('12-ai-remediation', `${BASE_URL}/api/ai/remediation`, {
    findingTitle: `CVE-2024-${String(analystId).padStart(5, '0')} — Remote Code Execution`,
    severity: 'CRITICAL',
    description: 'A remote code execution vulnerability allows unauthenticated attackers to execute arbitrary commands.',
    organizationId,
  }, cookie);
  steps.push(aiRemediation);

  // ── Step 13: Generate Executive Report ──
  const genReport = await jsonPost('13-generate-report', `${BASE_URL}/api/reports/generate`, {
    type: 'executive',
    format: 'pdf',
    organizationId,
    dateRange: {
      start: '2026-01-01T00:00:00Z',
      end: '2026-03-27T23:59:59Z',
    },
  }, cookie);
  steps.push(genReport);

  // ── Step 14: Compliance — List Frameworks ──
  const frameworks = await jsonGet(
    '14-compliance-frameworks',
    `${BASE_URL}/api/compliance/frameworks?organizationId=${organizationId}`,
    cookie,
  );
  steps.push(frameworks);

  // ── Step 15: Compliance — POAM ──
  const poam = await jsonGet(
    '15-compliance-poam',
    `${BASE_URL}/api/compliance/poam?organizationId=${organizationId}`,
    cookie,
  );
  steps.push(poam);

  // ── Step 16: SLA Check ──
  const slaCheck = await jsonGet(
    '16-sla-check',
    `${BASE_URL}/api/sla/check?organizationId=${organizationId}`,
    cookie,
  );
  steps.push(slaCheck);

  // ── Step 17: Export Findings CSV ──
  const exportCsv = await jsonGet(
    '17-export-csv',
    `${BASE_URL}/api/export/findings?organizationId=${organizationId}&format=csv`,
    cookie,
  );
  steps.push(exportCsv);

  // ── Step 18: Portfolio Overview ──
  const portfolio = await jsonGet(
    '18-portfolio',
    `${BASE_URL}/api/portfolio?organizationId=${organizationId}`,
    cookie,
  );
  steps.push(portfolio);

  // ── Step 19: Billing Usage Check ──
  const usage = await jsonGet(
    '19-billing-usage',
    `${BASE_URL}/api/billing/usage?organizationId=${organizationId}`,
    cookie,
  );
  steps.push(usage);

  // ── Step 20: Notifications ──
  const notifications = await jsonGet(
    '20-notifications',
    `${BASE_URL}/api/notifications?organizationId=${organizationId}`,
    cookie,
  );
  steps.push(notifications);

  // ── Step 21: Logout ──
  const logout = await jsonPost('21-logout', `${BASE_URL}/api/auth/logout`, {}, cookie);
  steps.push(logout);

  const totalMs = Math.round(performance.now() - workflowStart);
  const hasError = steps.some((s) => s.status === 0 || s.status >= 500);

  return {
    analystId,
    email,
    steps,
    totalMs,
    success: !hasError,
  };
}

// ─── Batch Execution with Ramp-Up ───────────────────────────────────────────

async function runInWaves(
  totalAnalysts: number,
  batchSize: number,
  delayMs: number,
): Promise<AnalystResult[]> {
  const results: AnalystResult[] = [];
  const waves = Math.ceil(totalAnalysts / batchSize);

  console.log(`\nRamp-up plan: ${waves} waves × ${batchSize} analysts (${delayMs}ms between waves)`);
  console.log('─'.repeat(80));

  for (let wave = 0; wave < waves; wave++) {
    const startIdx = wave * batchSize;
    const endIdx = Math.min(startIdx + batchSize, totalAnalysts);
    const batchCount = endIdx - startIdx;

    const waveStart = performance.now();
    console.log(`\n  Wave ${wave + 1}/${waves}: launching analysts ${startIdx + 1}–${endIdx}...`);

    const promises = Array.from({ length: batchCount }, (_, i) =>
      runAnalystWorkflow(startIdx + i + 1),
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    const waveMs = Math.round(performance.now() - waveStart);
    const successes = batchResults.filter((r) => r.success).length;
    console.log(`  Wave ${wave + 1} complete: ${successes}/${batchCount} passed (${waveMs}ms)`);

    // Ramp-up delay between waves
    if (wave < waves - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return results;
}

// ─── Percentile Calculation ─────────────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Report Generation ──────────────────────────────────────────────────────

function generateReport(results: AnalystResult[]): void {
  const totalAnalysts = results.length;
  const successfulAnalysts = results.filter((r) => r.success).length;
  const failedAnalysts = totalAnalysts - successfulAnalysts;

  // Aggregate by step
  const stepMap = new Map<string, number[]>();
  const stepSuccessMap = new Map<string, number>();
  const stepFailMap = new Map<string, number>();
  const stepErrorMap = new Map<string, number>();

  for (const result of results) {
    for (const step of result.steps) {
      if (!stepMap.has(step.step)) {
        stepMap.set(step.step, []);
        stepSuccessMap.set(step.step, 0);
        stepFailMap.set(step.step, 0);
        stepErrorMap.set(step.step, 0);
      }

      stepMap.get(step.step)!.push(step.durationMs);

      if (step.status === 0) {
        stepErrorMap.set(step.step, (stepErrorMap.get(step.step) ?? 0) + 1);
      } else if (step.status >= 200 && step.status < 400) {
        stepSuccessMap.set(step.step, (stepSuccessMap.get(step.step) ?? 0) + 1);
      } else if (step.status === -1) {
        // Skipped step (no data available)
      } else {
        stepFailMap.set(step.step, (stepFailMap.get(step.step) ?? 0) + 1);
      }
    }
  }

  const aggregates: StepAggregate[] = [];
  for (const [step, durations] of stepMap.entries()) {
    const validDurations = durations.filter((d) => d > 0);
    aggregates.push({
      step,
      total: durations.length,
      successes: stepSuccessMap.get(step) ?? 0,
      failures: stepFailMap.get(step) ?? 0,
      errors: stepErrorMap.get(step) ?? 0,
      avgMs: validDurations.length > 0
        ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
        : 0,
      p50Ms: percentile(validDurations, 50),
      p95Ms: percentile(validDurations, 95),
      p99Ms: percentile(validDurations, 99),
      minMs: validDurations.length > 0 ? Math.min(...validDurations) : 0,
      maxMs: validDurations.length > 0 ? Math.max(...validDurations) : 0,
    });
  }

  // Overall workflow durations
  const workflowDurations = results.map((r) => r.totalMs);
  const totalRequests = results.reduce((acc, r) => acc + r.steps.length, 0);
  const totalErrors = results.reduce(
    (acc, r) => acc + r.steps.filter((s) => s.status === 0).length, 0,
  );
  const total5xx = results.reduce(
    (acc, r) => acc + r.steps.filter((s) => s.status >= 500).length, 0,
  );

  // ── Print Report ──

  console.log('\n');
  console.log('╔' + '═'.repeat(108) + '╗');
  console.log('║' + '  CVERiskPilot Production Stress Test Report'.padEnd(108) + '║');
  console.log('║' + `  ${new Date().toISOString()}`.padEnd(108) + '║');
  console.log('╠' + '═'.repeat(108) + '╣');

  // Overview
  console.log('║' + '  OVERVIEW'.padEnd(108) + '║');
  console.log('║' + `  Analysts: ${totalAnalysts} | Passed: ${successfulAnalysts} | Failed: ${failedAnalysts} | Pass Rate: ${((successfulAnalysts / totalAnalysts) * 100).toFixed(1)}%`.padEnd(108) + '║');
  console.log('║' + `  Total Requests: ${totalRequests} | 5xx Errors: ${total5xx} | Connection Errors: ${totalErrors}`.padEnd(108) + '║');
  console.log('║' + `  Error Rate: ${(((total5xx + totalErrors) / totalRequests) * 100).toFixed(2)}%`.padEnd(108) + '║');
  console.log('╠' + '═'.repeat(108) + '╣');

  // Workflow timing
  console.log('║' + '  WORKFLOW TIMING (end-to-end per analyst)'.padEnd(108) + '║');
  console.log('║' + `  Avg: ${Math.round(workflowDurations.reduce((a, b) => a + b, 0) / workflowDurations.length)}ms | P50: ${percentile(workflowDurations, 50)}ms | P95: ${percentile(workflowDurations, 95)}ms | P99: ${percentile(workflowDurations, 99)}ms | Max: ${Math.max(...workflowDurations)}ms`.padEnd(108) + '║');
  console.log('╠' + '═'.repeat(108) + '╣');

  // Step-by-step breakdown
  console.log('║' + '  STEP-BY-STEP BREAKDOWN'.padEnd(108) + '║');
  console.log('╟' + '─'.repeat(108) + '╢');

  const colHeader = [
    'Step'.padEnd(26),
    'Total'.padStart(5),
    'OK'.padStart(5),
    'Fail'.padStart(5),
    'Err'.padStart(4),
    'Avg'.padStart(7),
    'P50'.padStart(7),
    'P95'.padStart(7),
    'P99'.padStart(7),
    'Min'.padStart(7),
    'Max'.padStart(7),
  ].join(' │ ');
  console.log('║  ' + colHeader.padEnd(106) + '║');
  console.log('╟' + '─'.repeat(108) + '╢');

  for (const agg of aggregates) {
    const row = [
      agg.step.padEnd(26),
      String(agg.total).padStart(5),
      String(agg.successes).padStart(5),
      String(agg.failures).padStart(5),
      String(agg.errors).padStart(4),
      `${agg.avgMs}ms`.padStart(7),
      `${agg.p50Ms}ms`.padStart(7),
      `${agg.p95Ms}ms`.padStart(7),
      `${agg.p99Ms}ms`.padStart(7),
      `${agg.minMs}ms`.padStart(7),
      `${agg.maxMs}ms`.padStart(7),
    ].join(' │ ');
    console.log('║  ' + row.padEnd(106) + '║');
  }

  console.log('╠' + '═'.repeat(108) + '╣');

  // SLA Thresholds
  console.log('║' + '  PRODUCTION SLA ASSESSMENT'.padEnd(108) + '║');
  console.log('╟' + '─'.repeat(108) + '╢');

  const slaChecks = [
    { name: 'API Response P95 < 2000ms', pass: aggregates.every((a) => a.p95Ms < 2000) },
    { name: 'API Response P99 < 5000ms', pass: aggregates.every((a) => a.p99Ms < 5000) },
    { name: 'Error Rate < 1%', pass: ((total5xx + totalErrors) / totalRequests) < 0.01 },
    { name: 'Error Rate < 5%', pass: ((total5xx + totalErrors) / totalRequests) < 0.05 },
    { name: 'Zero Connection Errors', pass: totalErrors === 0 },
    { name: 'Analyst Pass Rate > 95%', pass: (successfulAnalysts / totalAnalysts) > 0.95 },
    { name: 'Analyst Pass Rate > 80%', pass: (successfulAnalysts / totalAnalysts) > 0.80 },
    { name: 'Workflow P95 < 60s', pass: percentile(workflowDurations, 95) < 60_000 },
    { name: 'Upload P95 < 10s', pass: (aggregates.find((a) => a.step === '4-upload-scan')?.p95Ms ?? 0) < 10_000 },
    { name: 'Dashboard P95 < 1s', pass: (aggregates.find((a) => a.step === '3-dashboard')?.p95Ms ?? 0) < 1000 },
  ];

  for (const check of slaChecks) {
    const icon = check.pass ? 'PASS' : 'FAIL';
    const line = `  [${icon}] ${check.name}`;
    console.log('║' + line.padEnd(108) + '║');
  }

  const passedSla = slaChecks.filter((c) => c.pass).length;
  console.log('╟' + '─'.repeat(108) + '╢');
  console.log('║' + `  SLA Score: ${passedSla}/${slaChecks.length} checks passed`.padEnd(108) + '║');

  console.log('╠' + '═'.repeat(108) + '╣');

  // Bottleneck analysis
  const slowestSteps = [...aggregates].sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 5);
  console.log('║' + '  TOP 5 SLOWEST ENDPOINTS (by P95)'.padEnd(108) + '║');
  console.log('╟' + '─'.repeat(108) + '╢');
  for (const s of slowestSteps) {
    const line = `  ${s.step.padEnd(28)} P95: ${s.p95Ms}ms  P99: ${s.p99Ms}ms  Avg: ${s.avgMs}ms`;
    console.log('║' + line.padEnd(108) + '║');
  }

  // Most errors
  const errorSteps = [...aggregates].filter((a) => a.failures + a.errors > 0).sort((a, b) => (b.failures + b.errors) - (a.failures + a.errors));
  if (errorSteps.length > 0) {
    console.log('╠' + '═'.repeat(108) + '╣');
    console.log('║' + '  ENDPOINTS WITH ERRORS'.padEnd(108) + '║');
    console.log('╟' + '─'.repeat(108) + '╢');
    for (const s of errorSteps.slice(0, 10)) {
      const line = `  ${s.step.padEnd(28)} Failures: ${s.failures}  ConnErrors: ${s.errors}  (${((s.failures + s.errors) / s.total * 100).toFixed(1)}%)`;
      console.log('║' + line.padEnd(108) + '║');
    }
  }

  // Throughput
  const totalTestTimeMs = Math.max(...workflowDurations);
  const rps = totalRequests / (totalTestTimeMs / 1000);
  console.log('╠' + '═'.repeat(108) + '╣');
  console.log('║' + '  THROUGHPUT'.padEnd(108) + '║');
  console.log('╟' + '─'.repeat(108) + '╢');
  console.log('║' + `  Total Requests: ${totalRequests}`.padEnd(108) + '║');
  console.log('║' + `  Test Duration: ${(totalTestTimeMs / 1000).toFixed(1)}s`.padEnd(108) + '║');
  console.log('║' + `  Effective RPS: ~${rps.toFixed(1)} req/s`.padEnd(108) + '║');

  // Final verdict
  console.log('╠' + '═'.repeat(108) + '╣');
  const verdict = passedSla >= 8
    ? 'PRODUCTION READY — All critical SLAs met'
    : passedSla >= 5
      ? 'CONDITIONAL — Some SLAs not met; review bottlenecks before launch'
      : 'NOT READY — Critical SLA failures; performance optimization required';

  console.log('║' + `  VERDICT: ${verdict}`.padEnd(108) + '║');
  console.log('╚' + '═'.repeat(108) + '╝');

  // Unique error samples
  const errorSamples = new Map<string, string>();
  for (const r of results) {
    for (const s of r.steps) {
      if (s.error && !errorSamples.has(s.step)) {
        errorSamples.set(s.step, s.error);
      }
    }
  }
  if (errorSamples.size > 0) {
    console.log('\nError Samples (one per step):');
    for (const [step, err] of errorSamples.entries()) {
      console.log(`  [${step}] ${err.slice(0, 120)}`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔' + '═'.repeat(60) + '╗');
  console.log('║  CVERiskPilot Production Stress Test'.padEnd(61) + '║');
  console.log('║  200 Analysts — Full Workflow Simulation'.padEnd(61) + '║');
  console.log('╠' + '═'.repeat(60) + '╣');
  console.log('║' + `  Base URL:    ${BASE_URL}`.padEnd(61) + '║');
  console.log('║' + `  Analysts:    ${ANALYST_COUNT}`.padEnd(61) + '║');
  console.log('║' + `  Batch Size:  ${BATCH_SIZE}`.padEnd(61) + '║');
  console.log('║' + `  Run ID:      ${RUN_ID}`.padEnd(61) + '║');
  console.log('║' + `  Timestamp:   ${new Date().toISOString()}`.padEnd(61) + '║');
  console.log('╚' + '═'.repeat(60) + '╝');

  console.log('\nWorkflow per analyst (21 steps):');
  console.log('  1. Signup          2. Login            3. Dashboard');
  console.log('  4. Upload scan     5. Filter findings  6. Finding detail');
  console.log('  7. Build cases     8. List cases       9. Triage case');
  console.log(' 10. Case comment   11. Bulk update     12. AI remediation');
  console.log(' 13. Gen report     14. Frameworks      15. POAM');
  console.log(' 16. SLA check      17. Export CSV       18. Portfolio');
  console.log(' 19. Billing usage  20. Notifications   21. Logout');
  console.log(`\nTotal expected requests: ~${ANALYST_COUNT * 21}`);

  // Connectivity check
  console.log('\nChecking server connectivity...');
  try {
    const check = await fetch(BASE_URL, { method: 'GET', signal: AbortSignal.timeout(5000) });
    console.log(`Server reachable (status ${check.status}).`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nERROR: Cannot reach server at ${BASE_URL}`);
    console.error(`  ${msg}`);
    console.error('\nStart the server first:  npm run dev --workspace=apps/web');
    process.exit(1);
  }

  console.log('\nStarting stress test...');
  const testStart = performance.now();

  const results = await runInWaves(ANALYST_COUNT, BATCH_SIZE, WAVE_DELAY_MS);

  const totalTestMs = Math.round(performance.now() - testStart);
  console.log(`\nAll waves complete. Total execution time: ${(totalTestMs / 1000).toFixed(1)}s`);

  generateReport(results);

  // Write JSON results to file for later analysis
  const reportPath = `tests/stress/results/stress-${RUN_ID}.json`;
  try {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const summary = {
      runId: RUN_ID,
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      analystCount: ANALYST_COUNT,
      batchSize: BATCH_SIZE,
      totalTestMs,
      totalRequests: results.reduce((acc, r) => acc + r.steps.length, 0),
      passedAnalysts: results.filter((r) => r.success).length,
      failedAnalysts: results.filter((r) => !r.success).length,
      stepSummaries: {} as Record<string, { avg: number; p95: number; p99: number; errors: number }>,
    };

    // Aggregate step summaries
    const stepDurations = new Map<string, number[]>();
    const stepErrors = new Map<string, number>();
    for (const r of results) {
      for (const s of r.steps) {
        if (!stepDurations.has(s.step)) stepDurations.set(s.step, []);
        stepDurations.get(s.step)!.push(s.durationMs);
        if (s.status === 0 || s.status >= 500) {
          stepErrors.set(s.step, (stepErrors.get(s.step) ?? 0) + 1);
        }
      }
    }
    for (const [step, durations] of stepDurations.entries()) {
      const valid = durations.filter((d) => d > 0);
      summary.stepSummaries[step] = {
        avg: valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0,
        p95: percentile(valid, 95),
        p99: percentile(valid, 99),
        errors: stepErrors.get(step) ?? 0,
      };
    }

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\nJSON results saved to: ${reportPath}`);
  } catch {
    console.log('\n(Could not write JSON results file)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
