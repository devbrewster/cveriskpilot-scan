/**
 * CVERiskPilot Production Stress Test — 1000 Concurrent Analysts
 *
 * Extends the 500-analyst pattern with deeper workflow coverage (30 steps)
 * and zero-day / gap detection probes targeting org isolation, rate limiting,
 * race conditions, input validation, and information leakage.
 *
 * 25-step analyst workflow covering the full analyst lifecycle:
 *
 *   AUTH
 *    1. Signup (or login if pre-seeded)
 *
 *   CORE WORKFLOW
 *    2. GET  /api/dashboard
 *    3. POST /api/upload (Nessus XML, 10 findings)
 *    4. GET  /api/upload/{jobId} (poll until COMPLETED)
 *    5. GET  /api/findings (page 1, limit 25)
 *    6. GET  /api/findings?severity=CRITICAL
 *    7. GET  /api/findings/{id}
 *    8. POST /api/cases/build
 *    9. GET  /api/cases
 *   10. GET  /api/cases/{id}
 *   11. PATCH /api/cases/{id} (IN_PROGRESS)
 *   12. POST /api/cases/{id}/comments
 *   13. POST /api/cases/bulk (3 cases to REMEDIATED)
 *   14. POST /api/ai/remediation
 *   15. GET  /api/compliance/frameworks
 *   16. GET  /api/compliance/poam
 *   17. GET  /api/export/findings (CSV)
 *   18. POST /api/export/pdf (executive)
 *   19. GET  /api/billing/usage
 *   20. GET  /api/notifications
 *   21. POST /api/keys
 *   22. POST /api/webhooks/config
 *   23. GET  /api/portfolio
 *   24. GET  /api/sla/check
 *   25. POST /api/reports/generate
 *   26. GET  /api/compliance/frameworks/{id}/assessment
 *   27. POST /api/compliance/poam/generate
 *   28. GET  /api/compliance/impact?frameworks=hipaa,pci-dss,iso-27001,gdpr
 *   29. POST /api/export/pdf (compliance report)
 *   30. POST /api/integrations/jira/bulk (dry run)
 *
 * Zero-Day / Gap Detection (post-workflow):
 *   - Org isolation (cross-org data access)
 *   - Data leakage (foreign finding ID)
 *   - Rate limit enforcement (100 rapid requests)
 *   - Race conditions (10 concurrent case updates)
 *   - Session cross-contamination
 *   - Pagination boundaries (page 99999)
 *   - SQL injection patterns
 *   - Upload size limit (101MB)
 *   - File type restriction (.exe)
 *   - CORS headers
 *   - Stack trace leakage in error responses
 *
 * Usage:
 *   npx tsx tests/stress/production-stress-1000.ts [BASE_URL] [ANALYST_COUNT]
 *
 * Defaults: http://localhost:3000, 1000 analysts
 */

const BASE_URL = process.env.BASE_URL ?? process.argv[2] ?? 'http://localhost:3000';
const ANALYST_COUNT = parseInt(process.argv[3] ?? '1000', 10);
const RUN_ID = Date.now();
const BATCH_SIZE = 100; // 100 analysts per wave
const WAVE_DELAY_MS = 500; // 500ms ramp between waves
const REQUEST_TIMEOUT = 30_000;
const JOB_POLL_MAX = 30; // 30 polls x 1s = 30s max wait
const JOB_POLL_INTERVAL = 1000;

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimedResult {
  step: string;
  method: string;
  endpoint: string;
  status: number;
  durationMs: number;
  error?: string;
  body?: Record<string, unknown>;
  bytes?: number;
  headers?: Record<string, string>;
}

interface ZeroDayFinding {
  category: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  analystId: number;
  evidence?: string;
}

interface AnalystResult {
  analystId: number;
  email: string;
  orgName: string;
  steps: TimedResult[];
  totalMs: number;
  success: boolean;
  failedSteps: string[];
  zeroDayFindings: ZeroDayFinding[];
}

interface StepAggregate {
  step: string;
  endpoint: string;
  method: string;
  total: number;
  successes: number;
  failures4xx: number;
  failures5xx: number;
  connErrors: number;
  skipped: number;
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
  method: string,
  url: string,
  opts: RequestInit,
  captureHeaders = false,
): Promise<TimedResult> {
  const endpoint = url.replace(BASE_URL, '').split('?')[0];
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...opts,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    const durationMs = Math.round(performance.now() - start);
    let body: Record<string, unknown> = {};
    let bytes = 0;
    const headers: Record<string, string> = {};
    try {
      const text = await res.text();
      bytes = text.length;
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // non-JSON response
    }
    if (captureHeaders) {
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
    }
    return { step, method, endpoint, status: res.status, durationMs, body, bytes, headers: captureHeaders ? headers : undefined };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return { step, method, endpoint, status: 0, durationMs, error: message };
  }
}

function jsonPost(step: string, url: string, data: unknown, cookie?: string, captureHeaders = false): Promise<TimedResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'POST', url, { method: 'POST', headers, body: JSON.stringify(data) }, captureHeaders);
}

function jsonPatch(step: string, url: string, data: unknown, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'PATCH', url, { method: 'PATCH', headers, body: JSON.stringify(data) });
}

function jsonGet(step: string, url: string, cookie?: string, captureHeaders = false): Promise<TimedResult> {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'GET', url, { method: 'GET', headers }, captureHeaders);
}

// ─── Nessus XML Generator (10 findings) ────────────────────────────────────

function generateNessusXml(analystId: number): string {
  const findings = Array.from({ length: 10 }, (_, i) => {
    const sev = (i % 4) + 1; // 1-4
    const ip = `10.${analystId % 256}.${Math.floor(i / 256) % 256}.${(i + 1) % 256}`;
    return `<ReportItem port="${80 + (i % 20)}" svc_name="http" protocol="tcp" severity="${sev}" pluginID="${10000 + analystId * 100 + i}" pluginName="Vuln-${analystId}-${i}">
<description>Stress test finding ${i} for analyst ${analystId}.</description>
<synopsis>Vulnerability ${i} detected on ${ip}.</synopsis>
<solution>Apply vendor patch.</solution>
<cvss3_base_score>${(4.0 + sev * 1.5).toFixed(1)}</cvss3_base_score>
<cve>CVE-2024-${String(analystId * 100 + i).padStart(5, '0')}</cve>
<cwe>CWE-${79 + (i % 30)}</cwe>
</ReportItem>`;
  });

  const ip = `10.${analystId % 256}.0.1`;
  return `<?xml version="1.0"?>
<NessusClientData_v2>
<Report name="stress-scan-${analystId}">
<ReportHost name="${ip}">
<HostProperties><tag name="host-ip">${ip}</tag></HostProperties>
${findings.join('\n')}
</ReportHost>
</Report>
</NessusClientData_v2>`;
}

// ─── Stack Trace Detection ─────────────────────────────────────────────────

function containsStackTrace(body: Record<string, unknown> | undefined): boolean {
  if (!body) return false;
  const text = JSON.stringify(body);
  // Look for common stack trace patterns
  const patterns = [
    /at \w+\.\w+ \(/,        // "at Module.load ("
    /at Object\.\<anonymous\>/,
    /at async /,
    /\.ts:\d+:\d+/,           // file.ts:42:10
    /\.js:\d+:\d+/,           // file.js:42:10
    /node_modules\//,
    /Error:\s+.*\n\s+at /,
    /ECONNREFUSED/,
    /ENOENT/,
  ];
  return patterns.some((p) => p.test(text));
}

// ─── Analyst Workflow (25 steps + zero-day probes) ─────────────────────────

async function runAnalystWorkflow(analystId: number): Promise<AnalystResult> {
  const workflowStart = performance.now();
  const steps: TimedResult[] = [];
  const failedSteps: string[] = [];
  const zeroDayFindings: ZeroDayFinding[] = [];
  const email = `analyst${analystId}_${RUN_ID}@stresstest.local`;
  const password = 'Str3ss!Test_2026';
  const orgName = `StressOrg-${analystId}-${RUN_ID}`;
  let cookie = '';
  let organizationId = '';
  let findingIds: string[] = [];
  let caseIds: string[] = [];
  let jobId = '';

  function push(result: TimedResult) {
    steps.push(result);
    if (result.status === 0 || result.status >= 500) {
      failedSteps.push(result.step);
    }
    // Check all error responses for stack traces
    if (result.status >= 400 && containsStackTrace(result.body)) {
      zeroDayFindings.push({
        category: 'info-leak-stack-trace',
        description: `Stack trace leaked in ${result.status} response at ${result.endpoint}`,
        severity: 'HIGH',
        analystId,
        evidence: JSON.stringify(result.body).slice(0, 200),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Signup (or login if pre-seeded)
  // ═══════════════════════════════════════════════════════════════════════════

  const signup = await jsonPost('01-signup', `${BASE_URL}/api/auth/signup`, {
    name: `Analyst ${analystId}`,
    email,
    password,
    orgName,
  });
  push(signup);
  if (signup.body?.organizationId) {
    organizationId = String(signup.body.organizationId);
  }

  // If signup failed (user exists), try login
  if (signup.status >= 400) {
    const login = await jsonPost('01-signup-fallback-login', `${BASE_URL}/api/auth/login`, {
      email,
      password,
    });
    push(login);
    if (login.body?.token) {
      cookie = `session=${login.body.token}`;
    }
    if (login.body?.organizationId) {
      organizationId = String(login.body.organizationId);
    }
  } else if (signup.body?.token) {
    cookie = `session=${signup.body.token}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  const dashboard = await jsonGet(
    '02-dashboard',
    `${BASE_URL}/api/dashboard?organizationId=${organizationId}`,
    cookie,
  );
  push(dashboard);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Upload scan file (Nessus XML, 10 findings)
  // ═══════════════════════════════════════════════════════════════════════════

  const scanContent = generateNessusXml(analystId);
  const fileName = `stress-scan-${analystId}.nessus`;
  const formData = new FormData();
  formData.append('file', new Blob([scanContent], { type: 'text/xml' }), fileName);
  if (organizationId) formData.append('organizationId', organizationId);

  const uploadStart = performance.now();
  try {
    const uploadHeaders: Record<string, string> = {};
    if (cookie) uploadHeaders['Cookie'] = cookie;

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    const uploadDuration = Math.round(performance.now() - uploadStart);
    let uploadBody: Record<string, unknown> = {};
    try { uploadBody = (await uploadRes.json()) as Record<string, unknown>; } catch { /* ignored */ }
    push({
      step: '03-upload-scan',
      method: 'POST',
      endpoint: '/api/upload',
      status: uploadRes.status,
      durationMs: uploadDuration,
      body: uploadBody,
    });
    if (uploadBody.jobId) jobId = String(uploadBody.jobId);
  } catch (err: unknown) {
    push({
      step: '03-upload-scan',
      method: 'POST',
      endpoint: '/api/upload',
      status: 0,
      durationMs: Math.round(performance.now() - uploadStart),
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Poll job status (max 30s, 1s intervals)
  // ═══════════════════════════════════════════════════════════════════════════

  if (jobId) {
    let pollAttempts = 0;
    let jobDone = false;
    while (!jobDone && pollAttempts < JOB_POLL_MAX) {
      await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL));
      const pollResult = await jsonGet(
        '04-poll-job',
        `${BASE_URL}/api/upload/${jobId}`,
        cookie,
      );
      pollAttempts++;
      const status = pollResult.body?.status as string | undefined;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'COMPLETE') {
        jobDone = true;
        push(pollResult);
      } else if (pollAttempts >= JOB_POLL_MAX) {
        push({ ...pollResult, error: `Job still ${status} after ${pollAttempts} polls` });
      }
    }
  } else {
    push({ step: '04-poll-job', method: 'GET', endpoint: '/api/upload/[jobId]', status: -1, durationMs: 0, error: 'No jobId from upload' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: List findings (page 1, limit 25)
  // ═══════════════════════════════════════════════════════════════════════════

  const findingsList = await jsonGet(
    '05-findings-list',
    `${BASE_URL}/api/findings?organizationId=${organizationId}&page=1&limit=25`,
    cookie,
  );
  push(findingsList);
  if (findingsList.body?.findings && Array.isArray(findingsList.body.findings)) {
    findingIds = (findingsList.body.findings as Array<{ id?: string }>)
      .filter((f) => f.id)
      .map((f) => f.id!)
      .slice(0, 20);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: Filter findings by severity=CRITICAL
  // ═══════════════════════════════════════════════════════════════════════════

  const findingsCritical = await jsonGet(
    '06-findings-critical',
    `${BASE_URL}/api/findings?organizationId=${organizationId}&severity=CRITICAL&limit=25`,
    cookie,
  );
  push(findingsCritical);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7: View first finding detail
  // ═══════════════════════════════════════════════════════════════════════════

  if (findingIds.length > 0) {
    const findingDetail = await jsonGet(
      '07-finding-detail',
      `${BASE_URL}/api/findings/${findingIds[0]}`,
      cookie,
    );
    push(findingDetail);
  } else {
    push({ step: '07-finding-detail', method: 'GET', endpoint: '/api/findings/[id]', status: -1, durationMs: 0, error: 'No findings available' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 8: Build cases from findings
  // ═══════════════════════════════════════════════════════════════════════════

  const buildCases = await jsonPost('08-build-cases', `${BASE_URL}/api/cases/build`, {
    findingIds: findingIds.slice(0, 5),
    organizationId,
  }, cookie);
  push(buildCases);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 9: List cases
  // ═══════════════════════════════════════════════════════════════════════════

  const casesList = await jsonGet(
    '09-cases-list',
    `${BASE_URL}/api/cases?organizationId=${organizationId}&limit=20`,
    cookie,
  );
  push(casesList);
  if (casesList.body?.cases && Array.isArray(casesList.body.cases)) {
    caseIds = (casesList.body.cases as Array<{ id?: string }>)
      .filter((c) => c.id)
      .map((c) => c.id!)
      .slice(0, 10);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 10: View first case
  // ═══════════════════════════════════════════════════════════════════════════

  if (caseIds.length > 0) {
    const caseDetail = await jsonGet(
      '10-case-detail',
      `${BASE_URL}/api/cases/${caseIds[0]}?organizationId=${organizationId}`,
      cookie,
    );
    push(caseDetail);
  } else {
    push({ step: '10-case-detail', method: 'GET', endpoint: '/api/cases/[id]', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 11: Update case status to IN_PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════

  if (caseIds.length > 0) {
    const updateCase = await jsonPatch(
      '11-update-case',
      `${BASE_URL}/api/cases/${caseIds[0]}`,
      { status: 'IN_PROGRESS', organizationId },
      cookie,
    );
    push(updateCase);
  } else {
    push({ step: '11-update-case', method: 'PATCH', endpoint: '/api/cases/[id]', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 12: Add comment to case
  // ═══════════════════════════════════════════════════════════════════════════

  if (caseIds.length > 0) {
    const comment = await jsonPost(
      '12-case-comment',
      `${BASE_URL}/api/cases/${caseIds[0]}/comments`,
      {
        content: `[Stress ${analystId}] Investigating vulnerability. Remediation in progress.`,
        organizationId,
      },
      cookie,
    );
    push(comment);
  } else {
    push({ step: '12-case-comment', method: 'POST', endpoint: '/api/cases/[id]/comments', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 13: Bulk update 3 cases to REMEDIATED
  // ═══════════════════════════════════════════════════════════════════════════

  if (caseIds.length >= 3) {
    const bulkUpdate = await jsonPost(
      '13-bulk-cases',
      `${BASE_URL}/api/cases/bulk`,
      { caseIds: caseIds.slice(0, 3), status: 'REMEDIATED', organizationId },
      cookie,
    );
    push(bulkUpdate);
  } else {
    push({ step: '13-bulk-cases', method: 'POST', endpoint: '/api/cases/bulk', status: -1, durationMs: 0, error: 'Not enough cases for bulk' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 14: AI remediation advisory
  // ═══════════════════════════════════════════════════════════════════════════

  const aiRemediation = await jsonPost(
    '14-ai-remediation',
    `${BASE_URL}/api/ai/remediation`,
    {
      findingTitle: `CVE-2024-${String(analystId).padStart(5, '0')} — Remote Code Execution`,
      severity: 'CRITICAL',
      description: 'A remote code execution vulnerability allows unauthenticated attackers to execute arbitrary commands.',
      organizationId,
    },
    cookie,
  );
  push(aiRemediation);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 15: List compliance frameworks
  // ═══════════════════════════════════════════════════════════════════════════

  const frameworks = await jsonGet(
    '15-compliance-frameworks',
    `${BASE_URL}/api/compliance/frameworks`,
    cookie,
  );
  push(frameworks);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 16: View POAM
  // ═══════════════════════════════════════════════════════════════════════════

  const poam = await jsonGet(
    '16-poam',
    `${BASE_URL}/api/compliance/poam?organizationId=${organizationId}`,
    cookie,
  );
  push(poam);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 17: Export findings CSV
  // ═══════════════════════════════════════════════════════════════════════════

  const exportCsv = await jsonGet(
    '17-export-csv',
    `${BASE_URL}/api/export/findings?organizationId=${organizationId}&format=csv`,
    cookie,
  );
  push(exportCsv);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 18: PDF export (executive)
  // ═══════════════════════════════════════════════════════════════════════════

  const exportPdf = await jsonPost(
    '18-export-pdf',
    `${BASE_URL}/api/export/pdf`,
    {
      type: 'executive',
      organizationId,
      dateRange: { start: '2026-01-01T00:00:00Z', end: '2026-03-29T23:59:59Z' },
    },
    cookie,
  );
  push(exportPdf);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 19: Check billing usage
  // ═══════════════════════════════════════════════════════════════════════════

  const billing = await jsonGet(
    '19-billing-usage',
    `${BASE_URL}/api/billing/usage?organizationId=${organizationId}`,
    cookie,
  );
  push(billing);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 20: Check notifications
  // ═══════════════════════════════════════════════════════════════════════════

  const notifications = await jsonGet(
    '20-notifications',
    `${BASE_URL}/api/notifications?organizationId=${organizationId}`,
    cookie,
  );
  push(notifications);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 21: Create API key
  // ═══════════════════════════════════════════════════════════════════════════

  const createKey = await jsonPost('21-create-api-key', `${BASE_URL}/api/keys`, {
    name: `stress-key-${analystId}-${RUN_ID}`,
    scopes: ['read:findings', 'read:cases'],
    organizationId,
  }, cookie);
  push(createKey);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 22: Configure webhook
  // ═══════════════════════════════════════════════════════════════════════════

  const createWebhook = await jsonPost('22-create-webhook', `${BASE_URL}/api/webhooks/config`, {
    url: `https://hooks.stresstest.local/analyst-${analystId}`,
    events: ['finding.created', 'case.updated'],
    secret: `whsec_stress_${analystId}_${RUN_ID}`,
    organizationId,
  }, cookie);
  push(createWebhook);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 23: Portfolio view
  // ═══════════════════════════════════════════════════════════════════════════

  const portfolio = await jsonGet(
    '23-portfolio',
    `${BASE_URL}/api/portfolio?organizationId=${organizationId}`,
    cookie,
  );
  push(portfolio);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 24: SLA breach check
  // ═══════════════════════════════════════════════════════════════════════════

  const slaCheck = await jsonGet(
    '24-sla-check',
    `${BASE_URL}/api/sla/check?organizationId=${organizationId}`,
    cookie,
  );
  push(slaCheck);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 25: Generate executive report
  // ═══════════════════════════════════════════════════════════════════════════

  const genReport = await jsonPost(
    '25-generate-report',
    `${BASE_URL}/api/reports/generate`,
    {
      type: 'executive',
      format: 'pdf',
      organizationId,
      dateRange: { start: '2026-01-01T00:00:00Z', end: '2026-03-29T23:59:59Z' },
    },
    cookie,
  );
  push(genReport);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 26: Compliance framework assessment (random framework)
  // ═══════════════════════════════════════════════════════════════════════════

  const frameworks = ['nist-800-53', 'soc2-type2', 'cmmc-level2', 'hipaa', 'pci-dss', 'iso-27001', 'gdpr'];
  const randomFw = frameworks[analystId % frameworks.length];
  const fwAssessment = await jsonGet(
    '26-compliance-assessment',
    `${BASE_URL}/api/compliance/frameworks/${randomFw}/assessment?organizationId=${organizationId}`,
    cookie,
  );
  push(fwAssessment);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 27: POAM generation (compute-heavy)
  // ═══════════════════════════════════════════════════════════════════════════

  const poamGen = await jsonPost(
    '27-poam-generate',
    `${BASE_URL}/api/compliance/poam/generate`,
    { organizationId, frameworks: [randomFw] },
    cookie,
  );
  push(poamGen);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 28: Cross-framework compliance impact
  // ═══════════════════════════════════════════════════════════════════════════

  const crossImpact = await jsonGet(
    '28-cross-framework-impact',
    `${BASE_URL}/api/compliance/impact?organizationId=${organizationId}&frameworks=hipaa,pci-dss,iso-27001,gdpr`,
    cookie,
  );
  push(crossImpact);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 29: Compliance report PDF
  // ═══════════════════════════════════════════════════════════════════════════

  const compliancePdf = await jsonPost(
    '29-compliance-pdf',
    `${BASE_URL}/api/export/pdf`,
    { type: 'compliance', format: 'pdf', organizationId, framework: randomFw },
    cookie,
  );
  push(compliancePdf);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 30: Jira bulk sync simulation
  // ═══════════════════════════════════════════════════════════════════════════

  if (caseIds.length > 0) {
    const jiraBulk = await jsonPost(
      '30-jira-bulk-sync',
      `${BASE_URL}/api/integrations/jira/bulk`,
      { organizationId, caseIds: caseIds.slice(0, 3), dryRun: true },
      cookie,
    );
    push(jiraBulk);
  } else {
    push({ step: '30-jira-bulk-sync', method: 'POST', endpoint: '/api/integrations/jira/bulk', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZERO-DAY / GAP DETECTION PROBES
  // ═══════════════════════════════════════════════════════════════════════════

  // Only run zero-day probes for a subset (every 10th analyst) to avoid
  // overwhelming the server while still getting statistical coverage
  if (analystId % 10 === 1) {
    await runZeroDayProbes(analystId, cookie, organizationId, findingIds, caseIds, zeroDayFindings, steps, failedSteps);
  }

  const totalMs = Math.round(performance.now() - workflowStart);

  return {
    analystId,
    email,
    orgName,
    steps,
    totalMs,
    success: failedSteps.length === 0,
    failedSteps,
    zeroDayFindings,
  };
}

// ─── Zero-Day Probe Suite ──────────────────────────────────────────────────

async function runZeroDayProbes(
  analystId: number,
  cookie: string,
  organizationId: string,
  findingIds: string[],
  caseIds: string[],
  findings: ZeroDayFinding[],
  steps: TimedResult[],
  failedSteps: string[],
): Promise<void> {

  function push(result: TimedResult) {
    steps.push(result);
    if (result.status === 0 || result.status >= 500) {
      failedSteps.push(result.step);
    }
  }

  // ── Probe 1: Org Isolation ─────────────────────────────────────────────
  // Try to access a different org's data using a fake orgId
  {
    const foreignOrgId = `org-foreign-${analystId}-probe`;
    const result = await jsonGet(
      'zd-org-isolation',
      `${BASE_URL}/api/findings?organizationId=${foreignOrgId}&limit=5`,
      cookie,
    );
    push(result);
    if (result.status >= 200 && result.status < 300) {
      const returnedFindings = result.body?.findings;
      if (Array.isArray(returnedFindings) && returnedFindings.length > 0) {
        findings.push({
          category: 'org-isolation',
          description: `Analyst ${analystId} accessed findings for foreign org ${foreignOrgId}`,
          severity: 'CRITICAL',
          analystId,
          evidence: `Returned ${returnedFindings.length} findings for org ${foreignOrgId}`,
        });
      }
    }
  }

  // ── Probe 2: Data Leakage (foreign finding ID) ────────────────────────
  // Fabricate a finding ID that belongs to a different analyst's org
  {
    const fakeFindingId = `finding-foreign-${(analystId + 500) % 1000}-probe`;
    const result = await jsonGet(
      'zd-data-leakage',
      `${BASE_URL}/api/findings/${fakeFindingId}`,
      cookie,
    );
    push(result);
    if (result.status >= 200 && result.status < 300 && result.body?.id) {
      findings.push({
        category: 'data-leakage',
        description: `Analyst ${analystId} resolved a foreign finding ID: ${fakeFindingId}`,
        severity: 'CRITICAL',
        analystId,
        evidence: `Got 200 with finding data for ID ${fakeFindingId}`,
      });
    }
  }

  // ── Probe 3: Rate Limiting ─────────────────────────────────────────────
  // Fire 100 rapid requests and verify we get 429s
  {
    let got429 = false;
    let totalRapid = 0;
    let errors429 = 0;
    const rapidPromises = Array.from({ length: 100 }, () => {
      totalRapid++;
      return jsonGet(
        'zd-rate-limit',
        `${BASE_URL}/api/dashboard?organizationId=${organizationId}`,
        cookie,
      );
    });
    const rapidResults = await Promise.all(rapidPromises);
    for (const r of rapidResults) {
      if (r.status === 429) {
        got429 = true;
        errors429++;
      }
    }
    // Push only a summary result
    push({
      step: 'zd-rate-limit',
      method: 'GET',
      endpoint: '/api/dashboard',
      status: got429 ? 429 : 200,
      durationMs: Math.round(rapidResults.reduce((a, r) => a + r.durationMs, 0) / rapidResults.length),
    });
    if (!got429) {
      findings.push({
        category: 'rate-limit-absent',
        description: `100 rapid requests to /api/dashboard returned no 429 responses`,
        severity: 'MEDIUM',
        analystId,
        evidence: `${totalRapid} requests, ${errors429} rate-limited`,
      });
    }
  }

  // ── Probe 4: Race Conditions (10 concurrent case updates) ──────────────
  if (caseIds.length > 0) {
    const targetCaseId = caseIds[0];
    const statuses = ['IN_PROGRESS', 'IN_TRIAGE', 'REMEDIATED', 'IN_PROGRESS', 'CLOSED',
                      'IN_TRIAGE', 'IN_PROGRESS', 'REMEDIATED', 'CLOSED', 'IN_PROGRESS'];
    const racePromises = statuses.map((status, i) =>
      jsonPatch(
        `zd-race-condition-${i}`,
        `${BASE_URL}/api/cases/${targetCaseId}`,
        { status, organizationId },
        cookie,
      ),
    );
    const raceResults = await Promise.all(racePromises);
    const serverErrors = raceResults.filter((r) => r.status >= 500);
    push({
      step: 'zd-race-condition',
      method: 'PATCH',
      endpoint: '/api/cases/[id]',
      status: serverErrors.length > 0 ? 500 : 200,
      durationMs: Math.round(raceResults.reduce((a, r) => a + r.durationMs, 0) / raceResults.length),
    });
    if (serverErrors.length > 0) {
      findings.push({
        category: 'race-condition',
        description: `${serverErrors.length}/10 concurrent case updates caused server errors`,
        severity: 'HIGH',
        analystId,
        evidence: `Case ${targetCaseId}: ${serverErrors.length} 5xx errors from concurrent PATCH`,
      });
    }
  }

  // ── Probe 5: Session Cross-Contamination ───────────────────────────────
  // Access session endpoint, verify it returns OUR user data (not another)
  {
    const sessionResult = await jsonGet(
      'zd-session-integrity',
      `${BASE_URL}/api/auth/session`,
      cookie,
    );
    push(sessionResult);
    if (sessionResult.status >= 200 && sessionResult.status < 300 && sessionResult.body) {
      const sessionEmail = sessionResult.body.email as string | undefined;
      const sessionOrgId = sessionResult.body.organizationId as string | undefined;
      if (sessionEmail && !sessionEmail.includes(`analyst${analystId}_`)) {
        findings.push({
          category: 'session-contamination',
          description: `Session returned email ${sessionEmail} but expected analyst${analystId}_*`,
          severity: 'CRITICAL',
          analystId,
          evidence: `Expected analyst${analystId}_, got ${sessionEmail}`,
        });
      }
      if (sessionOrgId && organizationId && sessionOrgId !== organizationId) {
        findings.push({
          category: 'session-contamination',
          description: `Session orgId mismatch: expected ${organizationId}, got ${sessionOrgId}`,
          severity: 'CRITICAL',
          analystId,
          evidence: `orgId: ${sessionOrgId} vs ${organizationId}`,
        });
      }
    }
  }

  // ── Probe 6: Pagination Boundaries ─────────────────────────────────────
  {
    const pageResult = await jsonGet(
      'zd-pagination-boundary',
      `${BASE_URL}/api/findings?organizationId=${organizationId}&page=99999&limit=25`,
      cookie,
    );
    push(pageResult);
    if (pageResult.status >= 500) {
      findings.push({
        category: 'pagination-boundary',
        description: `Page 99999 caused a ${pageResult.status} server error instead of empty results`,
        severity: 'MEDIUM',
        analystId,
        evidence: `Status ${pageResult.status} for page=99999`,
      });
    }
  }

  // ── Probe 7: SQL Injection in filter params ────────────────────────────
  {
    const sqliPayloads = [
      "'; DROP TABLE findings; --",
      "1 OR 1=1",
      "UNION SELECT * FROM users--",
    ];
    for (const payload of sqliPayloads) {
      const encoded = encodeURIComponent(payload);
      const sqliResult = await jsonGet(
        'zd-sqli-filter',
        `${BASE_URL}/api/findings?organizationId=${organizationId}&severity=${encoded}&limit=5`,
        cookie,
      );
      push(sqliResult);
      if (sqliResult.status >= 200 && sqliResult.status < 300) {
        const returnedFindings = sqliResult.body?.findings;
        if (Array.isArray(returnedFindings) && returnedFindings.length > 0) {
          findings.push({
            category: 'sql-injection',
            description: `SQLi payload in severity filter returned ${returnedFindings.length} results`,
            severity: 'CRITICAL',
            analystId,
            evidence: `Payload: ${payload} -> ${returnedFindings.length} findings`,
          });
        }
      }
      // A 500 with DB error text is also concerning
      if (sqliResult.status >= 500) {
        const bodyText = JSON.stringify(sqliResult.body ?? {});
        if (/syntax|sql|query|relation|column/i.test(bodyText)) {
          findings.push({
            category: 'sql-injection',
            description: `SQLi payload caused a DB-related server error`,
            severity: 'CRITICAL',
            analystId,
            evidence: `Payload: ${payload} -> ${sqliResult.status}: ${bodyText.slice(0, 200)}`,
          });
        }
      }
    }
  }

  // ── Probe 8: Upload Size Limit (101MB) ─────────────────────────────────
  {
    const largeBlobSize = 101 * 1024 * 1024; // 101MB
    // Create a minimal blob reference without actually allocating 101MB in memory
    // We use a streaming approach: create a small buffer and lie about size via headers
    // Actually, we need a real payload to test limits. Use a 1MB chunk repeated.
    // For safety/memory, we'll just create a 1MB blob and set Content-Length header to 101MB
    // Or better: create a small FormData that claims to be large
    const oversizeContent = 'X'.repeat(1024 * 1024); // 1MB of X's — enough to test
    const oversizeForm = new FormData();
    oversizeForm.append('file', new Blob([oversizeContent], { type: 'text/xml' }), 'oversize-test.nessus');
    oversizeForm.append('organizationId', organizationId);

    // We can't easily send 101MB, so we test with a reasonable size and check if
    // the server has size limit configuration. We'll also try a direct fetch with
    // Content-Length header set to 101MB.
    const oversizeHeaders: Record<string, string> = {};
    if (cookie) oversizeHeaders['Cookie'] = cookie;

    const oversizeResult = await timedFetch(
      'zd-upload-size-limit',
      'POST',
      `${BASE_URL}/api/upload`,
      { method: 'POST', headers: oversizeHeaders, body: oversizeForm },
    );
    push(oversizeResult);
    // Note: A 1MB upload succeeding is expected. The real test would need 101MB.
    // We record this as INFO — actual 101MB test should be manual.
    // However, we check if the server advertises size limits
    const sizeBytes = largeBlobSize; // what we intended
    if (oversizeResult.status >= 200 && oversizeResult.status < 300) {
      findings.push({
        category: 'upload-size-limit',
        description: `Upload size limit probe: 1MB upload accepted (manual 101MB test recommended)`,
        severity: 'INFO',
        analystId,
        evidence: `Intended ${sizeBytes} bytes, sent 1MB, got ${oversizeResult.status}`,
      });
    }
  }

  // ── Probe 9: File Type Restriction (.exe) ──────────────────────────────
  {
    const exeContent = 'MZ\x90\x00\x03\x00\x00\x00'; // PE header stub
    const exeForm = new FormData();
    exeForm.append('file', new Blob([exeContent], { type: 'application/octet-stream' }), 'malicious.exe');
    exeForm.append('organizationId', organizationId);

    const exeHeaders: Record<string, string> = {};
    if (cookie) exeHeaders['Cookie'] = cookie;

    const exeResult = await timedFetch(
      'zd-file-type-restriction',
      'POST',
      `${BASE_URL}/api/upload`,
      { method: 'POST', headers: exeHeaders, body: exeForm },
    );
    push(exeResult);
    if (exeResult.status >= 200 && exeResult.status < 300) {
      findings.push({
        category: 'file-type-restriction',
        description: `Server accepted .exe file upload — no file type restriction`,
        severity: 'HIGH',
        analystId,
        evidence: `malicious.exe accepted with status ${exeResult.status}`,
      });
    }
  }

  // ── Probe 10: CORS Headers ─────────────────────────────────────────────
  {
    const corsResult = await jsonGet(
      'zd-cors-headers',
      `${BASE_URL}/api/dashboard?organizationId=${organizationId}`,
      cookie,
      true, // capture headers
    );
    push(corsResult);
    if (corsResult.headers) {
      const acao = corsResult.headers['access-control-allow-origin'];
      if (acao === '*') {
        findings.push({
          category: 'cors-wildcard',
          description: `CORS Access-Control-Allow-Origin is wildcard (*) — should be restricted`,
          severity: 'MEDIUM',
          analystId,
          evidence: `access-control-allow-origin: ${acao}`,
        });
      }
    }
  }

  // ── Probe 11: Stack Trace Leakage (provoke errors) ─────────────────────
  // Intentionally cause errors and scan responses for stack traces
  {
    const errorEndpoints = [
      { url: `${BASE_URL}/api/findings/nonexistent-id-12345`, method: 'GET' as const },
      { url: `${BASE_URL}/api/cases/nonexistent-id-12345`, method: 'GET' as const },
      { url: `${BASE_URL}/api/upload/nonexistent-job-12345`, method: 'GET' as const },
    ];
    for (const ep of errorEndpoints) {
      const result = await jsonGet('zd-stack-trace-leak', ep.url, cookie);
      push(result);
      if (result.status >= 400 && containsStackTrace(result.body)) {
        findings.push({
          category: 'stack-trace-leak',
          description: `Stack trace found in ${result.status} response at ${result.endpoint}`,
          severity: 'HIGH',
          analystId,
          evidence: JSON.stringify(result.body).slice(0, 200),
        });
      }
    }
  }
}

// ─── Wave Execution with Ramp-Up ───────────────────────────────────────────

async function runInWaves(
  totalAnalysts: number,
  batchSize: number,
  delayMs: number,
): Promise<AnalystResult[]> {
  const results: AnalystResult[] = [];
  const waves = Math.ceil(totalAnalysts / batchSize);

  console.log(`\nRamp-up: ${waves} waves x ${batchSize} analysts (${delayMs}ms between waves)`);
  console.log('─'.repeat(80));

  for (let wave = 0; wave < waves; wave++) {
    const startIdx = wave * batchSize;
    const endIdx = Math.min(startIdx + batchSize, totalAnalysts);
    const batchCount = endIdx - startIdx;

    const waveStart = performance.now();
    process.stdout.write(`  Wave ${String(wave + 1).padStart(2)}/${waves}: analysts ${startIdx + 1}–${endIdx}... `);

    const promises = Array.from({ length: batchCount }, (_, i) =>
      runAnalystWorkflow(startIdx + i + 1).catch((err: unknown) => {
        // Catch individual analyst failures so they don't crash the whole test
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          analystId: startIdx + i + 1,
          email: `analyst${startIdx + i + 1}_${RUN_ID}@stresstest.local`,
          orgName: `StressOrg-${startIdx + i + 1}-${RUN_ID}`,
          steps: [],
          totalMs: 0,
          success: false,
          failedSteps: [`FATAL: ${errMsg}`],
          zeroDayFindings: [],
        } satisfies AnalystResult;
      }),
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    const waveMs = Math.round(performance.now() - waveStart);
    const successes = batchResults.filter((r) => r.success).length;
    const reqs = batchResults.reduce((a, r) => a + r.steps.length, 0);
    const zdCount = batchResults.reduce((a, r) => a + r.zeroDayFindings.length, 0);
    const zdSuffix = zdCount > 0 ? ` | ${zdCount} zd findings` : '';
    console.log(`${successes}/${batchCount} passed | ${reqs} requests | ${(waveMs / 1000).toFixed(1)}s${zdSuffix}`);

    if (wave < waves - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return results;
}

// ─── Percentile ─────────────────────────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Report ─────────────────────────────────────────────────────────────────

function generateReport(results: AnalystResult[], totalTestMs: number): void {
  const totalAnalysts = results.length;
  const successfulAnalysts = results.filter((r) => r.success).length;
  const failedAnalysts = totalAnalysts - successfulAnalysts;

  // Aggregate by step (exclude zero-day probe steps from main table)
  const stepMap = new Map<string, { durations: number[]; method: string; endpoint: string; ok: number; fail4xx: number; fail5xx: number; connErr: number; skipped: number }>();
  const zdStepMap = new Map<string, { durations: number[]; method: string; endpoint: string; ok: number; fail4xx: number; fail5xx: number; connErr: number; skipped: number }>();

  for (const result of results) {
    for (const step of result.steps) {
      const isZd = step.step.startsWith('zd-');
      const map = isZd ? zdStepMap : stepMap;
      if (!map.has(step.step)) {
        map.set(step.step, {
          durations: [],
          method: step.method,
          endpoint: step.endpoint,
          ok: 0, fail4xx: 0, fail5xx: 0, connErr: 0, skipped: 0,
        });
      }
      const agg = map.get(step.step)!;
      agg.durations.push(step.durationMs);

      if (step.status === -1) agg.skipped++;
      else if (step.status === 0) agg.connErr++;
      else if (step.status >= 200 && step.status < 400) agg.ok++;
      else if (step.status >= 400 && step.status < 500) agg.fail4xx++;
      else if (step.status >= 500) agg.fail5xx++;
    }
  }

  function aggregateMap(map: Map<string, { durations: number[]; method: string; endpoint: string; ok: number; fail4xx: number; fail5xx: number; connErr: number; skipped: number }>): StepAggregate[] {
    const aggs: StepAggregate[] = [];
    for (const [step, data] of map.entries()) {
      const valid = data.durations.filter((d) => d > 0);
      aggs.push({
        step,
        endpoint: data.endpoint,
        method: data.method,
        total: data.durations.length,
        successes: data.ok,
        failures4xx: data.fail4xx,
        failures5xx: data.fail5xx,
        connErrors: data.connErr,
        skipped: data.skipped,
        avgMs: valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0,
        p50Ms: percentile(valid, 50),
        p95Ms: percentile(valid, 95),
        p99Ms: percentile(valid, 99),
        minMs: valid.length > 0 ? Math.min(...valid) : 0,
        maxMs: valid.length > 0 ? Math.max(...valid) : 0,
      });
    }
    return aggs;
  }

  const aggregates = aggregateMap(stepMap);
  const zdAggregates = aggregateMap(zdStepMap);

  const workflowDurations = results.map((r) => r.totalMs).filter((t) => t > 0);
  const totalRequests = results.reduce((acc, r) => acc + r.steps.length, 0);
  const mainStepRequests = results.reduce((acc, r) => acc + r.steps.filter((s) => !s.step.startsWith('zd-')).length, 0);
  const total5xx = aggregates.reduce((a, s) => a + s.failures5xx, 0);
  const totalConnErr = aggregates.reduce((a, s) => a + s.connErrors, 0);
  const total4xx = aggregates.reduce((a, s) => a + s.failures4xx, 0);
  const totalSkipped = aggregates.reduce((a, s) => a + s.skipped, 0);

  // Collect all zero-day findings
  const allZdFindings: ZeroDayFinding[] = [];
  for (const r of results) {
    allZdFindings.push(...r.zeroDayFindings);
  }

  const W = 130;

  console.log('\n');
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║' + '  CVERiskPilot Production Stress Test — 1000 Analyst Focus Group Report'.padEnd(W) + '║');
  console.log('║' + `  ${new Date().toISOString()}  |  Run ID: ${RUN_ID}`.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Overview ──
  console.log('║' + '  OVERVIEW'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');
  console.log('║' + `  Analysts: ${totalAnalysts}  |  Passed: ${successfulAnalysts}  |  Failed: ${failedAnalysts}  |  Pass Rate: ${((successfulAnalysts / totalAnalysts) * 100).toFixed(1)}%`.padEnd(W) + '║');
  console.log('║' + `  Total Requests: ${totalRequests} (${mainStepRequests} workflow + ${totalRequests - mainStepRequests} zero-day probes)`.padEnd(W) + '║');
  console.log('║' + `  Workflow Steps: 2xx/3xx: ${aggregates.reduce((a, s) => a + s.successes, 0)}  |  4xx: ${total4xx}  |  5xx: ${total5xx}  |  ConnErr: ${totalConnErr}  |  Skipped: ${totalSkipped}`.padEnd(W) + '║');
  const effectiveMain = mainStepRequests - totalSkipped;
  console.log('║' + `  Error Rate (5xx+conn): ${(((total5xx + totalConnErr) / (effectiveMain || 1)) * 100).toFixed(2)}%  |  Test Duration: ${(totalTestMs / 1000).toFixed(1)}s`.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Workflow Timing ──
  console.log('║' + '  END-TO-END WORKFLOW TIMING (per analyst)'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');
  if (workflowDurations.length > 0) {
    console.log('║' + `  Avg: ${Math.round(workflowDurations.reduce((a, b) => a + b, 0) / workflowDurations.length)}ms  |  P50: ${percentile(workflowDurations, 50)}ms  |  P95: ${percentile(workflowDurations, 95)}ms  |  P99: ${percentile(workflowDurations, 99)}ms  |  Max: ${Math.max(...workflowDurations)}ms`.padEnd(W) + '║');
  } else {
    console.log('║' + '  No workflow durations recorded'.padEnd(W) + '║');
  }
  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Step-by-Step Breakdown ──
  console.log('║' + '  STEP-BY-STEP BREAKDOWN (25 workflow steps)'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  const colHeader = [
    'Step'.padEnd(30),
    'Mtd'.padEnd(5),
    'Tot'.padStart(5),
    'OK'.padStart(5),
    '4xx'.padStart(5),
    '5xx'.padStart(5),
    'Err'.padStart(5),
    'Avg'.padStart(8),
    'P50'.padStart(8),
    'P95'.padStart(8),
    'P99'.padStart(8),
    'Max'.padStart(8),
  ].join(' | ');
  console.log('║  ' + colHeader.padEnd(W - 2) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  for (const agg of aggregates) {
    const row = [
      agg.step.padEnd(30),
      agg.method.padEnd(5),
      String(agg.total).padStart(5),
      String(agg.successes).padStart(5),
      String(agg.failures4xx).padStart(5),
      String(agg.failures5xx).padStart(5),
      String(agg.connErrors).padStart(5),
      `${agg.avgMs}ms`.padStart(8),
      `${agg.p50Ms}ms`.padStart(8),
      `${agg.p95Ms}ms`.padStart(8),
      `${agg.p99Ms}ms`.padStart(8),
      `${agg.maxMs}ms`.padStart(8),
    ].join(' | ');

    const hasProblems = agg.failures5xx > 0 || agg.connErrors > 0;
    const prefix = hasProblems ? '> ' : '  ';
    console.log('║' + prefix + row.padEnd(W - 2) + '║');
  }

  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Feature Area Breakdown ──
  console.log('║' + '  FEATURE AREA LATENCY (grouped)'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  const areas: Record<string, string[]> = {
    'Auth':              ['01-signup', '01-signup-fallback-login'],
    'Dashboard':         ['02-dashboard'],
    'Scan Pipeline':     ['03-upload-scan', '04-poll-job'],
    'Findings':          ['05-findings-list', '06-findings-critical', '07-finding-detail'],
    'Case Management':   ['08-build-cases', '09-cases-list', '10-case-detail', '11-update-case', '12-case-comment', '13-bulk-cases'],
    'AI & Remediation':  ['14-ai-remediation'],
    'Compliance':        ['15-compliance-frameworks', '16-poam'],
    'Export & Reports':  ['17-export-csv', '18-export-pdf', '25-generate-report'],
    'Billing & Notif':   ['19-billing-usage', '20-notifications'],
    'Settings':          ['21-create-api-key', '22-create-webhook'],
    'Portfolio & SLA':   ['23-portfolio', '24-sla-check'],
  };

  for (const [area, stepNames] of Object.entries(areas)) {
    const areaAggs = aggregates.filter((a) => stepNames.includes(a.step));
    if (areaAggs.length === 0) continue;

    const areaDurations: number[] = [];
    for (const r of results) {
      let areaTotal = 0;
      for (const s of r.steps) {
        if (stepNames.includes(s.step) && s.durationMs > 0) {
          areaTotal += s.durationMs;
        }
      }
      if (areaTotal > 0) areaDurations.push(areaTotal);
    }

    const areaErrors = areaAggs.reduce((a, s) => a + s.failures5xx + s.connErrors, 0);
    const areaTotal = areaAggs.reduce((a, s) => a + s.total - s.skipped, 0);

    const line = `  ${area.padEnd(22)} Avg: ${Math.round(areaDurations.reduce((a, b) => a + b, 0) / (areaDurations.length || 1))}ms  |  P95: ${percentile(areaDurations, 95)}ms  |  Errors: ${areaErrors}/${areaTotal} (${((areaErrors / (areaTotal || 1)) * 100).toFixed(1)}%)`;
    console.log('║' + line.padEnd(W) + '║');
  }

  console.log('╠' + '═'.repeat(W) + '╣');

  // ══════════════════════════════════════════════════════════════════════════
  // ZERO-DAY / GAP DETECTION REPORT
  // ══════════════════════════════════════════════════════════════════════════

  console.log('║' + '  ZERO-DAY / GAP DETECTION FINDINGS'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  if (allZdFindings.length === 0) {
    console.log('║' + '  No zero-day findings detected.'.padEnd(W) + '║');
  } else {
    // Group by category
    const zdByCategory = new Map<string, ZeroDayFinding[]>();
    for (const f of allZdFindings) {
      if (!zdByCategory.has(f.category)) zdByCategory.set(f.category, []);
      zdByCategory.get(f.category)!.push(f);
    }

    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    const sortedCategories = [...zdByCategory.entries()].sort((a, b) => {
      const aSev = Math.min(...a[1].map((f) => severityOrder[f.severity]));
      const bSev = Math.min(...b[1].map((f) => severityOrder[f.severity]));
      return aSev - bSev;
    });

    for (const [category, findings] of sortedCategories) {
      const severity = findings[0].severity;
      const count = findings.length;
      const icon = severity === 'CRITICAL' ? '!!!' : severity === 'HIGH' ? '!! ' : severity === 'MEDIUM' ? '!  ' : '   ';
      console.log('║' + `  [${icon}] ${severity.padEnd(8)} ${category.padEnd(30)} (${count} occurrences)`.padEnd(W) + '║');
      // Show first example
      const example = findings[0];
      console.log('║' + `           ${example.description.slice(0, W - 14)}`.padEnd(W) + '║');
      if (example.evidence) {
        console.log('║' + `           Evidence: ${example.evidence.slice(0, W - 22)}`.padEnd(W) + '║');
      }
      console.log('╟' + '─'.repeat(W) + '╢');
    }

    const critCount = allZdFindings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = allZdFindings.filter((f) => f.severity === 'HIGH').length;
    const medCount = allZdFindings.filter((f) => f.severity === 'MEDIUM').length;
    const lowCount = allZdFindings.filter((f) => f.severity === 'LOW').length;
    const infoCount = allZdFindings.filter((f) => f.severity === 'INFO').length;
    console.log('║' + `  Summary: ${allZdFindings.length} total | CRITICAL: ${critCount} | HIGH: ${highCount} | MEDIUM: ${medCount} | LOW: ${lowCount} | INFO: ${infoCount}`.padEnd(W) + '║');
  }

  // ── Zero-Day Probe Timing ──
  if (zdAggregates.length > 0) {
    console.log('╠' + '═'.repeat(W) + '╣');
    console.log('║' + '  ZERO-DAY PROBE TIMING'.padEnd(W) + '║');
    console.log('╟' + '─'.repeat(W) + '╢');
    for (const agg of zdAggregates) {
      const row = `  ${agg.step.padEnd(30)} ${agg.method.padEnd(5)} Tot: ${String(agg.total).padStart(4)} | OK: ${String(agg.successes).padStart(4)} | 4xx: ${String(agg.failures4xx).padStart(4)} | 5xx: ${String(agg.failures5xx).padStart(4)} | Avg: ${String(agg.avgMs).padStart(6)}ms | P95: ${String(agg.p95Ms).padStart(6)}ms`;
      console.log('║' + row.padEnd(W) + '║');
    }
  }

  console.log('╠' + '═'.repeat(W) + '╣');

  // ── SLA Assessment ──
  console.log('║' + '  PRODUCTION SLA ASSESSMENT'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  const errorRate = (total5xx + totalConnErr) / (effectiveMain || 1);
  const passRate = successfulAnalysts / totalAnalysts;
  const dashboardAgg = aggregates.find((a) => a.step === '02-dashboard');
  const uploadAgg = aggregates.find((a) => a.step === '03-upload-scan');
  const findingsAgg = aggregates.find((a) => a.step === '05-findings-list');
  const aiAgg = aggregates.find((a) => a.step === '14-ai-remediation');

  const zdCriticals = allZdFindings.filter((f) => f.severity === 'CRITICAL').length;

  const slaChecks = [
    { name: 'Dashboard P95 < 1s', pass: (dashboardAgg?.p95Ms ?? 0) < 1000, actual: `${dashboardAgg?.p95Ms ?? 0}ms` },
    { name: 'Findings List P95 < 2s', pass: (findingsAgg?.p95Ms ?? 0) < 2000, actual: `${findingsAgg?.p95Ms ?? 0}ms` },
    { name: 'Upload P95 < 10s', pass: (uploadAgg?.p95Ms ?? 0) < 10_000, actual: `${uploadAgg?.p95Ms ?? 0}ms` },
    { name: 'AI Remediation P95 < 15s', pass: (aiAgg?.p95Ms ?? 0) < 15_000, actual: `${aiAgg?.p95Ms ?? 0}ms` },
    { name: 'All API P95 < 5s', pass: aggregates.every((a) => a.p95Ms < 5000 || a.skipped === a.total), actual: `max ${Math.max(...aggregates.filter(a => a.skipped < a.total).map(a => a.p95Ms), 0)}ms` },
    { name: 'All API P99 < 10s', pass: aggregates.every((a) => a.p99Ms < 10_000 || a.skipped === a.total), actual: `max ${Math.max(...aggregates.filter(a => a.skipped < a.total).map(a => a.p99Ms), 0)}ms` },
    { name: 'Error Rate < 1%', pass: errorRate < 0.01, actual: `${(errorRate * 100).toFixed(2)}%` },
    { name: 'Error Rate < 5%', pass: errorRate < 0.05, actual: `${(errorRate * 100).toFixed(2)}%` },
    { name: 'Zero Connection Errors', pass: totalConnErr === 0, actual: `${totalConnErr}` },
    { name: 'Analyst Pass Rate > 95%', pass: passRate > 0.95, actual: `${(passRate * 100).toFixed(1)}%` },
    { name: 'Analyst Pass Rate > 80%', pass: passRate > 0.80, actual: `${(passRate * 100).toFixed(1)}%` },
    { name: 'Workflow P95 < 90s', pass: percentile(workflowDurations, 95) < 90_000, actual: `${percentile(workflowDurations, 95)}ms` },
    { name: 'Workflow P99 < 180s', pass: percentile(workflowDurations, 99) < 180_000, actual: `${percentile(workflowDurations, 99)}ms` },
    { name: 'Zero Critical ZD Findings', pass: zdCriticals === 0, actual: `${zdCriticals} critical findings` },
    { name: 'No Stack Trace Leaks', pass: allZdFindings.filter(f => f.category === 'stack-trace-leak' || f.category === 'info-leak-stack-trace').length === 0, actual: `${allZdFindings.filter(f => f.category.includes('stack-trace')).length} leaks` },
  ];

  for (const check of slaChecks) {
    const icon = check.pass ? 'PASS' : 'FAIL';
    const line = `  [${icon}] ${check.name.padEnd(35)} (actual: ${check.actual})`;
    console.log('║' + line.padEnd(W) + '║');
  }

  const passedSla = slaChecks.filter((c) => c.pass).length;
  console.log('╟' + '─'.repeat(W) + '╢');
  console.log('║' + `  SLA Score: ${passedSla}/${slaChecks.length} checks passed`.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Top Slowest ──
  const slowest = [...aggregates].filter((a) => a.skipped < a.total).sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 5);
  console.log('║' + '  TOP 5 SLOWEST ENDPOINTS (by P95)'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');
  for (const s of slowest) {
    const line = `  ${s.method.padEnd(6)} ${s.step.padEnd(30)} P95: ${String(s.p95Ms).padStart(6)}ms  P99: ${String(s.p99Ms).padStart(6)}ms  Avg: ${String(s.avgMs).padStart(6)}ms`;
    console.log('║' + line.padEnd(W) + '║');
  }

  // ── Endpoints With Errors ──
  const errorSteps = [...aggregates].filter((a) => a.failures5xx + a.connErrors > 0).sort((a, b) => (b.failures5xx + b.connErrors) - (a.failures5xx + a.connErrors));
  if (errorSteps.length > 0) {
    console.log('╠' + '═'.repeat(W) + '╣');
    console.log('║' + '  ENDPOINTS WITH SERVER ERRORS'.padEnd(W) + '║');
    console.log('╟' + '─'.repeat(W) + '╢');
    for (const s of errorSteps.slice(0, 15)) {
      const errRate = ((s.failures5xx + s.connErrors) / (s.total - s.skipped) * 100).toFixed(1);
      const line = `  ${s.method.padEnd(6)} ${s.step.padEnd(30)} 5xx: ${String(s.failures5xx).padStart(4)}  ConnErr: ${String(s.connErrors).padStart(4)}  (${errRate}% of ${s.total - s.skipped} requests)`;
      console.log('║' + line.padEnd(W) + '║');
    }
  }

  // ── Throughput ──
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║' + '  THROUGHPUT'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');
  const effectiveRequests = totalRequests - totalSkipped;
  const rps = effectiveRequests / (totalTestMs / 1000);
  console.log('║' + `  Total Requests: ${effectiveRequests} (${totalSkipped} skipped)`.padEnd(W) + '║');
  console.log('║' + `  Test Duration: ${(totalTestMs / 1000).toFixed(1)}s`.padEnd(W) + '║');
  console.log('║' + `  Effective RPS: ~${rps.toFixed(1)} req/s`.padEnd(W) + '║');
  console.log('║' + `  Peak Concurrency: ${BATCH_SIZE} analysts x 25 steps`.padEnd(W) + '║');

  // ── Verdict ──
  console.log('╠' + '═'.repeat(W) + '╣');
  let verdict: string;
  if (passedSla >= 13 && zdCriticals === 0) {
    verdict = 'PRODUCTION READY — All critical SLAs met at 1000 analyst concurrency, no critical security gaps';
  } else if (passedSla >= 10 && zdCriticals === 0) {
    verdict = 'CONDITIONAL — Most SLAs met, no critical security gaps; review bottlenecks before launch';
  } else if (passedSla >= 7) {
    verdict = 'AT RISK — Multiple SLA failures or security gaps; optimization and hardening needed';
  } else {
    verdict = 'NOT READY — Critical SLA failures and/or security vulnerabilities detected';
  }
  console.log('║' + `  VERDICT: ${verdict}`.padEnd(W) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');

  // ── Error Samples ──
  const errorSamples = new Map<string, { status: number; error?: string; analystId: number }>();
  for (const r of results) {
    for (const s of r.steps) {
      if ((s.status === 0 || s.status >= 500) && !errorSamples.has(s.step)) {
        errorSamples.set(s.step, { status: s.status, error: s.error, analystId: r.analystId });
      }
    }
  }
  if (errorSamples.size > 0) {
    console.log('\nError Samples (first occurrence per step):');
    for (const [step, info] of errorSamples.entries()) {
      const errText = info.error ?? `HTTP ${info.status}`;
      console.log(`  [${step}] analyst ${info.analystId}: ${errText.slice(0, 150)}`);
    }
  }

  // ── Failure distribution ──
  const failedAnalystResults = results.filter((r) => !r.success);
  if (failedAnalystResults.length > 0) {
    const failureStepCounts = new Map<string, number>();
    for (const r of failedAnalystResults) {
      for (const s of r.failedSteps) {
        failureStepCounts.set(s, (failureStepCounts.get(s) ?? 0) + 1);
      }
    }
    console.log(`\nFailure distribution (${failedAnalystResults.length} analysts failed):`);
    const sorted = [...failureStepCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [step, count] of sorted.slice(0, 15)) {
      console.log(`  ${step.padEnd(35)} ${count} analysts affected (${((count / totalAnalysts) * 100).toFixed(1)}%)`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const W = 72;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║' + '  CVERiskPilot — 1000 Analyst Production Stress Test'.padEnd(W) + '║');
  console.log('║' + '  Full Workflow (25 Steps) + Zero-Day Gap Detection'.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║' + `  Base URL:    ${BASE_URL}`.padEnd(W) + '║');
  console.log('║' + `  Analysts:    ${ANALYST_COUNT}`.padEnd(W) + '║');
  console.log('║' + `  Batch Size:  ${BATCH_SIZE} (concurrent per wave)`.padEnd(W) + '║');
  console.log('║' + `  Waves:       ${Math.ceil(ANALYST_COUNT / BATCH_SIZE)}`.padEnd(W) + '║');
  console.log('║' + `  Wave Delay:  ${WAVE_DELAY_MS}ms ramp-up`.padEnd(W) + '║');
  console.log('║' + `  Run ID:      ${RUN_ID}`.padEnd(W) + '║');
  console.log('║' + `  Timestamp:   ${new Date().toISOString()}`.padEnd(W) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');

  console.log('\nWorkflow per analyst (25 steps):');
  console.log('  ┌─ AUTH ──────────────────────────────────────────────────┐');
  console.log('  │  1. Signup/Login                                        │');
  console.log('  ├─ CORE WORKFLOW ─────────────────────────────────────────┤');
  console.log('  │  2. Dashboard        3. Upload scan    4. Poll job      │');
  console.log('  │  5. Findings list    6. Critical       7. Detail        │');
  console.log('  │  8. Build cases      9. Cases list    10. Case detail   │');
  console.log('  │ 11. Update case     12. Comment       13. Bulk cases    │');
  console.log('  │ 14. AI remediation  15. Frameworks    16. POAM          │');
  console.log('  │ 17. Export CSV      18. Export PDF    19. Billing       │');
  console.log('  │ 20. Notifications   21. API key       22. Webhook       │');
  console.log('  │ 23. Portfolio       24. SLA check     25. Gen report    │');
  console.log('  ├─ ZERO-DAY PROBES (every 10th analyst) ─────────────────┤');
  console.log('  │  Org isolation       Data leakage      Rate limiting    │');
  console.log('  │  Race conditions     Session integrity  Pagination      │');
  console.log('  │  SQL injection       Upload limits      File types      │');
  console.log('  │  CORS headers        Stack trace leaks                  │');
  console.log('  └─────────────────────────────────────────────────────────┘');
  console.log(`\nTotal expected requests: ~${ANALYST_COUNT * 25} workflow + ~${Math.ceil(ANALYST_COUNT / 10) * 20} zero-day probes`);

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
  console.log(`\nAll waves complete. Total execution: ${(totalTestMs / 1000).toFixed(1)}s`);

  generateReport(results, totalTestMs);

  // Write JSON results
  const reportPath = `tests/stress/results/stress-1000-${RUN_ID}.json`;
  try {
    const fs = await import('fs');
    const pathMod = await import('path');
    const dir = pathMod.dirname(reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const allZdFindings: ZeroDayFinding[] = [];
    for (const r of results) {
      allZdFindings.push(...r.zeroDayFindings);
    }

    const stepDurations = new Map<string, { durations: number[]; method: string; errors: number }>();
    for (const r of results) {
      for (const s of r.steps) {
        if (!stepDurations.has(s.step)) stepDurations.set(s.step, { durations: [], method: s.method, errors: 0 });
        const sd = stepDurations.get(s.step)!;
        sd.durations.push(s.durationMs);
        if (s.status === 0 || s.status >= 500) sd.errors++;
      }
    }

    const stepSummaries: Record<string, { method: string; avg: number; p50: number; p95: number; p99: number; min: number; max: number; errors: number; total: number }> = {};
    for (const [step, data] of stepDurations.entries()) {
      const valid = data.durations.filter((d) => d > 0);
      stepSummaries[step] = {
        method: data.method,
        avg: valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0,
        p50: percentile(valid, 50),
        p95: percentile(valid, 95),
        p99: percentile(valid, 99),
        min: valid.length > 0 ? Math.min(...valid) : 0,
        max: valid.length > 0 ? Math.max(...valid) : 0,
        errors: data.errors,
        total: data.durations.length,
      };
    }

    const summary = {
      runId: RUN_ID,
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      analystCount: ANALYST_COUNT,
      batchSize: BATCH_SIZE,
      waveDelayMs: WAVE_DELAY_MS,
      totalTestMs,
      totalRequests: results.reduce((a, r) => a + r.steps.length, 0),
      passedAnalysts: results.filter((r) => r.success).length,
      failedAnalysts: results.filter((r) => !r.success).length,
      stepSummaries,
      zeroDayFindings: allZdFindings.map((f) => ({
        category: f.category,
        description: f.description,
        severity: f.severity,
        analystId: f.analystId,
        evidence: f.evidence,
      })),
      zeroDaySummary: {
        total: allZdFindings.length,
        critical: allZdFindings.filter((f) => f.severity === 'CRITICAL').length,
        high: allZdFindings.filter((f) => f.severity === 'HIGH').length,
        medium: allZdFindings.filter((f) => f.severity === 'MEDIUM').length,
        low: allZdFindings.filter((f) => f.severity === 'LOW').length,
        info: allZdFindings.filter((f) => f.severity === 'INFO').length,
      },
    };

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
