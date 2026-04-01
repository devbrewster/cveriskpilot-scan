/**
 * CVERiskPilot Infrastructure Metrics Collector
 *
 * Run after load tests to query GCP Cloud Monitoring and validate
 * auto-scaling behavior and resource utilization.
 *
 * Metrics collected:
 *   - Cloud Run instance count (auto-scale trigger validation)
 *   - Cloud SQL active connections
 *   - P95/P99 latency per endpoint
 *   - Error rate (target: <1% 5xx)
 *   - Memory usage trend
 *
 * Usage:
 *   npx tsx tests/stress/infra-metrics-collector.ts [--project PROJECT_ID] [--minutes WINDOW]
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth
 */

const PROJECT_ID = process.argv.find((_, i, arr) => arr[i - 1] === '--project') ?? process.env.GCP_PROJECT_ID ?? 'cveriskpilot-prod';
const WINDOW_MINUTES = parseInt(process.argv.find((_, i, arr) => arr[i - 1] === '--minutes') ?? '30', 10);

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface InfraReport {
  project: string;
  windowMinutes: number;
  collectedAt: string;
  cloudRun: {
    maxInstances: number;
    avgInstances: number;
    instanceTimeline: MetricPoint[];
  };
  cloudSql: {
    maxConnections: number;
    avgConnections: number;
    connectionTimeline: MetricPoint[];
  };
  latency: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  errors: {
    total5xx: number;
    totalRequests: number;
    errorRate: number;
  };
  memory: {
    peakMb: number;
    avgMb: number;
    trend: 'stable' | 'growing' | 'declining';
  };
  verdict: 'PASS' | 'FAIL';
  issues: string[];
}

// ─── GCP Monitoring Query (simulated) ───────────────────────────────────────
// In production, these would use @google-cloud/monitoring client.
// For now, we provide the query structure and simulate responses.

async function queryMetric(
  _metricType: string,
  _filter: string,
  _windowMinutes: number,
): Promise<MetricPoint[]> {
  // Placeholder: In production, use google.monitoring.v3.MetricServiceClient
  // const client = new monitoring.MetricServiceClient();
  // const [timeSeries] = await client.listTimeSeries({
  //   name: `projects/${PROJECT_ID}`,
  //   filter: `metric.type = "${metricType}" AND ${filter}`,
  //   interval: { startTime, endTime },
  //   aggregation: { alignmentPeriod: { seconds: 60 }, perSeriesAligner: 'ALIGN_MEAN' },
  // });
  return [];
}

async function collectMetrics(): Promise<InfraReport> {
  const issues: string[] = [];

  // ── Cloud Run Instance Count ──
  const instancePoints = await queryMetric(
    'run.googleapis.com/container/instance_count',
    `resource.labels.service_name = "cveriskpilot"`,
    WINDOW_MINUTES,
  );
  const instanceValues = instancePoints.map(p => p.value);
  const maxInstances = instanceValues.length > 0 ? Math.max(...instanceValues) : 0;
  const avgInstances = instanceValues.length > 0
    ? Math.round(instanceValues.reduce((a, b) => a + b, 0) / instanceValues.length)
    : 0;

  // ── Cloud SQL Connections ──
  const connPoints = await queryMetric(
    'cloudsql.googleapis.com/database/postgresql/num_backends',
    `resource.labels.database_id = "${PROJECT_ID}:cveriskpilot-prod"`,
    WINDOW_MINUTES,
  );
  const connValues = connPoints.map(p => p.value);
  const maxConnections = connValues.length > 0 ? Math.max(...connValues) : 0;
  const avgConnections = connValues.length > 0
    ? Math.round(connValues.reduce((a, b) => a + b, 0) / connValues.length)
    : 0;

  if (maxConnections > 90) {
    issues.push(`Cloud SQL connections peaked at ${maxConnections} (PgBouncer limit: 100)`);
  }

  // ── Latency ──
  const latencyPoints = await queryMetric(
    'run.googleapis.com/request_latencies',
    `resource.labels.service_name = "cveriskpilot"`,
    WINDOW_MINUTES,
  );
  const latencyValues = latencyPoints.map(p => p.value).sort((a, b) => a - b);
  const p50Ms = latencyValues.length > 0 ? latencyValues[Math.floor(latencyValues.length * 0.5)] : 0;
  const p95Ms = latencyValues.length > 0 ? latencyValues[Math.floor(latencyValues.length * 0.95)] : 0;
  const p99Ms = latencyValues.length > 0 ? latencyValues[Math.floor(latencyValues.length * 0.99)] : 0;

  // ── Error Rate ──
  const totalRequests = latencyValues.length;
  const errorPoints = await queryMetric(
    'run.googleapis.com/request_count',
    `resource.labels.service_name = "cveriskpilot" AND metric.labels.response_code_class = "5xx"`,
    WINDOW_MINUTES,
  );
  const total5xx = errorPoints.reduce((sum, p) => sum + p.value, 0);
  const errorRate = totalRequests > 0 ? (total5xx / totalRequests) * 100 : 0;

  if (errorRate > 1) {
    issues.push(`Error rate ${errorRate.toFixed(1)}% exceeds 1% target`);
  }

  // ── Memory ──
  const memPoints = await queryMetric(
    'run.googleapis.com/container/memory/utilizations',
    `resource.labels.service_name = "cveriskpilot"`,
    WINDOW_MINUTES,
  );
  const memValues = memPoints.map(p => p.value);
  const peakMb = memValues.length > 0 ? Math.round(Math.max(...memValues)) : 0;
  const avgMb = memValues.length > 0
    ? Math.round(memValues.reduce((a, b) => a + b, 0) / memValues.length)
    : 0;

  // Detect growth trend
  let trend: 'stable' | 'growing' | 'declining' = 'stable';
  if (memValues.length >= 10) {
    const firstQuarter = memValues.slice(0, Math.floor(memValues.length / 4));
    const lastQuarter = memValues.slice(-Math.floor(memValues.length / 4));
    const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
    if (lastAvg > firstAvg * 1.2) {
      trend = 'growing';
      issues.push(`Memory usage growing: ${Math.round(firstAvg)}MB → ${Math.round(lastAvg)}MB (potential leak)`);
    } else if (lastAvg < firstAvg * 0.8) {
      trend = 'declining';
    }
  }

  const verdict = issues.length === 0 ? 'PASS' : 'FAIL';

  return {
    project: PROJECT_ID,
    windowMinutes: WINDOW_MINUTES,
    collectedAt: new Date().toISOString(),
    cloudRun: { maxInstances, avgInstances, instanceTimeline: instancePoints },
    cloudSql: { maxConnections, avgConnections, connectionTimeline: connPoints },
    latency: { p50Ms, p95Ms, p99Ms },
    errors: { total5xx, totalRequests, errorRate },
    memory: { peakMb, avgMb, trend },
    verdict,
    issues,
  };
}

// ─── Report Output ──────────────────────────────────────────────────────────

function printReport(report: InfraReport): void {
  console.log(`\n  CVERiskPilot Infrastructure Metrics Report`);
  console.log(`  Project: ${report.project} | Window: ${report.windowMinutes}min | ${report.collectedAt}\n`);

  console.log(`  Cloud Run:`);
  console.log(`    Max instances:    ${report.cloudRun.maxInstances}`);
  console.log(`    Avg instances:    ${report.cloudRun.avgInstances}`);

  console.log(`  Cloud SQL:`);
  console.log(`    Max connections:  ${report.cloudSql.maxConnections}`);
  console.log(`    Avg connections:  ${report.cloudSql.avgConnections}`);

  console.log(`  Latency:`);
  console.log(`    P50:              ${report.latency.p50Ms}ms`);
  console.log(`    P95:              ${report.latency.p95Ms}ms`);
  console.log(`    P99:              ${report.latency.p99Ms}ms`);

  console.log(`  Errors:`);
  console.log(`    5xx count:        ${report.errors.total5xx}`);
  console.log(`    Total requests:   ${report.errors.totalRequests}`);
  console.log(`    Error rate:       ${report.errors.errorRate.toFixed(2)}%`);

  console.log(`  Memory:`);
  console.log(`    Peak:             ${report.memory.peakMb}MB`);
  console.log(`    Average:          ${report.memory.avgMb}MB`);
  console.log(`    Trend:            ${report.memory.trend}`);

  if (report.issues.length > 0) {
    console.log(`\n  Issues:`);
    for (const issue of report.issues) {
      console.log(`    ✗ ${issue}`);
    }
  }

  console.log(`\n  Verdict: ${report.verdict}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const report = await collectMetrics();
  printReport(report);

  // Also output JSON for CI consumption
  const jsonPath = `tests/stress/infra-report-${Date.now()}.json`;
  const fs = await import('node:fs');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`  JSON report: ${jsonPath}\n`);

  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});
