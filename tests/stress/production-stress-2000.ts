/**
 * CVERiskPilot Production Stress Test — 2000 Concurrent Analysts
 *
 * End-to-end: CLI → Platform → GTM features.
 * Extends the 1000-analyst pattern with 40 steps covering the full product
 * surface including all GTM wave features (G1-G5).
 *
 * WORKFLOW (40 steps):
 *
 *   AUTH & ONBOARDING
 *    1. POST /api/auth/signup (with UTM ref + A/B variant)
 *    2. GET  /api/dashboard
 *
 *   CORE ANALYST WORKFLOW (CLI → Platform)
 *    3. POST /api/upload (Nessus XML, 10 findings per analyst)
 *    4. GET  /api/upload/{jobId} (poll until COMPLETED)
 *    5. GET  /api/findings (page 1, limit 25)
 *    6. GET  /api/findings?severity=CRITICAL
 *    7. GET  /api/findings/{id}
 *    8. POST /api/cases/build (5 findings → cases)
 *    9. GET  /api/cases
 *   10. GET  /api/cases/{id}
 *   11. PATCH /api/cases/{id} (IN_PROGRESS)
 *   12. POST /api/cases/{id}/comments
 *   13. POST /api/cases/bulk (3 cases → REMEDIATED)
 *   14. POST /api/ai/remediation
 *
 *   COMPLIANCE & EXPORT
 *   15. GET  /api/compliance/frameworks
 *   16. GET  /api/compliance/frameworks/{id}/assessment
 *   17. GET  /api/compliance/impact?frameworks=hipaa,pci-dss,iso-27001,gdpr
 *   18. GET  /api/compliance/poam
 *   19. POST /api/compliance/poam/generate
 *   20. GET  /api/export/findings (CSV)
 *   21. POST /api/export/pdf (executive)
 *   22. POST /api/export/pdf (compliance)
 *
 *   GTM FEATURES (G1-G5)
 *   23. GET  /api/billing/usage
 *   24. POST /api/keys (create API key)
 *   25. POST /api/webhooks/config
 *   26. GET  /api/notifications
 *   27. POST /api/soc2-readiness (SOC 2 gap analysis)
 *   28. POST /api/soc2-readiness/pdf (SOC 2 PDF report)
 *   29. GET  /api/admin/funnel?period=30 (funnel analytics — admin only)
 *   30. POST /api/subscribe (blog subscribe)
 *
 *   VERTICAL PAGES (response time + 200 checks)
 *   31. GET  /hipaa (landing page)
 *   32. GET  /soc2 (landing page)
 *   33. GET  /cmmc (landing page)
 *   34. GET  /pricing (pricing page)
 *   35. GET  /blog/rss.xml (RSS feed)
 *   36. GET  /developers (developer portal)
 *
 *   INTEGRATION & REPORTING
 *   37. GET  /api/portfolio
 *   38. GET  /api/sla/check
 *   39. POST /api/reports/generate
 *   40. POST /api/integrations/jira/bulk (dry run)
 *
 *   ZERO-DAY / GAP DETECTION (every 20th analyst):
 *     - Org isolation (cross-org data access)
 *     - Data leakage (foreign finding ID)
 *     - Rate limit enforcement (100 rapid requests)
 *     - Race conditions (10 concurrent case updates)
 *     - Session cross-contamination
 *     - Pagination boundaries (page 99999)
 *     - SQL injection patterns (3 payloads)
 *     - File type restriction (.exe upload)
 *     - CORS headers on API routes
 *     - Stack trace leakage in error responses
 *     - SOC 2 readiness endpoint abuse (oversize payload)
 *     - A/B cookie manipulation
 *
 * Usage:
 *   npx tsx tests/stress/production-stress-2000.ts [BASE_URL] [ANALYST_COUNT]
 *
 * Defaults: http://localhost:3000, 2000 analysts
 */

const BASE_URL = process.env.BASE_URL ?? process.argv[2] ?? 'http://localhost:3000';
const ANALYST_COUNT = parseInt(process.argv[3] ?? '2000', 10);
const RUN_ID = Date.now();
const BATCH_SIZE = 200; // 200 analysts per wave
const WAVE_DELAY_MS = 750; // 750ms ramp between waves
const REQUEST_TIMEOUT = 30_000;
const JOB_POLL_MAX = 30;
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
      // non-JSON response (HTML pages, PDFs, RSS XML)
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

function pageGet(step: string, path: string): Promise<TimedResult> {
  return timedFetch(step, 'GET', `${BASE_URL}${path}`, { method: 'GET' });
}

// ─── Nessus XML Generator (10 findings) ────────────────────────────────────

function generateNessusXml(analystId: number): string {
  const findings = Array.from({ length: 10 }, (_, i) => {
    const sev = (i % 4) + 1;
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

// ─── CLI Output Simulator (mimics @cveriskpilot/scan JSON output) ─────────

function generateCliScanJson(analystId: number): object {
  return {
    findings: Array.from({ length: 5 }, (_, i) => ({
      id: `cli-finding-${analystId}-${i}`,
      title: `CLI Finding ${i}: Hardcoded credential in config`,
      severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'][i % 5],
      cwe: `CWE-${798 + (i % 10)}`,
      description: `Detected hardcoded credential in configuration file (analyst ${analystId})`,
      file: `/src/config/db-${i}.ts`,
      line: 42 + i,
    })),
    summary: { total: 5, critical: 1, high: 1, medium: 1, low: 1, info: 1 },
    framework: 'soc2',
    timestamp: new Date().toISOString(),
  };
}

// ─── Stack Trace Detection ─────────────────────────────────────────────────

function containsStackTrace(body: Record<string, unknown> | undefined): boolean {
  if (!body) return false;
  const text = JSON.stringify(body);
  const patterns = [
    /at \w+\.\w+ \(/,
    /at Object\.\<anonymous\>/,
    /at async /,
    /\.ts:\d+:\d+/,
    /\.js:\d+:\d+/,
    /node_modules\//,
    /Error:\s+.*\n\s+at /,
    /ECONNREFUSED/,
    /ENOENT/,
  ];
  return patterns.some((p) => p.test(text));
}

// ─── Analyst Workflow (40 steps + zero-day probes) ─────────────────────────

async function runAnalystWorkflow(analystId: number): Promise<AnalystResult> {
  const workflowStart = performance.now();
  const steps: TimedResult[] = [];
  const failedSteps: string[] = [];
  const zeroDayFindings: ZeroDayFinding[] = [];
  const email = `analyst${analystId}_${RUN_ID}@stresstest.local`;
  const password = 'Str3ss!Test_2026';
  const orgName = `StressOrg-${analystId}-${RUN_ID}`;
  const utmRef = ['cli', 'x', 'linkedin', 'blog', 'demo', 'soc2-report', 'sprs-calculator'][analystId % 7];
  const abVariant = `pricing_cta_variant:${analystId % 2 === 0 ? 'start-free' : 'start-trial'}`;
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
  // STEP 1: Signup (with UTM + A/B variant attribution)
  // ═══════════════════════════════════════════════════════════════════════════

  const signup = await jsonPost('01-signup', `${BASE_URL}/api/auth/signup`, {
    name: `Analyst ${analystId}`,
    email,
    password,
    orgName,
    ref: utmRef,
    ab: abVariant,
  });
  push(signup);
  if (signup.body?.organizationId) {
    organizationId = String(signup.body.organizationId);
  }

  if (signup.status >= 400) {
    const login = await jsonPost('01-signup-fallback-login', `${BASE_URL}/api/auth/login`, {
      email,
      password,
    });
    push(login);
    if (login.body?.token) cookie = `session=${login.body.token}`;
    if (login.body?.organizationId) organizationId = String(login.body.organizationId);
  } else if (signup.body?.token) {
    cookie = `session=${signup.body.token}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  push(await jsonGet('02-dashboard', `${BASE_URL}/api/dashboard?organizationId=${organizationId}`, cookie));

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Upload scan file (Nessus XML, 10 findings)
  // ═══════════════════════════════════════════════════════════════════════════

  const scanContent = generateNessusXml(analystId);
  const formData = new FormData();
  formData.append('file', new Blob([scanContent], { type: 'text/xml' }), `stress-scan-${analystId}.nessus`);
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
    push({ step: '03-upload-scan', method: 'POST', endpoint: '/api/upload', status: uploadRes.status, durationMs: uploadDuration, body: uploadBody });
    if (uploadBody.jobId) jobId = String(uploadBody.jobId);
  } catch (err: unknown) {
    push({ step: '03-upload-scan', method: 'POST', endpoint: '/api/upload', status: 0, durationMs: Math.round(performance.now() - uploadStart), error: err instanceof Error ? err.message : String(err) });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Poll job status
  // ═══════════════════════════════════════════════════════════════════════════

  if (jobId) {
    let pollAttempts = 0;
    let jobDone = false;
    while (!jobDone && pollAttempts < JOB_POLL_MAX) {
      await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL));
      const pollResult = await jsonGet('04-poll-job', `${BASE_URL}/api/upload/${jobId}`, cookie);
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
  // STEPS 5-7: Findings
  // ═══════════════════════════════════════════════════════════════════════════

  const findingsList = await jsonGet('05-findings-list', `${BASE_URL}/api/findings?organizationId=${organizationId}&page=1&limit=25`, cookie);
  push(findingsList);
  if (findingsList.body?.findings && Array.isArray(findingsList.body.findings)) {
    findingIds = (findingsList.body.findings as Array<{ id?: string }>).filter((f) => f.id).map((f) => f.id!).slice(0, 20);
  }

  push(await jsonGet('06-findings-critical', `${BASE_URL}/api/findings?organizationId=${organizationId}&severity=CRITICAL&limit=25`, cookie));

  if (findingIds.length > 0) {
    push(await jsonGet('07-finding-detail', `${BASE_URL}/api/findings/${findingIds[0]}`, cookie));
  } else {
    push({ step: '07-finding-detail', method: 'GET', endpoint: '/api/findings/[id]', status: -1, durationMs: 0, error: 'No findings' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 8-13: Cases
  // ═══════════════════════════════════════════════════════════════════════════

  push(await jsonPost('08-build-cases', `${BASE_URL}/api/cases/build`, { findingIds: findingIds.slice(0, 5), organizationId }, cookie));

  const casesList = await jsonGet('09-cases-list', `${BASE_URL}/api/cases?organizationId=${organizationId}&limit=20`, cookie);
  push(casesList);
  if (casesList.body?.cases && Array.isArray(casesList.body.cases)) {
    caseIds = (casesList.body.cases as Array<{ id?: string }>).filter((c) => c.id).map((c) => c.id!).slice(0, 10);
  }

  if (caseIds.length > 0) {
    push(await jsonGet('10-case-detail', `${BASE_URL}/api/cases/${caseIds[0]}?organizationId=${organizationId}`, cookie));
    push(await jsonPatch('11-update-case', `${BASE_URL}/api/cases/${caseIds[0]}`, { status: 'IN_PROGRESS', organizationId }, cookie));
    push(await jsonPost('12-case-comment', `${BASE_URL}/api/cases/${caseIds[0]}/comments`, { content: `[Stress ${analystId}] Investigating.`, organizationId }, cookie));
  } else {
    push({ step: '10-case-detail', method: 'GET', endpoint: '/api/cases/[id]', status: -1, durationMs: 0, error: 'No cases' });
    push({ step: '11-update-case', method: 'PATCH', endpoint: '/api/cases/[id]', status: -1, durationMs: 0, error: 'No cases' });
    push({ step: '12-case-comment', method: 'POST', endpoint: '/api/cases/[id]/comments', status: -1, durationMs: 0, error: 'No cases' });
  }

  if (caseIds.length >= 3) {
    push(await jsonPost('13-bulk-cases', `${BASE_URL}/api/cases/bulk`, { caseIds: caseIds.slice(0, 3), status: 'REMEDIATED', organizationId }, cookie));
  } else {
    push({ step: '13-bulk-cases', method: 'POST', endpoint: '/api/cases/bulk', status: -1, durationMs: 0, error: 'Not enough cases' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 14: AI remediation
  // ═══════════════════════════════════════════════════════════════════════════

  push(await jsonPost('14-ai-remediation', `${BASE_URL}/api/ai/remediation`, {
    findingTitle: `CVE-2024-${String(analystId).padStart(5, '0')} — RCE`,
    severity: 'CRITICAL',
    description: 'Remote code execution via deserialization.',
    organizationId,
  }, cookie));

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 15-22: Compliance & Export
  // ═══════════════════════════════════════════════════════════════════════════

  push(await jsonGet('15-compliance-frameworks', `${BASE_URL}/api/compliance/frameworks`, cookie));

  const frameworkIds = ['nist-800-53', 'soc2-type2', 'cmmc-level2', 'hipaa', 'pci-dss', 'iso-27001', 'gdpr'];
  const randomFw = frameworkIds[analystId % frameworkIds.length];

  push(await jsonGet('16-compliance-assessment', `${BASE_URL}/api/compliance/frameworks/${randomFw}/assessment?organizationId=${organizationId}`, cookie));
  push(await jsonGet('17-cross-framework-impact', `${BASE_URL}/api/compliance/impact?organizationId=${organizationId}&frameworks=hipaa,pci-dss,iso-27001,gdpr`, cookie));
  push(await jsonGet('18-poam', `${BASE_URL}/api/compliance/poam?organizationId=${organizationId}`, cookie));
  push(await jsonPost('19-poam-generate', `${BASE_URL}/api/compliance/poam/generate`, { organizationId, frameworks: [randomFw] }, cookie));
  push(await jsonGet('20-export-csv', `${BASE_URL}/api/export/findings?organizationId=${organizationId}&format=csv`, cookie));
  push(await jsonPost('21-export-pdf-exec', `${BASE_URL}/api/export/pdf`, { type: 'executive', organizationId, dateRange: { start: '2026-01-01', end: '2026-03-31' } }, cookie));
  push(await jsonPost('22-export-pdf-compliance', `${BASE_URL}/api/export/pdf`, { type: 'compliance', format: 'pdf', organizationId, framework: randomFw }, cookie));

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 23-30: GTM Features (G1-G5)
  // ═══════════════════════════════════════════════════════════════════════════

  push(await jsonGet('23-billing-usage', `${BASE_URL}/api/billing/usage?organizationId=${organizationId}`, cookie));
  push(await jsonPost('24-create-api-key', `${BASE_URL}/api/keys`, { name: `stress-key-${analystId}`, scopes: ['read:findings'], organizationId }, cookie));
  push(await jsonPost('25-create-webhook', `${BASE_URL}/api/webhooks/config`, { url: `https://hooks.stresstest.local/a-${analystId}`, events: ['finding.created'], secret: `whsec_${analystId}`, organizationId }, cookie));
  push(await jsonGet('26-notifications', `${BASE_URL}/api/notifications?organizationId=${organizationId}`, cookie));

  // G5.2: SOC 2 Readiness Tool (public endpoint, no auth)
  const cliScanData = generateCliScanJson(analystId);
  push(await jsonPost('27-soc2-readiness', `${BASE_URL}/api/soc2-readiness`, { email, scanData: JSON.stringify(cliScanData) }));
  push(await jsonPost('28-soc2-readiness-pdf', `${BASE_URL}/api/soc2-readiness/pdf`, { email, scanData: JSON.stringify(cliScanData) }));

  // G4.3: Funnel analytics (admin-only — expect 401/403 for regular analysts)
  push(await jsonGet('29-funnel-analytics', `${BASE_URL}/api/admin/funnel?period=30`, cookie));

  // G2.4: Blog subscribe
  push(await jsonPost('30-blog-subscribe', `${BASE_URL}/api/subscribe`, { email }));

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 31-36: Vertical Pages (response time + status checks)
  // ═══════════════════════════════════════════════════════════════════════════

  push(await pageGet('31-page-hipaa', '/hipaa'));
  push(await pageGet('32-page-soc2', '/soc2'));
  push(await pageGet('33-page-cmmc', '/cmmc'));
  push(await pageGet('34-page-pricing', '/pricing'));
  push(await pageGet('35-page-rss', '/blog/rss.xml'));
  push(await pageGet('36-page-developers', '/developers'));

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 37-40: Integration & Reporting
  // ═══════════════════════════════════════════════════════════════════════════

  push(await jsonGet('37-portfolio', `${BASE_URL}/api/portfolio?organizationId=${organizationId}`, cookie));
  push(await jsonGet('38-sla-check', `${BASE_URL}/api/sla/check?organizationId=${organizationId}`, cookie));
  push(await jsonPost('39-generate-report', `${BASE_URL}/api/reports/generate`, { type: 'executive', format: 'pdf', organizationId }, cookie));

  if (caseIds.length > 0) {
    push(await jsonPost('40-jira-bulk-sync', `${BASE_URL}/api/integrations/jira/bulk`, { organizationId, caseIds: caseIds.slice(0, 3), dryRun: true }, cookie));
  } else {
    push({ step: '40-jira-bulk-sync', method: 'POST', endpoint: '/api/integrations/jira/bulk', status: -1, durationMs: 0, error: 'No cases' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZERO-DAY / GAP DETECTION PROBES (every 20th analyst)
  // ═══════════════════════════════════════════════════════════════════════════

  if (analystId % 20 === 1) {
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
    if (result.status === 0 || result.status >= 500) failedSteps.push(result.step);
  }

  // Probe 1: Org Isolation
  {
    const foreignOrgId = `org-foreign-${analystId}-probe`;
    const result = await jsonGet('zd-org-isolation', `${BASE_URL}/api/findings?organizationId=${foreignOrgId}&limit=5`, cookie);
    push(result);
    if (result.status >= 200 && result.status < 300) {
      const returnedFindings = result.body?.findings;
      if (Array.isArray(returnedFindings) && returnedFindings.length > 0) {
        findings.push({ category: 'org-isolation', description: `Accessed findings for foreign org ${foreignOrgId}`, severity: 'CRITICAL', analystId });
      }
    }
  }

  // Probe 2: Data Leakage
  {
    const fakeFindingId = `finding-foreign-${(analystId + 500) % 2000}-probe`;
    const result = await jsonGet('zd-data-leakage', `${BASE_URL}/api/findings/${fakeFindingId}`, cookie);
    push(result);
    if (result.status >= 200 && result.status < 300 && result.body?.id) {
      findings.push({ category: 'data-leakage', description: `Resolved foreign finding ID: ${fakeFindingId}`, severity: 'CRITICAL', analystId });
    }
  }

  // Probe 3: Rate Limiting (100 rapid requests)
  {
    const rapidResults = await Promise.all(
      Array.from({ length: 100 }, () =>
        jsonGet('zd-rate-limit', `${BASE_URL}/api/dashboard?organizationId=${organizationId}`, cookie),
      ),
    );
    const got429 = rapidResults.some((r) => r.status === 429);
    push({ step: 'zd-rate-limit', method: 'GET', endpoint: '/api/dashboard', status: got429 ? 429 : 200, durationMs: Math.round(rapidResults.reduce((a, r) => a + r.durationMs, 0) / rapidResults.length) });
    if (!got429) {
      findings.push({ category: 'rate-limit-absent', description: '100 rapid requests returned no 429', severity: 'MEDIUM', analystId });
    }
  }

  // Probe 4: Race Conditions
  if (caseIds.length > 0) {
    const statuses = ['IN_PROGRESS', 'IN_TRIAGE', 'REMEDIATED', 'IN_PROGRESS', 'CLOSED', 'IN_TRIAGE', 'IN_PROGRESS', 'REMEDIATED', 'CLOSED', 'IN_PROGRESS'];
    const raceResults = await Promise.all(statuses.map((s, i) => jsonPatch(`zd-race-${i}`, `${BASE_URL}/api/cases/${caseIds[0]}`, { status: s, organizationId }, cookie)));
    const serverErrors = raceResults.filter((r) => r.status >= 500);
    push({ step: 'zd-race-condition', method: 'PATCH', endpoint: '/api/cases/[id]', status: serverErrors.length > 0 ? 500 : 200, durationMs: Math.round(raceResults.reduce((a, r) => a + r.durationMs, 0) / raceResults.length) });
    if (serverErrors.length > 0) {
      findings.push({ category: 'race-condition', description: `${serverErrors.length}/10 concurrent case updates caused 5xx`, severity: 'HIGH', analystId });
    }
  }

  // Probe 5: Session Cross-Contamination
  {
    const sessionResult = await jsonGet('zd-session-integrity', `${BASE_URL}/api/auth/session`, cookie);
    push(sessionResult);
    if (sessionResult.status >= 200 && sessionResult.status < 300 && sessionResult.body) {
      const sessionEmail = sessionResult.body.email as string | undefined;
      if (sessionEmail && !sessionEmail.includes(`analyst${analystId}_`)) {
        findings.push({ category: 'session-contamination', description: `Session returned ${sessionEmail}, expected analyst${analystId}_*`, severity: 'CRITICAL', analystId });
      }
    }
  }

  // Probe 6: Pagination Boundaries
  {
    const pageResult = await jsonGet('zd-pagination-boundary', `${BASE_URL}/api/findings?organizationId=${organizationId}&page=99999&limit=25`, cookie);
    push(pageResult);
    if (pageResult.status >= 500) {
      findings.push({ category: 'pagination-boundary', description: `Page 99999 caused ${pageResult.status}`, severity: 'MEDIUM', analystId });
    }
  }

  // Probe 7: SQL Injection
  for (const payload of ["'; DROP TABLE findings; --", "1 OR 1=1", "UNION SELECT * FROM users--"]) {
    const sqliResult = await jsonGet('zd-sqli-filter', `${BASE_URL}/api/findings?organizationId=${organizationId}&severity=${encodeURIComponent(payload)}&limit=5`, cookie);
    push(sqliResult);
    if (sqliResult.status >= 200 && sqliResult.status < 300) {
      const returnedFindings = sqliResult.body?.findings;
      if (Array.isArray(returnedFindings) && returnedFindings.length > 0) {
        findings.push({ category: 'sql-injection', description: `SQLi payload returned ${returnedFindings.length} results`, severity: 'CRITICAL', analystId, evidence: payload });
      }
    }
    if (sqliResult.status >= 500 && /syntax|sql|query|relation|column/i.test(JSON.stringify(sqliResult.body ?? {}))) {
      findings.push({ category: 'sql-injection', description: 'SQLi caused DB-related error', severity: 'CRITICAL', analystId, evidence: payload });
    }
  }

  // Probe 8: File Type Restriction
  {
    const exeForm = new FormData();
    exeForm.append('file', new Blob(['MZ\x90\x00\x03\x00\x00\x00'], { type: 'application/octet-stream' }), 'malicious.exe');
    exeForm.append('organizationId', organizationId);
    const exeHeaders: Record<string, string> = {};
    if (cookie) exeHeaders['Cookie'] = cookie;
    const exeResult = await timedFetch('zd-file-type-restriction', 'POST', `${BASE_URL}/api/upload`, { method: 'POST', headers: exeHeaders, body: exeForm });
    push(exeResult);
    if (exeResult.status >= 200 && exeResult.status < 300) {
      findings.push({ category: 'file-type-bypass', description: '.exe upload was accepted', severity: 'HIGH', analystId });
    }
  }

  // Probe 9: CORS Headers
  {
    const corsResult = await timedFetch('zd-cors', 'OPTIONS', `${BASE_URL}/api/findings`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.com', 'Access-Control-Request-Method': 'GET' },
    }, true);
    push(corsResult);
    const allowOrigin = corsResult.headers?.['access-control-allow-origin'];
    if (allowOrigin === '*' || allowOrigin === 'https://evil.example.com') {
      findings.push({ category: 'cors-misconfigured', description: `CORS allows origin: ${allowOrigin}`, severity: 'HIGH', analystId });
    }
  }

  // Probe 10: SOC 2 Readiness Abuse (oversize payload)
  {
    const oversizeFindings = Array.from({ length: 50000 }, (_, i) => ({
      id: `abuse-${i}`, title: 'x'.repeat(200), severity: 'HIGH', cwe: 'CWE-79',
    }));
    const abuseResult = await jsonPost('zd-soc2-abuse', `${BASE_URL}/api/soc2-readiness`, {
      email: 'abuse@test.local',
      scanData: JSON.stringify({ findings: oversizeFindings }),
    });
    push(abuseResult);
    if (abuseResult.status >= 500) {
      findings.push({ category: 'soc2-abuse', description: 'SOC 2 endpoint crashed on oversized payload', severity: 'MEDIUM', analystId });
    }
  }

  // Probe 11: A/B Cookie Manipulation
  {
    const manipulatedResult = await jsonGet(
      'zd-ab-manipulation',
      `${BASE_URL}/pricing`,
      'crp_ab_vid=INJECTED; crp_ab_variants=pricing_cta_variant:injected_value',
    );
    push(manipulatedResult);
    // This is informational — we mainly want to check no 500s
    if (manipulatedResult.status >= 500) {
      findings.push({ category: 'ab-cookie-crash', description: 'Manipulated A/B cookies caused server error', severity: 'MEDIUM', analystId });
    }
  }
}

// ─── Percentile Helpers ─────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Reporting ──────────────────────────────────────────────────────────────

function aggregateSteps(results: AnalystResult[]): StepAggregate[] {
  const map = new Map<string, TimedResult[]>();
  for (const r of results) {
    for (const s of r.steps) {
      const key = s.step;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
  }

  const aggregates: StepAggregate[] = [];
  for (const [step, items] of map) {
    const durations = items.filter((i) => i.status > 0).map((i) => i.durationMs).sort((a, b) => a - b);
    aggregates.push({
      step,
      endpoint: items[0].endpoint,
      method: items[0].method,
      total: items.length,
      successes: items.filter((i) => i.status >= 200 && i.status < 400).length,
      failures4xx: items.filter((i) => i.status >= 400 && i.status < 500).length,
      failures5xx: items.filter((i) => i.status >= 500).length,
      connErrors: items.filter((i) => i.status === 0).length,
      skipped: items.filter((i) => i.status === -1).length,
      avgMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
      minMs: durations.length > 0 ? durations[0] : 0,
      maxMs: durations.length > 0 ? durations[durations.length - 1] : 0,
    });
  }

  return aggregates.sort((a, b) => a.step.localeCompare(b.step));
}

function printReport(results: AnalystResult[], durationMs: number) {
  const totalAnalysts = results.length;
  const successAnalysts = results.filter((r) => r.success).length;
  const failedAnalysts = totalAnalysts - successAnalysts;
  const allZeroDay = results.flatMap((r) => r.zeroDayFindings);
  const criticalFindings = allZeroDay.filter((f) => f.severity === 'CRITICAL');
  const highFindings = allZeroDay.filter((f) => f.severity === 'HIGH');
  const totalRequests = results.reduce((a, r) => a + r.steps.length, 0);
  const totalDurationsMs = results.map((r) => r.totalMs).sort((a, b) => a - b);

  console.log('\n' + '═'.repeat(80));
  console.log('  CVERiskPilot Production Stress Test — 2000 Analyst Report');
  console.log('═'.repeat(80));
  console.log(`  Target:      ${BASE_URL}`);
  console.log(`  Analysts:    ${totalAnalysts} (${BATCH_SIZE}/wave, ${WAVE_DELAY_MS}ms delay)`);
  console.log(`  Duration:    ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Total Reqs:  ${totalRequests}`);
  console.log(`  Throughput:  ${(totalRequests / (durationMs / 1000)).toFixed(1)} req/s`);
  console.log('─'.repeat(80));
  console.log(`  SUCCESS:     ${successAnalysts}/${totalAnalysts} (${((successAnalysts / totalAnalysts) * 100).toFixed(1)}%)`);
  console.log(`  FAILED:      ${failedAnalysts}/${totalAnalysts}`);
  console.log(`  Analyst p50: ${percentile(totalDurationsMs, 50)}ms`);
  console.log(`  Analyst p95: ${percentile(totalDurationsMs, 95)}ms`);
  console.log(`  Analyst p99: ${percentile(totalDurationsMs, 99)}ms`);
  console.log('─'.repeat(80));

  // Zero-day summary
  if (allZeroDay.length > 0) {
    console.log(`\n  ZERO-DAY / GAP FINDINGS: ${allZeroDay.length}`);
    console.log(`    CRITICAL: ${criticalFindings.length}`);
    console.log(`    HIGH:     ${highFindings.length}`);
    console.log(`    MEDIUM:   ${allZeroDay.filter((f) => f.severity === 'MEDIUM').length}`);
    console.log(`    LOW:      ${allZeroDay.filter((f) => f.severity === 'LOW').length}`);
    console.log(`    INFO:     ${allZeroDay.filter((f) => f.severity === 'INFO').length}`);

    // Deduplicate by category
    const categories = new Map<string, { count: number; severity: string; description: string }>();
    for (const f of allZeroDay) {
      const existing = categories.get(f.category);
      if (!existing) {
        categories.set(f.category, { count: 1, severity: f.severity, description: f.description });
      } else {
        existing.count++;
      }
    }
    console.log('\n  Unique finding categories:');
    for (const [cat, info] of categories) {
      console.log(`    [${info.severity}] ${cat}: ${info.description} (${info.count}x)`);
    }
  } else {
    console.log('\n  ZERO-DAY FINDINGS: 0 — Clean!');
  }

  // Per-step breakdown
  const aggregates = aggregateSteps(results);
  console.log('\n  PER-STEP LATENCY BREAKDOWN:');
  console.log('  ' + '-'.repeat(120));
  console.log(`  ${'Step'.padEnd(30)} ${'Method'.padEnd(6)} ${'Endpoint'.padEnd(40)} ${'OK'.padStart(5)} ${'4xx'.padStart(5)} ${'5xx'.padStart(5)} ${'Err'.padStart(5)} ${'p50'.padStart(6)} ${'p95'.padStart(6)} ${'p99'.padStart(6)}`);
  console.log('  ' + '-'.repeat(120));
  for (const a of aggregates) {
    if (a.step.startsWith('zd-')) continue; // Skip zero-day probes in main table
    console.log(
      `  ${a.step.padEnd(30)} ${a.method.padEnd(6)} ${a.endpoint.padEnd(40)} ${String(a.successes).padStart(5)} ${String(a.failures4xx).padStart(5)} ${String(a.failures5xx).padStart(5)} ${String(a.connErrors).padStart(5)} ${String(a.p50Ms).padStart(5)}ms ${String(a.p95Ms).padStart(5)}ms ${String(a.p99Ms).padStart(5)}ms`,
    );
  }
  console.log('  ' + '-'.repeat(120));

  // Top 5 slowest endpoints
  const sortedBySlow = [...aggregates].filter((a) => !a.step.startsWith('zd-')).sort((a, b) => b.p95Ms - a.p95Ms);
  console.log('\n  TOP 5 SLOWEST ENDPOINTS (p95):');
  for (const a of sortedBySlow.slice(0, 5)) {
    console.log(`    ${a.p95Ms}ms — ${a.method} ${a.endpoint} (${a.step})`);
  }

  // Top 5 most failing endpoints
  const sortedByFail = [...aggregates].filter((a) => !a.step.startsWith('zd-') && (a.failures5xx + a.connErrors) > 0).sort((a, b) => (b.failures5xx + b.connErrors) - (a.failures5xx + a.connErrors));
  if (sortedByFail.length > 0) {
    console.log('\n  TOP 5 FAILING ENDPOINTS:');
    for (const a of sortedByFail.slice(0, 5)) {
      console.log(`    ${a.failures5xx + a.connErrors} failures — ${a.method} ${a.endpoint} (${a.failures5xx} 5xx, ${a.connErrors} conn)`);
    }
  }

  // GTM feature coverage
  console.log('\n  GTM FEATURE COVERAGE:');
  const gtmSteps = aggregates.filter((a) => ['27-soc2-readiness', '28-soc2-readiness-pdf', '29-funnel-analytics', '30-blog-subscribe', '31-page-hipaa', '32-page-soc2', '33-page-cmmc', '34-page-pricing', '35-page-rss', '36-page-developers'].includes(a.step));
  for (const a of gtmSteps) {
    const status = a.failures5xx === 0 && a.connErrors === 0 ? 'OK' : 'FAIL';
    console.log(`    [${status}] ${a.step}: ${a.successes}/${a.total} ok, p95=${a.p95Ms}ms`);
  }

  console.log('\n' + '═'.repeat(80));

  // Write results to file
  const resultsPath = `tests/stress/results/stress-2000-${RUN_ID}.json`;
  const reportData = {
    runId: RUN_ID,
    baseUrl: BASE_URL,
    analystCount: totalAnalysts,
    batchSize: BATCH_SIZE,
    durationMs,
    throughputReqPerSec: totalRequests / (durationMs / 1000),
    successRate: successAnalysts / totalAnalysts,
    totalRequests,
    analystLatency: { p50: percentile(totalDurationsMs, 50), p95: percentile(totalDurationsMs, 95), p99: percentile(totalDurationsMs, 99) },
    zeroDayFindings: allZeroDay,
    stepAggregates: aggregates,
    failedAnalysts: results.filter((r) => !r.success).map((r) => ({ id: r.analystId, failedSteps: r.failedSteps })),
  };

  try {
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.dirname(resultsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(reportData, null, 2));
    console.log(`  Results written to: ${resultsPath}`);
  } catch {
    console.log('  (Could not write results file)');
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nCVERiskPilot Stress Test — ${ANALYST_COUNT} Analysts`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Batch: ${BATCH_SIZE} analysts/wave, ${WAVE_DELAY_MS}ms delay\n`);

  const allStart = performance.now();
  const results: AnalystResult[] = [];

  const totalWaves = Math.ceil(ANALYST_COUNT / BATCH_SIZE);
  for (let wave = 0; wave < totalWaves; wave++) {
    const batchStart = wave * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, ANALYST_COUNT);
    const batchSize = batchEnd - batchStart;

    console.log(`  Wave ${wave + 1}/${totalWaves}: analysts ${batchStart + 1}-${batchEnd} (${batchSize} analysts)`);

    const batchPromises = Array.from({ length: batchSize }, (_, i) =>
      runAnalystWorkflow(batchStart + i + 1).catch((err): AnalystResult => ({
        analystId: batchStart + i + 1,
        email: `analyst${batchStart + i + 1}_${RUN_ID}@stresstest.local`,
        orgName: `StressOrg-${batchStart + i + 1}-${RUN_ID}`,
        steps: [],
        totalMs: 0,
        success: false,
        failedSteps: [`FATAL: ${err instanceof Error ? err.message : String(err)}`],
        zeroDayFindings: [],
      })),
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    const batchSuccess = batchResults.filter((r) => r.success).length;
    console.log(`    → ${batchSuccess}/${batchSize} successful`);

    if (wave < totalWaves - 1) {
      await new Promise((r) => setTimeout(r, WAVE_DELAY_MS));
    }
  }

  const totalDuration = Math.round(performance.now() - allStart);
  printReport(results, totalDuration);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
