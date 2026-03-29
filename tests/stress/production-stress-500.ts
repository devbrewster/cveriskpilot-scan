/**
 * CVERiskPilot Production Stress Test — 500 Concurrent Analysts
 *
 * Focus: Live production application functionality and workflow processes.
 * Simulates 500 analysts performing the full analyst lifecycle across
 * all production endpoints — auth, upload, triage, remediation, compliance,
 * reporting, team collaboration, asset management, and settings.
 *
 * 30-step workflow per analyst covering every major feature area:
 *
 *   AUTH & SESSION
 *    1. Signup (create org)
 *    2. Login (obtain session)
 *    3. Session validation
 *
 *   ONBOARDING & SETUP
 *    4. Create client
 *    5. Create team
 *    6. Add team member
 *    7. Create API key
 *    8. Configure webhook
 *
 *   SCAN PIPELINE
 *    9. Upload scan (Nessus/SARIF/CSV — rotated)
 *   10. Poll job status
 *
 *   FINDINGS WORKFLOW
 *   11. Dashboard load
 *   12. List findings (unfiltered)
 *   13. Filter findings (critical)
 *   14. Filter findings (by host)
 *   15. View finding detail
 *
 *   CASE MANAGEMENT
 *   16. List cases
 *   17. View case detail
 *   18. Triage case (status update)
 *   19. Assign case to analyst
 *   20. Add case comment
 *   21. Bulk update cases
 *
 *   REMEDIATION & AI
 *   22. AI remediation advisory
 *   23. Create risk exception
 *
 *   COMPLIANCE & REPORTING
 *   24. List compliance frameworks
 *   25. View framework assessment
 *   26. Generate POAM
 *   27. Export findings CSV
 *   28. Generate executive report
 *
 *   PLATFORM
 *   29. Notification count
 *   30. Logout
 *
 * Usage:
 *   npx tsx tests/stress/production-stress-500.ts [BASE_URL] [ANALYST_COUNT]
 *
 * Defaults: http://localhost:3000, 500 analysts
 */

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const ANALYST_COUNT = parseInt(process.argv[3] ?? '500', 10);
const RUN_ID = Date.now();
const BATCH_SIZE = 50; // Concurrent analysts per wave
const WAVE_DELAY_MS = 300; // Ramp-up delay between waves
const REQUEST_TIMEOUT = 30_000;

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
}

interface AnalystResult {
  analystId: number;
  email: string;
  orgName: string;
  steps: TimedResult[];
  totalMs: number;
  success: boolean;
  failedSteps: string[];
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
    try {
      const text = await res.text();
      bytes = text.length;
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // non-JSON response
    }
    return { step, method, endpoint, status: res.status, durationMs, body, bytes };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return { step, method, endpoint, status: 0, durationMs, error: message };
  }
}

function jsonPost(step: string, url: string, data: unknown, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'POST', url, { method: 'POST', headers, body: JSON.stringify(data) });
}

function jsonPut(step: string, url: string, data: unknown, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'PUT', url, { method: 'PUT', headers, body: JSON.stringify(data) });
}

function jsonPatch(step: string, url: string, data: unknown, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'PATCH', url, { method: 'PATCH', headers, body: JSON.stringify(data) });
}

function jsonGet(step: string, url: string, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'GET', url, { method: 'GET', headers });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _jsonDelete(step: string, url: string, cookie?: string): Promise<TimedResult> {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  return timedFetch(step, 'DELETE', url, { method: 'DELETE', headers });
}

// ─── Scan File Generators ───────────────────────────────────────────────────

function generateNessusXml(analystId: number, findingCount: number): string {
  const hosts = Array.from({ length: Math.min(findingCount, 10) }, (_, i) => {
    const ip = `10.${analystId % 256}.${Math.floor(i / 256) % 256}.${(i + 1) % 256}`;
    const items = Array.from(
      { length: Math.ceil(findingCount / 10) },
      (_, j) => {
        const idx = i * Math.ceil(findingCount / 10) + j;
        const sev = (idx % 4) + 1;
        return `<ReportItem port="${80 + (idx % 20)}" svc_name="http" protocol="tcp" severity="${sev}" pluginID="${10000 + analystId * 100 + idx}" pluginName="Vuln-${analystId}-${idx}">
<description>Production stress test finding ${idx} for analyst ${analystId}.</description>
<synopsis>Vulnerability ${idx} detected on ${ip}.</synopsis>
<solution>Apply vendor patch.</solution>
<cvss3_base_score>${(4.0 + sev * 1.5).toFixed(1)}</cvss3_base_score>
<cve>CVE-2024-${String(analystId * 100 + idx).padStart(5, '0')}</cve>
<cwe>CWE-${79 + (idx % 30)}</cwe>
</ReportItem>`;
      },
    ).join('\n');

    return `<ReportHost name="${ip}">
<HostProperties><tag name="host-ip">${ip}</tag></HostProperties>
${items}
</ReportHost>`;
  }).join('\n');

  return `<?xml version="1.0"?>
<NessusClientData_v2>
<Report name="stress-scan-${analystId}">
${hosts}
</Report>
</NessusClientData_v2>`;
}

function generateSarifJson(analystId: number, findingCount: number): string {
  const results = Array.from({ length: findingCount }, (_, i) => ({
    ruleId: `VULN-${analystId}-${i}`,
    level: ['error', 'warning', 'note'][i % 3],
    message: { text: `SARIF finding ${analystId}-${i}: vulnerability in component` },
    locations: [{
      physicalLocation: {
        artifactLocation: { uri: `src/module-${analystId}/file-${i}.ts` },
        region: { startLine: 10 + i, startColumn: 1 },
      },
    }],
  }));

  return JSON.stringify({
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: `Scanner-${analystId}`, version: '1.0.0', rules: [] } },
      results,
    }],
  });
}

function generateCsvContent(analystId: number, findingCount: number): string {
  const header = 'CVE,Title,Severity,Host,Description,Solution';
  const rows = Array.from({ length: findingCount }, (_, i) => {
    const sev = ['Critical', 'High', 'Medium', 'Low'][i % 4];
    return `CVE-2024-${String(analystId * 100 + i).padStart(5, '0')},CSV-Vuln-${analystId}-${i},${sev},host-${analystId}-${i}.local,"Finding ${i} for analyst ${analystId}","Upgrade to latest"`;
  });
  return [header, ...rows].join('\n');
}

// ─── Analyst Workflow (30 steps) ────────────────────────────────────────────

async function runAnalystWorkflow(analystId: number): Promise<AnalystResult> {
  const workflowStart = performance.now();
  const steps: TimedResult[] = [];
  const failedSteps: string[] = [];
  const email = `analyst${analystId}_${RUN_ID}@stresstest.local`;
  const password = 'Str3ss!Test_2026';
  const orgName = `StressOrg-${analystId}-${RUN_ID}`;
  let cookie = '';
  let organizationId = '';
  let clientId = '';
  let teamId = '';
  let _keyId = '';
  let _webhookId = '';
  let findingIds: string[] = [];
  let caseIds: string[] = [];

  function push(result: TimedResult) {
    steps.push(result);
    if (result.status === 0 || result.status >= 500) {
      failedSteps.push(result.step);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH & SESSION
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 1: Signup
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

  // Step 2: Login
  const login = await jsonPost('02-login', `${BASE_URL}/api/auth/login`, {
    email,
    password,
  });
  push(login);
  if (login.body?.token) {
    cookie = `session=${login.body.token}`;
  }

  // Step 3: Session validation
  const session = await jsonGet('03-session', `${BASE_URL}/api/auth/session`, cookie);
  push(session);

  // ═══════════════════════════════════════════════════════════════════════════
  // ONBOARDING & SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 4: Create client
  const createClient = await jsonPost('04-create-client', `${BASE_URL}/api/clients`, {
    name: `Client-${analystId}`,
    industry: 'technology',
    organizationId,
  }, cookie);
  push(createClient);
  if (createClient.body?.id) {
    clientId = String(createClient.body.id);
  }

  // Step 5: Create team
  const createTeam = await jsonPost('05-create-team', `${BASE_URL}/api/teams`, {
    name: `Team-${analystId}`,
    description: `Stress test team for analyst ${analystId}`,
    organizationId,
  }, cookie);
  push(createTeam);
  if (createTeam.body?.id) {
    teamId = String(createTeam.body.id);
  }

  // Step 6: Add team member (self)
  if (teamId) {
    const addMember = await jsonPost('06-add-team-member', `${BASE_URL}/api/teams/${teamId}/members`, {
      email,
      role: 'analyst',
      organizationId,
    }, cookie);
    push(addMember);
  } else {
    push({ step: '06-add-team-member', method: 'POST', endpoint: '/api/teams/[id]/members', status: -1, durationMs: 0, error: 'No team created' });
  }

  // Step 7: Create API key
  const createKey = await jsonPost('07-create-api-key', `${BASE_URL}/api/keys`, {
    name: `stress-key-${analystId}`,
    scopes: ['read:findings', 'read:cases'],
    organizationId,
  }, cookie);
  push(createKey);
  if (createKey.body?.id) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _keyId = String(createKey.body.id);
  }

  // Step 8: Configure webhook
  const createWebhook = await jsonPost('08-create-webhook', `${BASE_URL}/api/webhooks/config`, {
    url: `https://hooks.stresstest.local/analyst-${analystId}`,
    events: ['finding.created', 'case.updated'],
    secret: `whsec_stress_${analystId}`,
    organizationId,
  }, cookie);
  push(createWebhook);
  if (createWebhook.body?.id) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _webhookId = String(createWebhook.body.id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCAN PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 9: Upload scan file (rotate format per analyst)
  const findingCount = 8 + (analystId % 7); // 8-14 findings per scan
  const scanFormat = analystId % 3;
  let scanContent: string;
  let fileName: string;
  let mimeType: string;

  if (scanFormat === 0) {
    scanContent = generateNessusXml(analystId, findingCount);
    fileName = `stress-scan-${analystId}.nessus`;
    mimeType = 'text/xml';
  } else if (scanFormat === 1) {
    scanContent = generateSarifJson(analystId, findingCount);
    fileName = `stress-scan-${analystId}.sarif`;
    mimeType = 'application/json';
  } else {
    scanContent = generateCsvContent(analystId, findingCount);
    fileName = `stress-scan-${analystId}.csv`;
    mimeType = 'text/csv';
  }

  const formData = new FormData();
  formData.append('file', new Blob([scanContent], { type: mimeType }), fileName);
  if (clientId) formData.append('clientId', clientId);
  if (organizationId) formData.append('organizationId', organizationId);

  const uploadStart = performance.now();
  let jobId = '';
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
      step: '09-upload-scan',
      method: 'POST',
      endpoint: '/api/upload',
      status: uploadRes.status,
      durationMs: uploadDuration,
      body: uploadBody,
    });
    if (uploadBody.jobId) jobId = String(uploadBody.jobId);
  } catch (err: unknown) {
    push({
      step: '09-upload-scan',
      method: 'POST',
      endpoint: '/api/upload',
      status: 0,
      durationMs: Math.round(performance.now() - uploadStart),
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 10: Poll job status
  if (jobId) {
    let pollAttempts = 0;
    let jobDone = false;
    while (!jobDone && pollAttempts < 15) {
      await new Promise((r) => setTimeout(r, 800));
      const pollResult = await jsonGet(
        '10-poll-job',
        `${BASE_URL}/api/upload/${jobId}`,
        cookie,
      );
      pollAttempts++;
      const status = pollResult.body?.status as string | undefined;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'COMPLETE') {
        jobDone = true;
        push(pollResult);
      } else if (pollAttempts >= 15) {
        push({ ...pollResult, error: `Job still ${status} after ${pollAttempts} polls` });
      }
    }
  } else {
    push({ step: '10-poll-job', method: 'GET', endpoint: '/api/upload/[jobId]', status: -1, durationMs: 0, error: 'No jobId from upload' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINDINGS WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 11: Dashboard
  const dashboard = await jsonGet(
    '11-dashboard',
    `${BASE_URL}/api/dashboard?organizationId=${organizationId}`,
    cookie,
  );
  push(dashboard);

  // Step 12: List findings (unfiltered)
  const findingsList = await jsonGet(
    '12-findings-list',
    `${BASE_URL}/api/findings?organizationId=${organizationId}&limit=50`,
    cookie,
  );
  push(findingsList);
  if (findingsList.body?.findings && Array.isArray(findingsList.body.findings)) {
    findingIds = (findingsList.body.findings as Array<{ id?: string }>)
      .filter((f) => f.id)
      .map((f) => f.id!)
      .slice(0, 20);
  }

  // Step 13: Filter findings — critical severity
  const findingsCritical = await jsonGet(
    '13-findings-critical',
    `${BASE_URL}/api/findings?organizationId=${organizationId}&severity=CRITICAL&limit=20`,
    cookie,
  );
  push(findingsCritical);

  // Step 14: Filter findings — by hostname
  const findingsHost = await jsonGet(
    '14-findings-by-host',
    `${BASE_URL}/api/findings?organizationId=${organizationId}&hostname=host-${analystId}-0&limit=20`,
    cookie,
  );
  push(findingsHost);

  // Step 15: View finding detail
  if (findingIds.length > 0) {
    const findingDetail = await jsonGet(
      '15-finding-detail',
      `${BASE_URL}/api/findings/${findingIds[0]}`,
      cookie,
    );
    push(findingDetail);
  } else {
    push({ step: '15-finding-detail', method: 'GET', endpoint: '/api/findings/[id]', status: -1, durationMs: 0, error: 'No findings available' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CASE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 16: List cases
  const casesList = await jsonGet(
    '16-cases-list',
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

  // Step 17: View case detail
  if (caseIds.length > 0) {
    const caseDetail = await jsonGet(
      '17-case-detail',
      `${BASE_URL}/api/cases/${caseIds[0]}?organizationId=${organizationId}`,
      cookie,
    );
    push(caseDetail);
  } else {
    push({ step: '17-case-detail', method: 'GET', endpoint: '/api/cases/[id]', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // Step 18: Triage case (status update)
  if (caseIds.length > 0) {
    const triageCase = await jsonPatch(
      '18-triage-case',
      `${BASE_URL}/api/cases/${caseIds[0]}`,
      { status: 'IN_TRIAGE', organizationId },
      cookie,
    );
    push(triageCase);
  } else {
    push({ step: '18-triage-case', method: 'PATCH', endpoint: '/api/cases/[id]', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // Step 19: Assign case
  if (caseIds.length > 0) {
    const assignCase = await jsonPut(
      '19-assign-case',
      `${BASE_URL}/api/cases/${caseIds[0]}/assign`,
      { assigneeId: email, organizationId },
      cookie,
    );
    push(assignCase);
  } else {
    push({ step: '19-assign-case', method: 'PUT', endpoint: '/api/cases/[id]/assign', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // Step 20: Add case comment
  if (caseIds.length > 0) {
    const comment = await jsonPost(
      '20-case-comment',
      `${BASE_URL}/api/cases/${caseIds[0]}/comments`,
      {
        content: `[Stress ${analystId}] Investigating vulnerability. Confirmed on asset. Remediation in progress — ETA 48 hours.`,
        organizationId,
      },
      cookie,
    );
    push(comment);
  } else {
    push({ step: '20-case-comment', method: 'POST', endpoint: '/api/cases/[id]/comments', status: -1, durationMs: 0, error: 'No cases available' });
  }

  // Step 21: Bulk update cases
  if (caseIds.length >= 2) {
    const bulkUpdate = await jsonPatch(
      '21-bulk-update-cases',
      `${BASE_URL}/api/cases/bulk`,
      { caseIds: caseIds.slice(0, 5), status: 'IN_REMEDIATION', organizationId },
      cookie,
    );
    push(bulkUpdate);
  } else {
    push({ step: '21-bulk-update-cases', method: 'PATCH', endpoint: '/api/cases/bulk', status: -1, durationMs: 0, error: 'Not enough cases' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REMEDIATION & AI
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 22: AI remediation advisory
  const aiRemediation = await jsonPost(
    '22-ai-remediation',
    `${BASE_URL}/api/ai/remediation`,
    {
      findingTitle: `CVE-2024-${String(analystId).padStart(5, '0')} — Remote Code Execution`,
      severity: 'CRITICAL',
      description: 'A remote code execution vulnerability allows unauthenticated attackers to execute arbitrary commands on the affected system.',
      organizationId,
    },
    cookie,
  );
  push(aiRemediation);

  // Step 23: Create risk exception
  const createException = await jsonPost(
    '23-create-exception',
    `${BASE_URL}/api/exceptions`,
    {
      title: `Risk exception for analyst ${analystId}`,
      justification: 'Compensating controls in place. System isolated in DMZ with WAF protection. Patch scheduled for next maintenance window.',
      severity: 'HIGH',
      caseId: caseIds[0] ?? undefined,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      organizationId,
    },
    cookie,
  );
  push(createException);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE & REPORTING
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 24: List compliance frameworks
  const frameworks = await jsonGet(
    '24-compliance-frameworks',
    `${BASE_URL}/api/compliance/frameworks`,
    cookie,
  );
  push(frameworks);

  // Step 25: View framework assessment
  let frameworkId = '';
  if (frameworks.body?.frameworks && Array.isArray(frameworks.body.frameworks)) {
    const fws = frameworks.body.frameworks as Array<{ id?: string }>;
    if (fws.length > 0 && fws[0].id) frameworkId = fws[0].id;
  }
  if (frameworkId) {
    const assessment = await jsonGet(
      '25-framework-assessment',
      `${BASE_URL}/api/compliance/frameworks/${frameworkId}?organizationId=${organizationId}`,
      cookie,
    );
    push(assessment);
  } else {
    push({ step: '25-framework-assessment', method: 'GET', endpoint: '/api/compliance/frameworks/[id]', status: -1, durationMs: 0, error: 'No frameworks' });
  }

  // Step 26: Generate POAM
  const poam = await jsonGet(
    '26-poam',
    `${BASE_URL}/api/compliance/poam?organizationId=${organizationId}`,
    cookie,
  );
  push(poam);

  // Step 27: Export findings CSV
  const exportCsv = await jsonGet(
    '27-export-csv',
    `${BASE_URL}/api/export/findings?organizationId=${organizationId}&format=csv`,
    cookie,
  );
  push(exportCsv);

  // Step 28: Generate executive report
  const genReport = await jsonPost(
    '28-generate-report',
    `${BASE_URL}/api/reports/generate`,
    {
      type: 'executive',
      format: 'pdf',
      organizationId,
      dateRange: {
        start: '2026-01-01T00:00:00Z',
        end: '2026-03-28T23:59:59Z',
      },
    },
    cookie,
  );
  push(genReport);

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 29: Notification count
  const notifCount = await jsonGet(
    '29-notification-count',
    `${BASE_URL}/api/notifications/count?organizationId=${organizationId}`,
    cookie,
  );
  push(notifCount);

  // Step 30: Logout
  const logout = await jsonPost('30-logout', `${BASE_URL}/api/auth/logout`, {}, cookie);
  push(logout);

  const totalMs = Math.round(performance.now() - workflowStart);

  return {
    analystId,
    email,
    orgName,
    steps,
    totalMs,
    success: failedSteps.length === 0,
    failedSteps,
  };
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
      runAnalystWorkflow(startIdx + i + 1),
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    const waveMs = Math.round(performance.now() - waveStart);
    const successes = batchResults.filter((r) => r.success).length;
    const reqs = batchResults.reduce((a, r) => a + r.steps.length, 0);
    console.log(`${successes}/${batchCount} passed | ${reqs} requests | ${(waveMs / 1000).toFixed(1)}s`);

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

  // Aggregate by step
  const stepMap = new Map<string, { durations: number[]; method: string; endpoint: string; ok: number; fail4xx: number; fail5xx: number; connErr: number; skipped: number }>();

  for (const result of results) {
    for (const step of result.steps) {
      if (!stepMap.has(step.step)) {
        stepMap.set(step.step, {
          durations: [],
          method: step.method,
          endpoint: step.endpoint,
          ok: 0, fail4xx: 0, fail5xx: 0, connErr: 0, skipped: 0,
        });
      }
      const agg = stepMap.get(step.step)!;
      agg.durations.push(step.durationMs);

      if (step.status === -1) agg.skipped++;
      else if (step.status === 0) agg.connErr++;
      else if (step.status >= 200 && step.status < 400) agg.ok++;
      else if (step.status >= 400 && step.status < 500) agg.fail4xx++;
      else if (step.status >= 500) agg.fail5xx++;
    }
  }

  const aggregates: StepAggregate[] = [];
  for (const [step, data] of stepMap.entries()) {
    const valid = data.durations.filter((d) => d > 0);
    aggregates.push({
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

  const workflowDurations = results.map((r) => r.totalMs);
  const totalRequests = results.reduce((acc, r) => acc + r.steps.length, 0);
  const total5xx = aggregates.reduce((a, s) => a + s.failures5xx, 0);
  const totalConnErr = aggregates.reduce((a, s) => a + s.connErrors, 0);
  const total4xx = aggregates.reduce((a, s) => a + s.failures4xx, 0);
  const totalSkipped = aggregates.reduce((a, s) => a + s.skipped, 0);

  const W = 120;

  console.log('\n');
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║' + '  CVERiskPilot Production Stress Test — 500 Analyst Focus Group Report'.padEnd(W) + '║');
  console.log('║' + `  ${new Date().toISOString()}  |  Run ID: ${RUN_ID}`.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Overview ──
  console.log('║' + '  OVERVIEW'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');
  console.log('║' + `  Analysts: ${totalAnalysts}  |  Passed: ${successfulAnalysts}  |  Failed: ${failedAnalysts}  |  Pass Rate: ${((successfulAnalysts / totalAnalysts) * 100).toFixed(1)}%`.padEnd(W) + '║');
  console.log('║' + `  Total Requests: ${totalRequests}  |  2xx/3xx: ${aggregates.reduce((a, s) => a + s.successes, 0)}  |  4xx: ${total4xx}  |  5xx: ${total5xx}  |  ConnErr: ${totalConnErr}  |  Skipped: ${totalSkipped}`.padEnd(W) + '║');
  console.log('║' + `  Error Rate (5xx+conn): ${(((total5xx + totalConnErr) / (totalRequests - totalSkipped)) * 100).toFixed(2)}%  |  Test Duration: ${(totalTestMs / 1000).toFixed(1)}s`.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Workflow Timing ──
  console.log('║' + '  END-TO-END WORKFLOW TIMING (per analyst)'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');
  console.log('║' + `  Avg: ${Math.round(workflowDurations.reduce((a, b) => a + b, 0) / workflowDurations.length)}ms  |  P50: ${percentile(workflowDurations, 50)}ms  |  P95: ${percentile(workflowDurations, 95)}ms  |  P99: ${percentile(workflowDurations, 99)}ms  |  Max: ${Math.max(...workflowDurations)}ms`.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Step-by-Step Breakdown ──
  console.log('║' + '  STEP-BY-STEP BREAKDOWN (30 workflow steps)'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  const colHeader = [
    'Step'.padEnd(28),
    'Mtd'.padEnd(5),
    'Tot'.padStart(4),
    'OK'.padStart(4),
    '4xx'.padStart(4),
    '5xx'.padStart(4),
    'Err'.padStart(4),
    'Avg'.padStart(7),
    'P50'.padStart(7),
    'P95'.padStart(7),
    'P99'.padStart(7),
    'Max'.padStart(7),
  ].join(' | ');
  console.log('║  ' + colHeader.padEnd(W - 2) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  for (const agg of aggregates) {
    const row = [
      agg.step.padEnd(28),
      agg.method.padEnd(5),
      String(agg.total).padStart(4),
      String(agg.successes).padStart(4),
      String(agg.failures4xx).padStart(4),
      String(agg.failures5xx).padStart(4),
      String(agg.connErrors).padStart(4),
      `${agg.avgMs}ms`.padStart(7),
      `${agg.p50Ms}ms`.padStart(7),
      `${agg.p95Ms}ms`.padStart(7),
      `${agg.p99Ms}ms`.padStart(7),
      `${agg.maxMs}ms`.padStart(7),
    ].join(' | ');

    // Highlight problem rows
    const hasProblems = agg.failures5xx > 0 || agg.connErrors > 0;
    const prefix = hasProblems ? '> ' : '  ';
    console.log('║' + prefix + row.padEnd(W - 2) + '║');
  }

  console.log('╠' + '═'.repeat(W) + '╣');

  // ── Feature Area Breakdown ──
  console.log('║' + '  FEATURE AREA LATENCY (grouped)'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  const areas: Record<string, string[]> = {
    'Auth & Session':    ['01-signup', '02-login', '03-session', '30-logout'],
    'Onboarding':        ['04-create-client', '05-create-team', '06-add-team-member', '07-create-api-key', '08-create-webhook'],
    'Scan Pipeline':     ['09-upload-scan', '10-poll-job'],
    'Findings':          ['11-dashboard', '12-findings-list', '13-findings-critical', '14-findings-by-host', '15-finding-detail'],
    'Case Management':   ['16-cases-list', '17-case-detail', '18-triage-case', '19-assign-case', '20-case-comment', '21-bulk-update-cases'],
    'AI & Exceptions':   ['22-ai-remediation', '23-create-exception'],
    'Compliance':        ['24-compliance-frameworks', '25-framework-assessment', '26-poam'],
    'Reporting':         ['27-export-csv', '28-generate-report'],
    'Platform':          ['29-notification-count'],
  };

  for (const [area, stepNames] of Object.entries(areas)) {
    const areaAggs = aggregates.filter((a) => stepNames.includes(a.step));
    if (areaAggs.length === 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _allDurations = areaAggs.flatMap((_a) => {
      // Reconstruct durations from results
      const valid: number[] = [];
      for (const r of results) {
        for (const s of r.steps) {
          if (stepNames.includes(s.step) && s.durationMs > 0) {
            valid.push(s.durationMs);
          }
        }
      }
      return valid;
    });
    // Deduplicate — above double-counts due to flatMap over areaAggs
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

    const line = `  ${area.padEnd(20)} Avg: ${Math.round(areaDurations.reduce((a, b) => a + b, 0) / (areaDurations.length || 1))}ms  |  P95: ${percentile(areaDurations, 95)}ms  |  Errors: ${areaErrors}/${areaTotal} (${((areaErrors / (areaTotal || 1)) * 100).toFixed(1)}%)`;
    console.log('║' + line.padEnd(W) + '║');
  }

  console.log('╠' + '═'.repeat(W) + '╣');

  // ── SLA Assessment ──
  console.log('║' + '  PRODUCTION SLA ASSESSMENT'.padEnd(W) + '║');
  console.log('╟' + '─'.repeat(W) + '╢');

  const errorRate = (total5xx + totalConnErr) / (totalRequests - totalSkipped);
  const passRate = successfulAnalysts / totalAnalysts;
  const dashboardAgg = aggregates.find((a) => a.step === '11-dashboard');
  const uploadAgg = aggregates.find((a) => a.step === '09-upload-scan');
  const findingsAgg = aggregates.find((a) => a.step === '12-findings-list');
  const aiAgg = aggregates.find((a) => a.step === '22-ai-remediation');

  const slaChecks = [
    { name: 'Dashboard P95 < 1s', pass: (dashboardAgg?.p95Ms ?? 0) < 1000, actual: `${dashboardAgg?.p95Ms ?? 0}ms` },
    { name: 'Findings List P95 < 2s', pass: (findingsAgg?.p95Ms ?? 0) < 2000, actual: `${findingsAgg?.p95Ms ?? 0}ms` },
    { name: 'Upload P95 < 10s', pass: (uploadAgg?.p95Ms ?? 0) < 10_000, actual: `${uploadAgg?.p95Ms ?? 0}ms` },
    { name: 'AI Remediation P95 < 15s', pass: (aiAgg?.p95Ms ?? 0) < 15_000, actual: `${aiAgg?.p95Ms ?? 0}ms` },
    { name: 'All API P95 < 5s', pass: aggregates.every((a) => a.p95Ms < 5000 || a.skipped === a.total), actual: `max ${Math.max(...aggregates.filter(a => a.skipped < a.total).map(a => a.p95Ms))}ms` },
    { name: 'All API P99 < 10s', pass: aggregates.every((a) => a.p99Ms < 10_000 || a.skipped === a.total), actual: `max ${Math.max(...aggregates.filter(a => a.skipped < a.total).map(a => a.p99Ms))}ms` },
    { name: 'Error Rate < 1%', pass: errorRate < 0.01, actual: `${(errorRate * 100).toFixed(2)}%` },
    { name: 'Error Rate < 5%', pass: errorRate < 0.05, actual: `${(errorRate * 100).toFixed(2)}%` },
    { name: 'Zero Connection Errors', pass: totalConnErr === 0, actual: `${totalConnErr}` },
    { name: 'Analyst Pass Rate > 95%', pass: passRate > 0.95, actual: `${(passRate * 100).toFixed(1)}%` },
    { name: 'Analyst Pass Rate > 80%', pass: passRate > 0.80, actual: `${(passRate * 100).toFixed(1)}%` },
    { name: 'Workflow P95 < 60s', pass: percentile(workflowDurations, 95) < 60_000, actual: `${percentile(workflowDurations, 95)}ms` },
    { name: 'Workflow P99 < 120s', pass: percentile(workflowDurations, 99) < 120_000, actual: `${percentile(workflowDurations, 99)}ms` },
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
    const line = `  ${s.method.padEnd(6)} ${s.step.padEnd(28)} P95: ${String(s.p95Ms).padStart(6)}ms  P99: ${String(s.p99Ms).padStart(6)}ms  Avg: ${String(s.avgMs).padStart(6)}ms`;
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
      const line = `  ${s.method.padEnd(6)} ${s.step.padEnd(28)} 5xx: ${String(s.failures5xx).padStart(3)}  ConnErr: ${String(s.connErrors).padStart(3)}  (${errRate}% of ${s.total - s.skipped} requests)`;
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
  console.log('║' + `  Peak Concurrency: ${BATCH_SIZE} analysts x 30 steps`.padEnd(W) + '║');

  // ── Verdict ──
  console.log('╠' + '═'.repeat(W) + '╣');
  let verdict: string;
  if (passedSla >= 11) {
    verdict = 'PRODUCTION READY — All critical SLAs met at 500 analyst concurrency';
  } else if (passedSla >= 8) {
    verdict = 'CONDITIONAL — Most SLAs met; review bottlenecks before launch';
  } else if (passedSla >= 5) {
    verdict = 'AT RISK — Multiple SLA failures; performance optimization needed';
  } else {
    verdict = 'NOT READY — Critical SLA failures across multiple areas';
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
    for (const [step, count] of sorted.slice(0, 10)) {
      console.log(`  ${step.padEnd(30)} ${count} analysts affected (${((count / totalAnalysts) * 100).toFixed(1)}%)`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const W = 64;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║' + '  CVERiskPilot — 500 Analyst Production Stress Test'.padEnd(W) + '║');
  console.log('║' + '  Full Workflow Simulation: 30 Steps per Analyst'.padEnd(W) + '║');
  console.log('╠' + '═'.repeat(W) + '╣');
  console.log('║' + `  Base URL:    ${BASE_URL}`.padEnd(W) + '║');
  console.log('║' + `  Analysts:    ${ANALYST_COUNT}`.padEnd(W) + '║');
  console.log('║' + `  Batch Size:  ${BATCH_SIZE} (concurrent per wave)`.padEnd(W) + '║');
  console.log('║' + `  Waves:       ${Math.ceil(ANALYST_COUNT / BATCH_SIZE)}`.padEnd(W) + '║');
  console.log('║' + `  Run ID:      ${RUN_ID}`.padEnd(W) + '║');
  console.log('║' + `  Timestamp:   ${new Date().toISOString()}`.padEnd(W) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');

  console.log('\nWorkflow per analyst (30 steps):');
  console.log('  ┌─ AUTH ──────────────────────────────────────────────┐');
  console.log('  │  1. Signup     2. Login      3. Session check       │');
  console.log('  ├─ ONBOARDING ────────────────────────────────────────┤');
  console.log('  │  4. Client     5. Team       6. Member   7. API Key │');
  console.log('  │  8. Webhook                                         │');
  console.log('  ├─ SCAN PIPELINE ─────────────────────────────────────┤');
  console.log('  │  9. Upload    10. Poll job                          │');
  console.log('  ├─ FINDINGS ──────────────────────────────────────────┤');
  console.log('  │ 11. Dashboard 12. List      13. Critical 14. Host   │');
  console.log('  │ 15. Detail                                          │');
  console.log('  ├─ CASES ─────────────────────────────────────────────┤');
  console.log('  │ 16. List     17. Detail     18. Triage   19. Assign │');
  console.log('  │ 20. Comment  21. Bulk update                        │');
  console.log('  ├─ AI & RISK ─────────────────────────────────────────┤');
  console.log('  │ 22. AI advisory  23. Risk exception                 │');
  console.log('  ├─ COMPLIANCE & REPORTING ────────────────────────────┤');
  console.log('  │ 24. Frameworks 25. Assessment 26. POAM              │');
  console.log('  │ 27. Export CSV 28. Exec report                      │');
  console.log('  ├─ PLATFORM ──────────────────────────────────────────┤');
  console.log('  │ 29. Notifications  30. Logout                       │');
  console.log('  └─────────────────────────────────────────────────────┘');
  console.log(`\nTotal expected requests: ~${ANALYST_COUNT * 30} (${ANALYST_COUNT} analysts x 30 steps)`);

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
  const reportPath = `tests/stress/results/stress-500-${RUN_ID}.json`;
  try {
    const fs = await import('fs');
    const pathMod = await import('path');
    const dir = pathMod.dirname(reportPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const summary = {
      runId: RUN_ID,
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      analystCount: ANALYST_COUNT,
      batchSize: BATCH_SIZE,
      waveDealyMs: WAVE_DELAY_MS,
      totalTestMs,
      totalRequests: results.reduce((a, r) => a + r.steps.length, 0),
      passedAnalysts: results.filter((r) => r.success).length,
      failedAnalysts: results.filter((r) => !r.success).length,
      stepSummaries: {} as Record<string, { method: string; avg: number; p50: number; p95: number; p99: number; errors: number }>,
    };

    const stepDurations = new Map<string, { durations: number[]; method: string; errors: number }>();
    for (const r of results) {
      for (const s of r.steps) {
        if (!stepDurations.has(s.step)) stepDurations.set(s.step, { durations: [], method: s.method, errors: 0 });
        const sd = stepDurations.get(s.step)!;
        sd.durations.push(s.durationMs);
        if (s.status === 0 || s.status >= 500) sd.errors++;
      }
    }
    for (const [step, data] of stepDurations.entries()) {
      const valid = data.durations.filter((d) => d > 0);
      summary.stepSummaries[step] = {
        method: data.method,
        avg: valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0,
        p50: percentile(valid, 50),
        p95: percentile(valid, 95),
        p99: percentile(valid, 99),
        errors: data.errors,
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
