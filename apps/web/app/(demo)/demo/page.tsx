'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { SeverityChart } from '@/components/dashboard/severity-chart';
import { EpssTop10 } from '@/components/dashboard/epss-top10';
import { KevWidget } from '@/components/dashboard/kev-widget';
import { RecentScans } from '@/components/dashboard/recent-scans';
import { ComplianceScores } from '@/components/dashboard/compliance-scores';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import Link from 'next/link';
import {
  demoStats,
  demoCases,
  demoEpssTop10,
  demoRecentScans,
  demoSlaMetrics,
  demoComplianceScores,
  demoTimeline,
} from '@/lib/demo-data';
import type { Severity, UploadJob } from '@/lib/types';
import type { VulnerabilityCase } from '@/lib/mock-data';


// Derive severity counts from demoCases, scaled to 587 total
const severityCounts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
for (const c of demoCases) {
  if (c.severity in severityCounts) {
    severityCounts[c.severity as Severity]++;
  }
}
const caseTotal = Object.values(severityCounts).reduce((s, n) => s + n, 0);
if (caseTotal > 0) {
  const scale = demoStats.totalFindings / caseTotal;
  for (const sev of Object.keys(severityCounts) as Severity[]) {
    severityCounts[sev] = Math.round(severityCounts[sev] * scale);
  }
}

// Computed stats matching the app dashboard
const criticalHighCases = (severityCounts.CRITICAL ?? 0) + (severityCounts.HIGH ?? 0);
const epssScores = demoEpssTop10.map((c) => c.epssScore);
const avgEpssScore = epssScores.length > 0
  ? epssScores.reduce((sum, s) => sum + s, 0) / epssScores.length
  : 0;

// Transform demoRecentScans into UploadJob shape
const recentJobs: UploadJob[] = demoRecentScans.map((scan) => ({
  id: scan.id,
  filename: scan.filename,
  parserFormat: scan.parserFormat,
  status: scan.status,
  totalFindings: scan.totalFindings,
  findingsCreated: scan.findingsCreated,
  casesCreated: scan.casesCreated,
  createdAt: scan.createdAt,
  completedAt: scan.completedAt,
  errorMessage: scan.errorMessage,
}));

// Transform demoEpssTop10 into VulnerabilityCase shape
const epssTop10Cases: VulnerabilityCase[] = demoEpssTop10.map((c) => ({
  id: c.id,
  title: c.title,
  cveIds: [c.cveId],
  severity: c.severity,
  cvssScore: c.cvssScore,
  epssScore: c.epssScore,
  epssPercentile: null,
  kevListed: c.kevListed,
  kevDueDate: null,
  status: c.status,
  findingCount: c.findingCount,
  assignedToId: null,
  assignedTo: null,
  dueAt: null,
  firstSeenAt: c.createdAt,
  lastSeenAt: c.createdAt,
}));

// Nearest KEV due date: 5 days from now
const nearestKevDue = new Date();
nearestKevDue.setDate(nearestKevDue.getDate() + 5);
const nearestKevDueDate = nearestKevDue.toISOString();

// Compliance scores in the shape ComplianceScores component expects
const complianceScoreData = Object.entries(demoComplianceScores).map(([framework, score]) => ({
  framework,
  score,
  controlsTotal: framework === 'SOC2' ? 54 : framework === 'SSDF' ? 42 : 38,
  controlsMet: Math.round((score / 100) * (framework === 'SOC2' ? 54 : framework === 'SSDF' ? 42 : 38)),
}));

// SLA severity colors
const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  HIGH: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  MEDIUM: { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
};

export default function DemoDashboardPage() {
  return (
    <div className="space-y-6" data-testid="demo-dashboard">
      {/* Row 1: Stat cards — 6 cards matching main app */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" data-testid="stat-cards">
        <StatCard
          label="Total Findings"
          value={demoStats.totalFindings}
        />
        <StatCard
          label="Open Cases"
          value={demoStats.openCases}
        />
        <StatCard
          label="Critical / High"
          value={criticalHighCases}
          accent="text-red-700"
        />
        <StatCard
          label="KEV-Listed"
          value={demoStats.kevVulnerabilities}
          accent={demoStats.kevVulnerabilities > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard
          label="Avg EPSS (Top 10)"
          value={`${(avgEpssScore * 100).toFixed(1)}%`}
        />
        <StatCard
          label="MTTR"
          value={`${demoStats.mttr}d`}
        />
      </div>

      {/* Row 2: Severity breakdown */}
      <Card title="Severity Breakdown" description="Distribution of vulnerability cases by severity level">
        <SeverityChart counts={severityCounts} />
      </Card>

      {/* Row 3: EPSS Top-10 + KEV Widget */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="EPSS Top 10" description="Highest exploitation probability scores">
            <EpssTop10 cases={epssTop10Cases} />
          </Card>
        </div>
        <div>
          <KevWidget
            kevCount={demoStats.kevVulnerabilities}
            nearestDueDate={nearestKevDueDate}
          />
        </div>
      </div>

      {/* Row 4: SLA Status + Recent Scans */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Static SLA widget (mirrors SlaWidget component structure) */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6" data-testid="sla-widget">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SLA Status</h3>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-4">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{demoSlaMetrics.breached}</p>
              <p className="text-xs font-medium text-red-600 dark:text-red-400">SLA Breaches</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-4">
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{demoSlaMetrics.approaching}</p>
              <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Approaching</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Breaches by Severity
            </p>
            <div className="space-y-1.5">
              {Object.entries(demoSlaMetrics.breachBySeverity ?? {}).map(([severity, count]) => {
                const colors = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.MEDIUM;
                return (
                  <Link
                    key={severity}
                    href={`/demo/cases?severity=${severity}&slaBreached=true`}
                    className={`flex items-center justify-between rounded-md px-3 py-2 ${colors.bg} hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                      <span className={`text-sm font-medium ${colors.text}`}>{severity}</span>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>{count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Card title="Recent Scans" description="Latest upload jobs and their processing status">
            <RecentScans jobs={recentJobs} />
          </Card>
        </div>
      </div>

      {/* Row 5: Compliance Scores + Activity Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <Card title="Compliance Scores" description="Framework compliance status">
            <ComplianceScores scores={complianceScoreData} />
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Recent Activity" description="Latest events across the platform">
            <ActivityTimeline events={demoTimeline} />
          </Card>
        </div>
      </div>
    </div>
  );
}
