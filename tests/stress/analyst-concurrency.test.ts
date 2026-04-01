/**
 * 50-Analyst Concurrency Stress Test
 *
 * Simulates 50 security analysts using CVERiskPilot simultaneously.
 * Each analyst performs realistic workflows:
 *   - Loading dashboard
 *   - Browsing cases (paginated, filtered)
 *   - Viewing individual case details
 *   - Updating case status (triage workflow)
 *   - Browsing findings
 *   - Checking compliance frameworks
 *   - Viewing evidence records
 *   - Reading notifications
 *   - Marking notifications read
 *   - Viewing audit logs
 *
 * Measures: throughput, p50/p95/p99 latency, error rate, concurrent load.
 *
 * Usage:
 *   npx vitest run tests/stress/analyst-concurrency.test.ts
 *   npx vitest run tests/stress/analyst-concurrency.test.ts --reporter=verbose
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANALYST_COUNT = 50;
const ACTIONS_PER_ANALYST = 20; // each analyst does 20 actions in their session
const ORG_ID = 'org-stress-test';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const CASE_STATUSES = ['NEW', 'TRIAGING', 'REMEDIATION', 'VERIFIED_CLOSED'] as const;
const FRAMEWORKS = ['soc2-type2', 'nist-800-53-r5', 'cmmc-l2', 'hipaa', 'pci-dss', 'gdpr', 'iso-27001', 'fedramp-moderate', 'owasp-asvs', 'nist-ssdf'] as const;

// Synthetic data pools
const CVES = Array.from({ length: 200 }, (_, i) => `CVE-2024-${String(i + 1000).padStart(5, '0')}`);
const CASE_IDS = Array.from({ length: 500 }, (_, i) => `case-${i}`);
const FINDING_IDS = Array.from({ length: 2000 }, (_, i) => `finding-${i}`);
const NOTIFICATION_IDS = Array.from({ length: 100 }, (_, i) => `notif-${i}`);

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Generate synthetic DB records
// ---------------------------------------------------------------------------

function generateCases(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: CASE_IDS[i],
    title: `Vulnerability Case ${i}: ${randomItem(CVES)}`,
    cveIds: [randomItem(CVES)],
    severity: randomItem(SEVERITIES),
    status: randomItem(CASE_STATUSES),
    epssScore: Math.random(),
    epssPercentile: Math.random(),
    kevListed: Math.random() > 0.8,
    kevDueDate: Math.random() > 0.7 ? new Date(Date.now() + randomInt(1, 30) * 86400000) : null,
    organizationId: ORG_ID,
    clientId: null,
    assignedToId: null,
    createdAt: new Date(Date.now() - randomInt(1, 90) * 86400000),
    updatedAt: new Date(),
  }));
}

function generateFindings(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: FINDING_IDS[i],
    title: `Finding ${i}: ${randomItem(CVES)}`,
    severity: randomItem(SEVERITIES),
    status: 'OPEN',
    cveId: randomItem(CVES),
    epssScore: Math.random(),
    kevListed: Math.random() > 0.85,
    organizationId: ORG_ID,
    clientId: null,
    caseId: randomItem(CASE_IDS.slice(0, 500)),
    createdAt: new Date(Date.now() - randomInt(1, 90) * 86400000),
    updatedAt: new Date(),
  }));
}

function generateNotifications(userId: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${userId}-notif-${i}`,
    userId,
    organizationId: ORG_ID,
    type: randomItem(['mention', 'assignment', 'sla_breach']),
    title: `Notification ${i}`,
    isRead: Math.random() > 0.6,
    readAt: null,
    createdAt: new Date(Date.now() - randomInt(0, 14) * 86400000),
  }));
}

function generateEvidenceRecords(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `evidence-${i}`,
    organizationId: ORG_ID,
    frameworkId: randomItem(FRAMEWORKS),
    controlId: `CTRL-${i}`,
    controlTitle: `Control ${i}`,
    title: `Evidence Record ${i}`,
    status: randomItem(['CURRENT', 'STALE', 'MISSING', 'EXPIRED']),
    source: randomItem(['AUTO_ASSESSMENT', 'MANUAL_ENTRY', 'AUTO_SCAN']),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// Pre-generate data
const allCases = generateCases(500);
const allFindings = generateFindings(2000);
const allEvidence = generateEvidenceRecords(300);
const auditLogs = Array.from({ length: 100 }, (_, i) => ({
  id: `audit-${i}`,
  action: randomItem(['CREATE', 'UPDATE', 'TRIAGE', 'UPLOAD']),
  entityType: randomItem(['VulnerabilityCase', 'Finding', 'UploadJob', 'Asset']),
  details: { description: `Action ${i}` },
  organizationId: ORG_ID,
  createdAt: new Date(Date.now() - randomInt(0, 30) * 86400000),
}));

// ---------------------------------------------------------------------------
// Mocks — vi.mock factories are hoisted, so all data must be inline
// ---------------------------------------------------------------------------

vi.mock('@cveriskpilot/auth', () => ({
  requireAuth: vi.fn(async (req: any) => {
    const url = new URL(req.url);
    const analystId = url.searchParams.get('_analystId') || 'analyst-0';
    return {
      userId: analystId,
      organizationId: 'org-stress-test',
      role: 'ANALYST',
      email: `${analystId}@stress.test`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  }),
  requirePerm: vi.fn(() => null),
  checkCsrf: vi.fn(() => null),
}));

vi.mock('@/lib/client-scope', () => ({
  resolveClientScope: vi.fn(async () => ({ where: {}, clientIds: null })),
}));

vi.mock('@/lib/compliance-assessment', () => ({
  buildAssessmentInput: vi.fn(async () => ({
    totalFindings: 500,
    criticalFindings: 50,
    highFindings: 120,
    resolvedFindings: 200,
    totalCases: 300,
    policyCount: 5,
    scanCount: 20,
    lastScanDate: new Date(),
    hasAssetInventory: true,
    hasSbom: true,
    hasSecretScanning: true,
    hasIacScanning: true,
  })),
}));

vi.mock('@/lib/evidence-sync', () => ({
  syncAssessmentEvidence: vi.fn(async () => {}),
}));

vi.mock('@cveriskpilot/db-scale', () => ({
  CursorPaginator: class {
    async paginate(_model: any, opts: any) {
      return {
        items: allCases.slice(0, opts?.take || 25),
        cursor: 'cursor-next',
        hasMore: true,
      };
    }
  },
}));

vi.mock('@/lib/prisma', () => {
  const _SEVS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const _rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    prisma: {
      vulnerabilityCase: {
        findMany: vi.fn(async (args: any) => {
          const take = args?.take ?? 25;
          const skip = args?.skip ?? 0;
          return allCases.slice(skip, skip + take);
        }),
        findFirst: vi.fn(async (args: any) => {
          if (args?.where?.id) return allCases.find((c: any) => c.id === args.where.id) ?? null;
          return allCases[0] ?? null;
        }),
        count: vi.fn(async () => allCases.length),
        groupBy: vi.fn(async () => _SEVS.map(s => ({ severity: s, _count: { id: _rand(20, 100) } }))),
        update: vi.fn(async (args: any) => ({
          ...(allCases.find((c: any) => c.id === args?.where?.id) ?? allCases[0]),
          ...args?.data,
          updatedAt: new Date(),
        })),
      },
      finding: {
        findMany: vi.fn(async (args: any) => {
          const take = args?.take ?? 25;
          const skip = args?.skip ?? 0;
          return allFindings.slice(skip, skip + take);
        }),
        findFirst: vi.fn(async (args: any) => {
          if (args?.where?.id) return allFindings.find((f: any) => f.id === args.where.id) ?? null;
          return allFindings[0];
        }),
        count: vi.fn(async () => allFindings.length),
      },
      notification: {
        findMany: vi.fn(async (args: any) => {
          const userId = args?.where?.userId || 'analyst-0';
          const count = args?.take ?? 20;
          return Array.from({ length: count }, (_, i) => ({
            id: `${userId}-notif-${i}`,
            userId,
            organizationId: 'org-stress-test',
            type: 'mention',
            title: `Notification ${i}`,
            isRead: Math.random() > 0.6,
            readAt: null,
            createdAt: new Date(),
          }));
        }),
        count: vi.fn(async () => _rand(5, 50)),
        updateMany: vi.fn(async () => ({ count: _rand(1, 10) })),
      },
      auditLog: {
        findMany: vi.fn(async (args: any) => auditLogs.slice(0, args?.take ?? 10)),
      },
      uploadJob: {
        findMany: vi.fn(async () => [
          { id: 'uj-1', status: 'COMPLETED', createdAt: new Date(), artifact: { filename: 'scan.nessus', parserFormat: 'NESSUS' } },
          { id: 'uj-2', status: 'COMPLETED', createdAt: new Date(), artifact: { filename: 'report.sarif', parserFormat: 'SARIF' } },
        ]),
      },
      complianceEvidenceRecord: {
        findMany: vi.fn(async (args: any) => {
          const take = args?.take ?? 25;
          const skip = args?.skip ?? 0;
          return allEvidence.slice(skip, skip + take);
        }),
        count: vi.fn(async () => allEvidence.length),
        groupBy: vi.fn(async () => [
          { status: 'CURRENT', _count: 120 },
          { status: 'STALE', _count: 45 },
          { status: 'MISSING', _count: 30 },
          { status: 'EXPIRED', _count: 15 },
        ]),
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------

import { GET as getDashboard } from '../../apps/web/app/api/dashboard/route';
import { GET as getCases } from '../../apps/web/app/api/cases/route';
import { GET as getFindings } from '../../apps/web/app/api/findings/route';
import { GET as getNotifications, PUT as putNotifications } from '../../apps/web/app/api/notifications/route';
import { GET as getEvidence } from '../../apps/web/app/api/compliance/evidence/route';

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

interface ActionResult {
  analystId: string;
  action: string;
  status: number;
  latencyMs: number;
  error?: string;
}

function makeReq(
  url: string,
  analystId: string,
  method = 'GET',
  body?: Record<string, unknown>,
): NextRequest {
  const sep = url.includes('?') ? '&' : '?';
  const fullUrl = `http://localhost:3000${url}${sep}_analystId=${analystId}`;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': 'stress-test',
    },
  };
  if (body) init.body = JSON.stringify(body);
  return new NextRequest(fullUrl, init);
}

async function timedAction(
  analystId: string,
  actionName: string,
  fn: () => Promise<Response>,
): Promise<ActionResult> {
  const start = performance.now();
  try {
    const res = await fn();
    const latencyMs = performance.now() - start;
    return { analystId, action: actionName, status: res.status, latencyMs };
  } catch (err: any) {
    const latencyMs = performance.now() - start;
    return { analystId, action: actionName, status: 500, latencyMs, error: err.message };
  }
}

// Analyst workflow — mimics a realistic analyst session
async function analystWorkflow(analystIndex: number): Promise<ActionResult[]> {
  const analystId = `analyst-${analystIndex}`;
  const results: ActionResult[] = [];

  const actions: (() => Promise<ActionResult>)[] = [
    // Load dashboard (every analyst starts here)
    () => timedAction(analystId, 'GET /dashboard', () =>
      getDashboard(makeReq('/api/dashboard', analystId))),

    // Browse cases page 1
    () => timedAction(analystId, 'GET /cases?page=1', () =>
      getCases(makeReq('/api/cases?page=1&limit=25', analystId))),

    // Browse cases page 2
    () => timedAction(analystId, 'GET /cases?page=2', () =>
      getCases(makeReq('/api/cases?page=2&limit=25', analystId))),

    // Filter critical cases
    () => timedAction(analystId, 'GET /cases?severity=CRITICAL', () =>
      getCases(makeReq('/api/cases?severity=CRITICAL', analystId))),

    // Filter KEV-listed cases
    () => timedAction(analystId, 'GET /cases?kevOnly=true', () =>
      getCases(makeReq('/api/cases?kevOnly=true', analystId))),

    // Search cases
    () => timedAction(analystId, 'GET /cases?search=CVE-2024', () =>
      getCases(makeReq('/api/cases?search=CVE-2024', analystId))),

    // Browse findings page 1
    () => timedAction(analystId, 'GET /findings?page=1', () =>
      getFindings(makeReq('/api/findings?page=1&limit=25', analystId))),

    // Browse findings page 2
    () => timedAction(analystId, 'GET /findings?page=2', () =>
      getFindings(makeReq('/api/findings?page=2&limit=50', analystId))),

    // Filter high severity findings
    () => timedAction(analystId, 'GET /findings?severity=HIGH', () =>
      getFindings(makeReq('/api/findings?severity=HIGH', analystId))),

    // Check notifications
    () => timedAction(analystId, 'GET /notifications', () =>
      getNotifications(makeReq('/api/notifications?page=1', analystId))),

    // Filter unread notifications
    () => timedAction(analystId, 'GET /notifications?unread', () =>
      getNotifications(makeReq('/api/notifications?filter=unread', analystId))),

    // Mark notifications read
    () => timedAction(analystId, 'PUT /notifications', () =>
      putNotifications(makeReq('/api/notifications', analystId, 'PUT', {
        notificationIds: NOTIFICATION_IDS.slice(0, 5),
      }))),

    // Mark all notifications read
    () => timedAction(analystId, 'PUT /notifications (all)', () =>
      putNotifications(makeReq('/api/notifications', analystId, 'PUT', {
        markAllRead: true,
      }))),

    // Evidence list
    () => timedAction(analystId, 'GET /evidence', () =>
      getEvidence(makeReq('/api/compliance/evidence', analystId))),

    // Evidence filtered by framework
    () => timedAction(analystId, 'GET /evidence?framework', () =>
      getEvidence(makeReq(`/api/compliance/evidence?frameworkId=${randomItem(FRAMEWORKS)}`, analystId))),

    // Evidence filtered by status
    () => timedAction(analystId, 'GET /evidence?status=STALE', () =>
      getEvidence(makeReq('/api/compliance/evidence?status=STALE', analystId))),

    // Dashboard reload (analysts refresh frequently)
    () => timedAction(analystId, 'GET /dashboard (refresh)', () =>
      getDashboard(makeReq('/api/dashboard', analystId))),

    // Cases with sort
    () => timedAction(analystId, 'GET /cases?sort=epss', () =>
      getCases(makeReq('/api/cases?sortBy=epssScore&sortOrder=desc', analystId))),

    // Findings with EPSS filter
    () => timedAction(analystId, 'GET /findings?epss>0.5', () =>
      getFindings(makeReq('/api/findings?epssMin=0.5', analystId))),

    // Final dashboard check
    () => timedAction(analystId, 'GET /dashboard (final)', () =>
      getDashboard(makeReq('/api/dashboard?mttrDays=30', analystId))),
  ];

  // Execute actions sequentially (each analyst has their own sequence)
  for (let i = 0; i < ACTIONS_PER_ANALYST && i < actions.length; i++) {
    results.push(await actions[i]());
  }

  return results;
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

interface StressStats {
  totalRequests: number;
  totalDurationMs: number;
  throughputRps: number;
  errorCount: number;
  errorRate: string;
  latency: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  };
  byAction: Record<string, {
    count: number;
    meanMs: number;
    p95Ms: number;
    errors: number;
  }>;
}

function computeStats(results: ActionResult[], wallClockMs: number): StressStats {
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const errors = results.filter(r => r.status >= 400);

  const byAction: StressStats['byAction'] = {};
  for (const r of results) {
    if (!byAction[r.action]) byAction[r.action] = { count: 0, meanMs: 0, p95Ms: 0, errors: 0 };
    byAction[r.action].count++;
    if (r.status >= 400) byAction[r.action].errors++;
  }

  for (const [action, stats] of Object.entries(byAction)) {
    const actionLatencies = results
      .filter(r => r.action === action)
      .map(r => r.latencyMs)
      .sort((a, b) => a - b);
    stats.meanMs = Math.round(actionLatencies.reduce((s, l) => s + l, 0) / actionLatencies.length * 100) / 100;
    stats.p95Ms = Math.round(actionLatencies[Math.floor(actionLatencies.length * 0.95)] * 100) / 100;
  }

  return {
    totalRequests: results.length,
    totalDurationMs: Math.round(wallClockMs),
    throughputRps: Math.round((results.length / (wallClockMs / 1000)) * 100) / 100,
    errorCount: errors.length,
    errorRate: `${((errors.length / results.length) * 100).toFixed(2)}%`,
    latency: {
      min: Math.round(latencies[0] * 100) / 100,
      max: Math.round(latencies[latencies.length - 1] * 100) / 100,
      mean: Math.round((latencies.reduce((s, l) => s + l, 0) / latencies.length) * 100) / 100,
      p50: Math.round(latencies[Math.floor(latencies.length * 0.5)] * 100) / 100,
      p95: Math.round(latencies[Math.floor(latencies.length * 0.95)] * 100) / 100,
      p99: Math.round(latencies[Math.floor(latencies.length * 0.99)] * 100) / 100,
    },
    byAction,
  };
}

function printReport(stats: StressStats): void {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         50-ANALYST CONCURRENCY STRESS TEST REPORT          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Analysts:           ${String(ANALYST_COUNT).padStart(6)}                               ║`);
  console.log(`║  Actions/Analyst:    ${String(ACTIONS_PER_ANALYST).padStart(6)}                               ║`);
  console.log(`║  Total Requests:     ${String(stats.totalRequests).padStart(6)}                               ║`);
  console.log(`║  Wall Clock:       ${String(stats.totalDurationMs + 'ms').padStart(8)}                               ║`);
  console.log(`║  Throughput:       ${String(stats.throughputRps + ' rps').padStart(10)}                             ║`);
  console.log(`║  Errors:           ${String(stats.errorCount).padStart(6)} (${stats.errorRate})                        ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  LATENCY (ms)                                              ║');
  console.log(`║    Min:            ${String(stats.latency.min).padStart(8)}                               ║`);
  console.log(`║    Mean:           ${String(stats.latency.mean).padStart(8)}                               ║`);
  console.log(`║    P50:            ${String(stats.latency.p50).padStart(8)}                               ║`);
  console.log(`║    P95:            ${String(stats.latency.p95).padStart(8)}                               ║`);
  console.log(`║    P99:            ${String(stats.latency.p99).padStart(8)}                               ║`);
  console.log(`║    Max:            ${String(stats.latency.max).padStart(8)}                               ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  PER-ACTION BREAKDOWN                                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const sorted = Object.entries(stats.byAction).sort((a, b) => b[1].p95Ms - a[1].p95Ms);
  for (const [action, s] of sorted) {
    const name = action.padEnd(30).slice(0, 30);
    const err = s.errors > 0 ? ` ERR:${s.errors}` : '';
    console.log(`║  ${name} mean=${String(s.meanMs + 'ms').padStart(8)} p95=${String(s.p95Ms + 'ms').padStart(8)}${err.padEnd(7)} ║`);
  }

  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('50-Analyst Concurrency Stress Test', () => {
  it('handles 50 concurrent analyst workflows (1000 total requests)', async () => {
    const wallStart = performance.now();

    // Launch all 50 analyst workflows concurrently
    const workflowPromises = Array.from(
      { length: ANALYST_COUNT },
      (_, i) => analystWorkflow(i),
    );

    const allResults = await Promise.all(workflowPromises);
    const wallClockMs = performance.now() - wallStart;
    const flatResults = allResults.flat();

    const stats = computeStats(flatResults, wallClockMs);
    printReport(stats);

    // Assertions
    expect(flatResults.length).toBe(ANALYST_COUNT * ACTIONS_PER_ANALYST);
    expect(stats.errorCount).toBe(0);
    expect(stats.errorRate).toBe('0.00%');
  }, 60_000);

  it('sustains burst: 50 analysts all hit dashboard simultaneously', async () => {
    const wallStart = performance.now();

    const promises = Array.from({ length: ANALYST_COUNT }, (_, i) =>
      timedAction(`analyst-${i}`, 'GET /dashboard (burst)', () =>
        getDashboard(makeReq('/api/dashboard', `analyst-${i}`))),
    );

    const results = await Promise.all(promises);
    const wallClockMs = performance.now() - wallStart;
    const stats = computeStats(results, wallClockMs);

    console.log('\n── Dashboard Burst (50 simultaneous) ──');
    console.log(`   Total: ${stats.totalDurationMs}ms | Mean: ${stats.latency.mean}ms | P95: ${stats.latency.p95}ms | P99: ${stats.latency.p99}ms`);

    expect(results.every(r => r.status === 200)).toBe(true);
  }, 30_000);

  it('sustains burst: 50 analysts all browse cases simultaneously', async () => {
    const wallStart = performance.now();

    const promises = Array.from({ length: ANALYST_COUNT }, (_, i) =>
      timedAction(`analyst-${i}`, 'GET /cases (burst)', () =>
        getCases(makeReq(`/api/cases?page=${(i % 5) + 1}&limit=25`, `analyst-${i}`))),
    );

    const results = await Promise.all(promises);
    const wallClockMs = performance.now() - wallStart;
    const stats = computeStats(results, wallClockMs);

    console.log('\n── Cases Burst (50 simultaneous, 5 pages) ──');
    console.log(`   Total: ${stats.totalDurationMs}ms | Mean: ${stats.latency.mean}ms | P95: ${stats.latency.p95}ms | P99: ${stats.latency.p99}ms`);

    expect(results.every(r => r.status === 200)).toBe(true);
  }, 30_000);

  it('sustains burst: 50 analysts all browse findings simultaneously', async () => {
    const wallStart = performance.now();

    const promises = Array.from({ length: ANALYST_COUNT }, (_, i) =>
      timedAction(`analyst-${i}`, 'GET /findings (burst)', () =>
        getFindings(makeReq(`/api/findings?page=${(i % 10) + 1}&limit=50`, `analyst-${i}`))),
    );

    const results = await Promise.all(promises);
    const wallClockMs = performance.now() - wallStart;
    const stats = computeStats(results, wallClockMs);

    console.log('\n── Findings Burst (50 simultaneous, 10 pages) ──');
    console.log(`   Total: ${stats.totalDurationMs}ms | Mean: ${stats.latency.mean}ms | P95: ${stats.latency.p95}ms | P99: ${stats.latency.p99}ms`);

    expect(results.every(r => r.status === 200)).toBe(true);
  }, 30_000);

  it('sustains burst: 50 analysts mark notifications read simultaneously', async () => {
    const wallStart = performance.now();

    const promises = Array.from({ length: ANALYST_COUNT }, (_, i) =>
      timedAction(`analyst-${i}`, 'PUT /notifications (burst)', () =>
        putNotifications(makeReq('/api/notifications', `analyst-${i}`, 'PUT', {
          markAllRead: true,
        }))),
    );

    const results = await Promise.all(promises);
    const wallClockMs = performance.now() - wallStart;
    const stats = computeStats(results, wallClockMs);

    console.log('\n── Notifications Write Burst (50 simultaneous) ──');
    console.log(`   Total: ${stats.totalDurationMs}ms | Mean: ${stats.latency.mean}ms | P95: ${stats.latency.p95}ms | P99: ${stats.latency.p99}ms`);

    expect(results.every(r => r.status === 200)).toBe(true);
  }, 30_000);

  it('mixed read/write burst: 50 analysts doing different things', async () => {
    const wallStart = performance.now();

    const promises = Array.from({ length: ANALYST_COUNT }, (_, i) => {
      const actionType = i % 5;
      const analystId = `analyst-${i}`;

      switch (actionType) {
        case 0: return timedAction(analystId, 'mixed:dashboard', () =>
          getDashboard(makeReq('/api/dashboard', analystId)));
        case 1: return timedAction(analystId, 'mixed:cases', () =>
          getCases(makeReq('/api/cases?severity=CRITICAL', analystId)));
        case 2: return timedAction(analystId, 'mixed:findings', () =>
          getFindings(makeReq('/api/findings?kevOnly=true', analystId)));
        case 3: return timedAction(analystId, 'mixed:notifications', () =>
          putNotifications(makeReq('/api/notifications', analystId, 'PUT', { markAllRead: true })));
        case 4: return timedAction(analystId, 'mixed:evidence', () =>
          getEvidence(makeReq('/api/compliance/evidence?status=STALE', analystId)));
        default: return timedAction(analystId, 'mixed:dashboard', () =>
          getDashboard(makeReq('/api/dashboard', analystId)));
      }
    });

    const results = await Promise.all(promises);
    const wallClockMs = performance.now() - wallStart;
    const stats = computeStats(results, wallClockMs);

    console.log('\n── Mixed Read/Write Burst (50 simultaneous, 5 action types) ──');
    console.log(`   Total: ${stats.totalDurationMs}ms | Mean: ${stats.latency.mean}ms | P95: ${stats.latency.p95}ms | P99: ${stats.latency.p99}ms`);
    for (const [action, s] of Object.entries(stats.byAction)) {
      console.log(`   ${action.padEnd(25)} n=${s.count} mean=${s.meanMs}ms p95=${s.p95Ms}ms`);
    }

    expect(results.every(r => r.status === 200)).toBe(true);
  }, 30_000);
});
