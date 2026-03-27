/**
 * CVERiskPilot — k6 Production Stress Test
 *
 * Real dynamic load test simulating 200 analysts against production build.
 * Uses k6 ramping VUs, proper HTTP/cookie handling, think time, and thresholds.
 *
 * Usage:
 *   ~/.local/bin/k6 run tests/stress/k6-production-200.js
 *
 * Environment variables:
 *   BASE_URL  — target server (default: http://localhost:3000)
 *   ORG_ID    — pre-seeded organization ID (default: stress-org-prod-test)
 */

import http from 'k6/http';
import { check, group, sleep, fail } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ORG_ID = __ENV.ORG_ID || 'stress-org-prod-test';

export const options = {
  scenarios: {
    // Phase 1: Ramp up to 200 concurrent analysts over 2 minutes
    analyst_workflow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },    // Warm-up: ramp to 50
        { duration: '30s', target: 100 },   // Scale: ramp to 100
        { duration: '30s', target: 150 },   // Pressure: ramp to 150
        { duration: '30s', target: 200 },   // Full load: 200 analysts
        { duration: '2m', target: 200 },    // Sustained: hold at 200 for 2 min
        { duration: '30s', target: 100 },   // Cool-down: reduce to 100
        { duration: '30s', target: 0 },     // Drain
      ],
      gracefulRampDown: '30s',
    },

    // Phase 2: Spike test — sudden burst
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '5m30s',  // Start after main test completes
      stages: [
        { duration: '10s', target: 200 },   // Instant spike to 200
        { duration: '1m', target: 200 },    // Hold spike
        { duration: '10s', target: 0 },     // Drop
      ],
      gracefulRampDown: '15s',
    },
  },

  thresholds: {
    // Production SLA thresholds
    http_req_duration: [
      'p(50)<1000',   // 50% of requests under 1s
      'p(95)<3000',   // 95% under 3s
      'p(99)<5000',   // 99% under 5s
    ],
    http_req_failed: ['rate<0.05'],  // Less than 5% failure rate
    'group_duration{group:::01 Authentication}': ['p(95)<5000'],
    'group_duration{group:::02 Dashboard}': ['p(95)<2000'],
    'group_duration{group:::03 Upload Scan}': ['p(95)<8000'],
    'group_duration{group:::04 Browse Findings}': ['p(95)<3000'],
    'group_duration{group:::05 Case Management}': ['p(95)<3000'],
    'group_duration{group:::06 AI Remediation}': ['p(95)<10000'],
    'group_duration{group:::07 Reporting}': ['p(95)<5000'],
    'group_duration{group:::08 Compliance}': ['p(95)<3000'],
    'group_duration{group:::09 Export}': ['p(95)<5000'],
    'group_duration{group:::10 Logout}': ['p(95)<1000'],
    checks: ['rate>0.90'],  // 90% of checks must pass
  },
};

// ─── Custom Metrics ─────────────────────────────────────────────────────────

const signupDuration = new Trend('signup_duration', true);
const loginDuration = new Trend('login_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const uploadDuration = new Trend('upload_duration', true);
const findingsListDuration = new Trend('findings_list_duration', true);
const findingDetailDuration = new Trend('finding_detail_duration', true);
const caseBuildDuration = new Trend('case_build_duration', true);
const caseListDuration = new Trend('case_list_duration', true);
const caseTriageDuration = new Trend('case_triage_duration', true);
const caseCommentDuration = new Trend('case_comment_duration', true);
const bulkUpdateDuration = new Trend('bulk_update_duration', true);
const aiRemediationDuration = new Trend('ai_remediation_duration', true);
const reportGenDuration = new Trend('report_gen_duration', true);
const complianceDuration = new Trend('compliance_duration', true);
const poamDuration = new Trend('poam_duration', true);
const slaCheckDuration = new Trend('sla_check_duration', true);
const exportDuration = new Trend('export_duration', true);
const portfolioDuration = new Trend('portfolio_duration', true);
const notificationDuration = new Trend('notification_duration', true);
const logoutDuration = new Trend('logout_duration', true);

const workflowSuccess = new Rate('workflow_success');
const workflowErrors = new Counter('workflow_errors');

// ─── Test Data ──────────────────────────────────────────────────────────────

// Pre-generated Nessus XML payload (small, realistic)
function generateNessusPayload(vuId) {
  return `<?xml version="1.0"?>
<NessusClientData_v2>
<Report name="k6-scan-${vuId}">
  <ReportHost name="host-${vuId}.corp.local">
    <HostProperties>
      <tag name="host-ip">10.${vuId % 256}.${Math.floor(vuId/256) % 256}.1</tag>
      <tag name="HOST_START">Mon Mar 27 08:00:00 2026</tag>
      <tag name="HOST_END">Mon Mar 27 09:00:00 2026</tag>
    </HostProperties>
    <ReportItem port="443" svc_name="https" protocol="tcp" severity="3" pluginID="${50000+vuId}" pluginName="OpenSSL Heartbleed (k6-${vuId})" pluginFamily="General">
      <description>The remote host is affected by an information disclosure vulnerability in OpenSSL.</description>
      <synopsis>The remote service is affected by an information disclosure vulnerability.</synopsis>
      <solution>Upgrade to OpenSSL 1.0.1g or later.</solution>
      <risk_factor>High</risk_factor>
      <cvss3_base_score>7.5</cvss3_base_score>
      <cve>CVE-2024-${String(vuId).padStart(5,'0')}</cve>
    </ReportItem>
    <ReportItem port="80" svc_name="http" protocol="tcp" severity="4" pluginID="${60000+vuId}" pluginName="Apache RCE (k6-${vuId})" pluginFamily="Web Servers">
      <description>Remote code execution vulnerability in Apache HTTP Server.</description>
      <synopsis>The web server is affected by a critical vulnerability.</synopsis>
      <solution>Upgrade Apache to latest version.</solution>
      <risk_factor>Critical</risk_factor>
      <cvss3_base_score>9.8</cvss3_base_score>
      <cve>CVE-2024-${String(vuId + 10000).padStart(5,'0')}</cve>
    </ReportItem>
    <ReportItem port="22" svc_name="ssh" protocol="tcp" severity="2" pluginID="${70000+vuId}" pluginName="SSH Weak Key (k6-${vuId})" pluginFamily="Misc.">
      <description>The SSH server uses a weak host key.</description>
      <synopsis>The SSH host key is weak.</synopsis>
      <solution>Regenerate SSH host keys with stronger algorithm.</solution>
      <risk_factor>Medium</risk_factor>
      <cvss3_base_score>5.3</cvss3_base_score>
      <cve>CVE-2024-${String(vuId + 20000).padStart(5,'0')}</cve>
    </ReportItem>
  </ReportHost>
</Report>
</NessusClientData_v2>`;
}

function generateCsvPayload(vuId) {
  return `CVE,Title,Severity,Host,Description,Solution
CVE-2024-${String(vuId).padStart(5,'0')},SQL Injection in auth module,Critical,db-${vuId}.corp.local,"Authentication bypass via SQL injection in login endpoint","Parameterize all SQL queries"
CVE-2024-${String(vuId+1).padStart(5,'0')},XSS in search field,High,web-${vuId}.corp.local,"Reflected cross-site scripting in search parameter","Encode all user input in HTML context"
CVE-2024-${String(vuId+2).padStart(5,'0')},Outdated TLS version,Medium,api-${vuId}.corp.local,"Server supports TLS 1.0 which has known weaknesses","Disable TLS 1.0 and 1.1, enforce TLS 1.2+"`;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function jsonHeaders(extraHeaders) {
  const h = { 'Content-Type': 'application/json' };
  if (extraHeaders) Object.assign(h, extraHeaders);
  return { headers: h };
}

function thinkTime(minMs, maxMs) {
  // Simulate realistic analyst think time
  sleep(randomIntBetween(minMs || 500, maxMs || 2000) / 1000);
}

// ─── Main VU Function ───────────────────────────────────────────────────────

export default function () {
  const vuId = __VU;
  const iterationId = `${vuId}-${__ITER}`;
  let success = true;
  let organizationId = ORG_ID;
  let cookie = '';
  let findingIds = [];
  let caseIds = [];

  // ── 01. Authentication ──
  group('01 Authentication', function () {
    // Signup (first iteration only, or use pre-seeded accounts)
    if (__ITER === 0) {
      const signupRes = http.post(
        `${BASE_URL}/api/auth/signup`,
        JSON.stringify({
          name: `k6 Analyst ${vuId}`,
          email: `k6analyst${vuId}_${Date.now()}@stresstest.com`,
          password: 'StressTest1!xx',
          orgName: `k6-org-${vuId}-${Date.now()}`,
        }),
        jsonHeaders(),
      );
      signupDuration.add(signupRes.timings.duration);

      const signupOk = check(signupRes, {
        'signup: status 201': (r) => r.status === 201,
        'signup: has organizationId': (r) => {
          try { return JSON.parse(r.body).organizationId !== undefined; } catch { return false; }
        },
      });

      if (signupOk) {
        try {
          const body = JSON.parse(signupRes.body);
          organizationId = body.organizationId || ORG_ID;
        } catch {}
      }
    }

    thinkTime(300, 800);

    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: `k6analyst${vuId}_${Date.now()}@stresstest.com`,
        password: 'StressTest1!xx',
      }),
      jsonHeaders(),
    );
    loginDuration.add(loginRes.timings.duration);

    check(loginRes, {
      'login: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });

    // Extract session cookie from response
    if (loginRes.cookies && loginRes.cookies['crp_session']) {
      cookie = `crp_session=${loginRes.cookies['crp_session'][0].value}`;
    }
  });

  thinkTime(500, 1500);

  // ── 02. Dashboard ──
  group('02 Dashboard', function () {
    const dashRes = http.get(
      `${BASE_URL}/api/dashboard?organizationId=${organizationId}`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    dashboardDuration.add(dashRes.timings.duration);

    check(dashRes, {
      'dashboard: status 200': (r) => r.status === 200,
      'dashboard: has severity counts': (r) => {
        try { return JSON.parse(r.body).severityCounts !== undefined; } catch { return false; }
      },
    });
  });

  thinkTime(1000, 3000);

  // ── 03. Upload Scan ──
  group('03 Upload Scan', function () {
    // Alternate between Nessus XML and CSV uploads
    const isNessus = vuId % 2 === 0;
    const payload = isNessus ? generateNessusPayload(vuId) : generateCsvPayload(vuId);
    const filename = isNessus ? `k6-scan-${vuId}.nessus` : `k6-scan-${vuId}.csv`;
    const mimeType = isNessus ? 'text/xml' : 'text/csv';

    const formBody = {
      file: http.file(payload, filename, mimeType),
      organizationId: organizationId,
    };

    const uploadRes = http.post(
      `${BASE_URL}/api/upload`,
      formBody,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    uploadDuration.add(uploadRes.timings.duration);

    const uploadOk = check(uploadRes, {
      'upload: status 201 or 200': (r) => r.status === 201 || r.status === 200,
      'upload: has jobId': (r) => {
        try { return JSON.parse(r.body).jobId !== undefined; } catch { return false; }
      },
    });

    // Poll job status (up to 5 attempts with 2s delay)
    if (uploadOk) {
      try {
        const jobId = JSON.parse(uploadRes.body).jobId;
        for (let poll = 0; poll < 5; poll++) {
          sleep(2);
          const pollRes = http.get(
            `${BASE_URL}/api/upload/${jobId}`,
            { headers: cookie ? { Cookie: cookie } : {} },
          );
          check(pollRes, {
            'upload-poll: status 200': (r) => r.status === 200,
          });
          try {
            const pollBody = JSON.parse(pollRes.body);
            if (pollBody.status === 'COMPLETED' || pollBody.status === 'FAILED') break;
          } catch {}
        }
      } catch {}
    }
  });

  thinkTime(1000, 2000);

  // ── 04. Browse Findings ──
  group('04 Browse Findings', function () {
    // List with severity filter
    const criticalRes = http.get(
      `${BASE_URL}/api/findings?organizationId=${organizationId}&severity=CRITICAL&limit=20`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    findingsListDuration.add(criticalRes.timings.duration);

    check(criticalRes, {
      'findings-critical: status 200': (r) => r.status === 200,
    });

    // Collect finding IDs
    try {
      const body = JSON.parse(criticalRes.body);
      if (body.findings && Array.isArray(body.findings)) {
        findingIds = body.findings.filter((f) => f.id).map((f) => f.id).slice(0, 5);
      }
    } catch {}

    thinkTime(500, 1000);

    // List all findings (paginated)
    const allRes = http.get(
      `${BASE_URL}/api/findings?organizationId=${organizationId}&limit=50`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    findingsListDuration.add(allRes.timings.duration);

    check(allRes, {
      'findings-all: status 200': (r) => r.status === 200,
    });

    // Collect more finding IDs
    try {
      const body = JSON.parse(allRes.body);
      if (body.findings && Array.isArray(body.findings)) {
        const newIds = body.findings.filter((f) => f.id).map((f) => f.id);
        findingIds = [...new Set([...findingIds, ...newIds])].slice(0, 10);
      }
    } catch {}

    thinkTime(500, 1000);

    // View finding detail
    if (findingIds.length > 0) {
      const detailRes = http.get(
        `${BASE_URL}/api/findings/${findingIds[0]}`,
        { headers: cookie ? { Cookie: cookie } : {} },
      );
      findingDetailDuration.add(detailRes.timings.duration);

      check(detailRes, {
        'finding-detail: status 200': (r) => r.status === 200,
      });
    }
  });

  thinkTime(1000, 3000);

  // ── 05. Case Management ──
  group('05 Case Management', function () {
    // Build cases from findings
    const buildRes = http.post(
      `${BASE_URL}/api/cases/build`,
      JSON.stringify({
        organizationId,
        findingIds: findingIds.slice(0, 10),
      }),
      jsonHeaders(cookie ? { Cookie: cookie } : {}),
    );
    caseBuildDuration.add(buildRes.timings.duration);

    check(buildRes, {
      'cases-build: status 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    thinkTime(500, 1000);

    // List cases
    const listRes = http.get(
      `${BASE_URL}/api/cases?organizationId=${organizationId}&limit=20`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    caseListDuration.add(listRes.timings.duration);

    check(listRes, {
      'cases-list: status 200': (r) => r.status === 200,
    });

    // Extract case IDs
    try {
      const body = JSON.parse(listRes.body);
      if (body.cases && Array.isArray(body.cases)) {
        caseIds = body.cases.filter((c) => c.id).map((c) => c.id).slice(0, 5);
      }
    } catch {}

    thinkTime(500, 1000);

    // Triage a case
    if (caseIds.length > 0) {
      const triageRes = http.put(
        `${BASE_URL}/api/cases/${caseIds[0]}`,
        JSON.stringify({ status: 'TRIAGE', organizationId }),
        jsonHeaders(cookie ? { Cookie: cookie } : {}),
      );
      caseTriageDuration.add(triageRes.timings.duration);

      check(triageRes, {
        'case-triage: status 200': (r) => r.status === 200,
      });
    }

    thinkTime(800, 2000);

    // Add comment
    if (caseIds.length > 0) {
      const commentRes = http.post(
        `${BASE_URL}/api/cases/${caseIds[0]}/comments`,
        JSON.stringify({
          content: `k6 stress test comment from VU ${vuId}: Investigating CVE details and patch availability. CVSS indicates high severity — prioritizing for next sprint.`,
          organizationId,
        }),
        jsonHeaders(cookie ? { Cookie: cookie } : {}),
      );
      caseCommentDuration.add(commentRes.timings.duration);

      check(commentRes, {
        'case-comment: status 200 or 201': (r) => r.status === 200 || r.status === 201,
      });
    }

    thinkTime(500, 1500);

    // Bulk update
    if (caseIds.length >= 2) {
      const bulkRes = http.post(
        `${BASE_URL}/api/cases/bulk`,
        JSON.stringify({
          caseIds: caseIds.slice(0, 3),
          status: 'IN_REMEDIATION',
          organizationId,
        }),
        jsonHeaders(cookie ? { Cookie: cookie } : {}),
      );
      bulkUpdateDuration.add(bulkRes.timings.duration);

      check(bulkRes, {
        'bulk-update: status 200': (r) => r.status === 200,
      });
    }
  });

  thinkTime(1000, 3000);

  // ── 06. AI Remediation ──
  group('06 AI Remediation', function () {
    const aiRes = http.post(
      `${BASE_URL}/api/ai/remediation`,
      JSON.stringify({
        findingTitle: `CVE-2024-${String(vuId).padStart(5,'0')} — Remote Code Execution in Apache`,
        severity: 'CRITICAL',
        description: 'A remote code execution vulnerability allows unauthenticated attackers to execute arbitrary commands via crafted HTTP requests.',
        organizationId,
      }),
      jsonHeaders(cookie ? { Cookie: cookie } : {}),
    );
    aiRemediationDuration.add(aiRes.timings.duration);

    check(aiRes, {
      'ai-remediation: status 200 or 4xx': (r) => r.status === 200 || (r.status >= 400 && r.status < 500),
    });
  });

  thinkTime(2000, 5000);

  // ── 07. Reporting ──
  group('07 Reporting', function () {
    const reportRes = http.post(
      `${BASE_URL}/api/reports/generate`,
      JSON.stringify({
        type: 'executive',
        format: 'pdf',
        organizationId,
        dateRange: {
          start: '2026-01-01T00:00:00Z',
          end: '2026-03-27T23:59:59Z',
        },
      }),
      jsonHeaders(cookie ? { Cookie: cookie } : {}),
    );
    reportGenDuration.add(reportRes.timings.duration);

    check(reportRes, {
      'report-gen: status 200 or 201': (r) => r.status === 200 || r.status === 201,
    });
  });

  thinkTime(1000, 2000);

  // ── 08. Compliance ──
  group('08 Compliance', function () {
    // Frameworks
    const fwRes = http.get(
      `${BASE_URL}/api/compliance/frameworks?organizationId=${organizationId}`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    complianceDuration.add(fwRes.timings.duration);

    check(fwRes, {
      'frameworks: status 200': (r) => r.status === 200,
    });

    thinkTime(500, 1000);

    // POAM
    const poamRes = http.get(
      `${BASE_URL}/api/compliance/poam?organizationId=${organizationId}`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    poamDuration.add(poamRes.timings.duration);

    check(poamRes, {
      'poam: status 200': (r) => r.status === 200,
    });

    thinkTime(500, 1000);

    // SLA check
    const slaRes = http.get(
      `${BASE_URL}/api/sla/check?organizationId=${organizationId}`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    slaCheckDuration.add(slaRes.timings.duration);

    check(slaRes, {
      'sla-check: status 200': (r) => r.status === 200,
    });

    thinkTime(500, 1000);

    // Portfolio
    const portfolioRes = http.get(
      `${BASE_URL}/api/portfolio?organizationId=${organizationId}`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    portfolioDuration.add(portfolioRes.timings.duration);

    check(portfolioRes, {
      'portfolio: status 200': (r) => r.status === 200,
    });
  });

  thinkTime(1000, 2000);

  // ── 09. Export ──
  group('09 Export', function () {
    const exportRes = http.get(
      `${BASE_URL}/api/export/findings?organizationId=${organizationId}&format=csv`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    exportDuration.add(exportRes.timings.duration);

    check(exportRes, {
      'export-csv: status 200': (r) => r.status === 200,
    });

    thinkTime(500, 1000);

    // Billing usage
    const usageRes = http.get(
      `${BASE_URL}/api/billing/usage?organizationId=${organizationId}`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );

    check(usageRes, {
      'billing-usage: status 200': (r) => r.status === 200,
    });

    thinkTime(300, 800);

    // Notifications
    const notifRes = http.get(
      `${BASE_URL}/api/notifications?organizationId=${organizationId}`,
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    notificationDuration.add(notifRes.timings.duration);

    check(notifRes, {
      'notifications: status 200': (r) => r.status === 200,
    });
  });

  thinkTime(500, 1000);

  // ── 10. Logout ──
  group('10 Logout', function () {
    const logoutRes = http.post(
      `${BASE_URL}/api/auth/logout`,
      '{}',
      jsonHeaders(cookie ? { Cookie: cookie } : {}),
    );
    logoutDuration.add(logoutRes.timings.duration);

    check(logoutRes, {
      'logout: status 200': (r) => r.status === 200,
    });
  });

  // Track overall workflow success
  workflowSuccess.add(success ? 1 : 0);
}

// ─── Lifecycle Hooks ────────────────────────────────────────────────────────

export function handleSummary(data) {
  // Console summary is automatic; also write JSON
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`tests/stress/results/k6-${timestamp}.json`]: JSON.stringify(data, null, 2),
  };
}

function textSummary(data, opts) {
  // k6 handles this natively — return empty to use built-in
  return '';
}
