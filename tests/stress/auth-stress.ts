/**
 * CVERiskPilot Auth Stress Test
 *
 * Tests signup, login, rate limiting, and invalid input flows
 * against the running dev server.
 *
 * Usage:
 *   npx tsx tests/stress/auth-stress.ts [BASE_URL]
 *
 * Defaults to http://localhost:3000
 */

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const SIGNUP_URL = `${BASE_URL}/api/auth/signup`;
const LOGIN_URL = `${BASE_URL}/api/auth/login`;

const VALID_PASSWORD = 'StressTest1!xx';
const SIGNUP_CONCURRENCY = 20;
const LOGIN_CONCURRENCY = 10;
const RATE_LIMIT_ATTEMPTS = 10;

const RUN_ID = Date.now();

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TimedResult {
  status: number;
  body: Record<string, unknown>;
  durationMs: number;
  error?: string;
}

async function timedFetch(
  url: string,
  opts: RequestInit,
): Promise<TimedResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, opts);
    const durationMs = Math.round(performance.now() - start);
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // non-JSON response
    }
    return { status: res.status, body, durationMs };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return { status: 0, body: {}, durationMs, error: message };
  }
}

function jsonPost(url: string, data: unknown): Promise<TimedResult> {
  return timedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

// ─── Result Tracking ─────────────────────────────────────────────────────────

interface TestSummary {
  name: string;
  total: number;
  successes: number;
  failures: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  unexpectedErrors: string[];
}

function summarize(
  name: string,
  results: TimedResult[],
  isSuccess: (r: TimedResult) => boolean,
): TestSummary {
  const durations = results.map((r) => r.durationMs);
  const successes = results.filter(isSuccess).length;
  const unexpectedErrors = results
    .filter((r) => r.error)
    .map((r) => r.error!);

  return {
    name,
    total: results.length,
    successes,
    failures: results.length - successes,
    avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    unexpectedErrors,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function testSignupStress(): Promise<TestSummary> {
  console.log(`\n[1/4] Signup stress test — ${SIGNUP_CONCURRENCY} concurrent requests...`);

  const promises = Array.from({ length: SIGNUP_CONCURRENCY }, (_, i) =>
    jsonPost(SIGNUP_URL, {
      name: `Stress User ${i + 1}`,
      email: `user${i + 1}_${RUN_ID}@stresstest.com`,
      password: VALID_PASSWORD,
      orgName: `StressOrg-${i + 1}-${RUN_ID}`,
    }),
  );

  const results = await Promise.all(promises);

  // Log status distribution
  const statusCounts: Record<number, number> = {};
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }
  console.log('  Status distribution:', statusCounts);

  return summarize('Signup (concurrent)', results, (r) => r.status === 201);
}

async function testLoginStress(): Promise<TestSummary> {
  console.log(`\n[2/4] Login stress test — ${LOGIN_CONCURRENCY} concurrent requests...`);

  const promises = Array.from({ length: LOGIN_CONCURRENCY }, (_, i) =>
    jsonPost(LOGIN_URL, {
      email: `user${i + 1}_${RUN_ID}@stresstest.com`,
      password: VALID_PASSWORD,
    }),
  );

  const results = await Promise.all(promises);

  const statusCounts: Record<number, number> = {};
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }
  console.log('  Status distribution:', statusCounts);

  return summarize('Login (concurrent)', results, (r) => r.status === 200);
}

async function testRateLimit(): Promise<TestSummary> {
  console.log(`\n[3/4] Rate limit test — ${RATE_LIMIT_ATTEMPTS} rapid login attempts (wrong password)...`);

  const targetEmail = `user1_${RUN_ID}@stresstest.com`;
  const results: TimedResult[] = [];

  // Send sequentially to reliably trigger rate limiter
  for (let i = 0; i < RATE_LIMIT_ATTEMPTS; i++) {
    const r = await jsonPost(LOGIN_URL, {
      email: targetEmail,
      password: 'WrongPassword1!xx',
    });
    results.push(r);
  }

  const statusCounts: Record<number, number> = {};
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }
  console.log('  Status distribution:', statusCounts);

  const got429 = results.some((r) => r.status === 429);
  if (got429) {
    console.log('  Rate limiting triggered (429 received).');
  } else {
    console.log('  WARNING: No 429 received. Rate limiter may not be active (Redis unavailable?).');
  }

  // Success = either 401 (wrong creds) or 429 (rate limited) — both are expected
  return summarize('Rate limit', results, (r) => r.status === 401 || r.status === 429);
}

async function testInvalidInputs(): Promise<TestSummary> {
  console.log('\n[4/4] Invalid input test...');

  const cases: Array<{
    label: string;
    url: string;
    body: unknown;
    expectedStatus: number;
  }> = [
    {
      label: 'signup: missing fields',
      url: SIGNUP_URL,
      body: { email: 'partial@test.com' },
      expectedStatus: 400,
    },
    {
      label: 'signup: weak password',
      url: SIGNUP_URL,
      body: {
        name: 'Weak',
        email: `weakpw_${RUN_ID}@stresstest.com`,
        password: 'short',
        orgName: 'WeakOrg',
      },
      expectedStatus: 400,
    },
    {
      label: 'signup: invalid email format',
      url: SIGNUP_URL,
      body: {
        name: 'BadEmail',
        email: 'not-an-email',
        password: VALID_PASSWORD,
        orgName: 'BadEmailOrg',
      },
      expectedStatus: 400,
    },
    {
      label: 'login: non-existent email',
      url: LOGIN_URL,
      body: {
        email: `nonexistent_${RUN_ID}@stresstest.com`,
        password: VALID_PASSWORD,
      },
      expectedStatus: 401,
    },
    {
      label: 'login: missing password',
      url: LOGIN_URL,
      body: { email: 'test@test.com' },
      expectedStatus: 400,
    },
  ];

  const results: TimedResult[] = [];
  const expectedStatuses: number[] = [];

  for (const c of cases) {
    const r = await jsonPost(c.url, c.body);
    results.push(r);
    expectedStatuses.push(c.expectedStatus);
    const pass = r.status === c.expectedStatus;
    const mark = pass ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${c.label} — expected ${c.expectedStatus}, got ${r.status}`);
  }

  const durations = results.map((r) => r.durationMs);
  let successes = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === expectedStatuses[i]) successes++;
  }

  return {
    name: 'Invalid inputs',
    total: results.length,
    successes,
    failures: results.length - successes,
    avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    unexpectedErrors: results.filter((r) => r.error).map((r) => r.error!),
  };
}

// ─── Report ──────────────────────────────────────────────────────────────────

function printReport(summaries: TestSummary[]) {
  console.log('\n' + '='.repeat(90));
  console.log('  AUTH STRESS TEST REPORT');
  console.log('='.repeat(90));

  const header = [
    'Test'.padEnd(25),
    'Total'.padStart(6),
    'Pass'.padStart(6),
    'Fail'.padStart(6),
    'Avg(ms)'.padStart(9),
    'Min(ms)'.padStart(9),
    'Max(ms)'.padStart(9),
  ].join(' | ');

  console.log(header);
  console.log('-'.repeat(90));

  for (const s of summaries) {
    const row = [
      s.name.padEnd(25),
      String(s.total).padStart(6),
      String(s.successes).padStart(6),
      String(s.failures).padStart(6),
      String(s.avgMs).padStart(9),
      String(s.minMs).padStart(9),
      String(s.maxMs).padStart(9),
    ].join(' | ');
    console.log(row);
  }

  console.log('-'.repeat(90));

  // Print unexpected errors
  const allErrors = summaries.flatMap((s) =>
    s.unexpectedErrors.map((e) => `  [${s.name}] ${e}`),
  );
  if (allErrors.length > 0) {
    console.log('\nUnexpected connection errors:');
    for (const e of allErrors) console.log(e);
  }

  // Overall result
  const totalFail = summaries.reduce((a, s) => a + s.failures, 0);
  const totalPass = summaries.reduce((a, s) => a + s.successes, 0);
  console.log(`\nTotal: ${totalPass} passed, ${totalFail} failed out of ${totalPass + totalFail} requests.`);
  console.log('='.repeat(90));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`CVERiskPilot Auth Stress Test`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Run ID:   ${RUN_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Quick connectivity check
  try {
    const check = await fetch(BASE_URL, { method: 'GET' });
    console.log(`Server reachable (status ${check.status}).`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nERROR: Cannot reach server at ${BASE_URL}`);
    console.error(`  ${msg}`);
    console.error('\nPlease start the dev server and try again.');
    process.exit(1);
  }

  const summaries: TestSummary[] = [];

  // 1. Signup stress
  summaries.push(await testSignupStress());

  // 2. Login stress (uses accounts created above)
  summaries.push(await testLoginStress());

  // 3. Rate limit test
  summaries.push(await testRateLimit());

  // 4. Invalid input test
  summaries.push(await testInvalidInputs());

  // Report
  printReport(summaries);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
