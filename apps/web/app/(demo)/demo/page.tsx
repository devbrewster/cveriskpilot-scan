'use client';

import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { SeverityChart } from '@/components/dashboard/severity-chart';
import { EpssTop10 } from '@/components/dashboard/epss-top10';
import { KevWidget } from '@/components/dashboard/kev-widget';
import { RecentScans } from '@/components/dashboard/recent-scans';
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


// Derive severity counts from demoCases
const severityCounts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
for (const c of demoCases) {
  if (c.severity in severityCounts) {
    severityCounts[c.severity as Severity]++;
  }
}
// Scale counts to match the 587 total findings stat
const caseTotal = Object.values(severityCounts).reduce((s, n) => s + n, 0);
if (caseTotal > 0) {
  const scale = demoStats.totalFindings / caseTotal;
  for (const sev of Object.keys(severityCounts) as Severity[]) {
    severityCounts[sev] = Math.round(severityCounts[sev] * scale);
  }
}

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
  firstSeenAt: c.createdAt,
  lastSeenAt: c.createdAt,
}));

// Nearest KEV due date: 5 days from now
const nearestKevDue = new Date();
nearestKevDue.setDate(nearestKevDue.getDate() + 5);
const nearestKevDueDate = nearestKevDue.toISOString();

// Timeline icons by type
const timelineIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  scan: {
    color: 'bg-blue-100 text-blue-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  case: {
    color: 'bg-purple-100 text-purple-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  remediation: {
    color: 'bg-green-100 text-green-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  alert: {
    color: 'bg-red-100 text-red-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  kev: {
    color: 'bg-orange-100 text-orange-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  policy: {
    color: 'bg-indigo-100 text-indigo-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
};

function getTimelineIcon(type: string) {
  return timelineIcons[type] ?? timelineIcons.case;
}

export default function DemoDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enterprise vulnerability overview &mdash; Demo Mode
        </p>
      </div>

      {/* Demo mode banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-2.147 2.146a2.25 2.25 0 01-1.591.659H7.938a2.25 2.25 0 01-1.591-.659L4.2 14.5m15.6 0l.147-.146a2.25 2.25 0 000-3.182l-.31-.31" />
        </svg>
        <span className="text-sm font-medium text-amber-800">
          Demo Mode &mdash; viewing sample data. No real vulnerability data is shown.
        </span>
      </div>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Findings"
          value={demoStats.totalFindings}
          trend={12.3}
          trendLabel="vs last month"
        />
        <StatCard
          label="Open Cases"
          value={demoStats.openCases}
          trend={-5.2}
          trendLabel="vs last month"
        />
        <StatCard
          label="KEV Vulnerabilities"
          value={demoStats.kevVulnerabilities}
          accent="text-red-600"
        />
        <StatCard
          label="Mean Time to Remediate"
          value={`${demoStats.mttr} days`}
          trend={-18.0}
          trendLabel="vs last month"
        />
      </div>

      {/* Row 2: Severity breakdown */}
      <Card title="Severity Breakdown" description="Distribution of vulnerability cases by severity level">
        <SeverityChart counts={severityCounts} />
      </Card>

      {/* Row 3: EPSS Top 10 + KEV Widget */}
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

      {/* Row 4: SLA Compliance + Recent Scans */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Inline SLA widget (static demo version, no API call) */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900">SLA Status</h3>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-700">{demoSlaMetrics.breached}</p>
              <p className="text-xs font-medium text-red-600">SLA Breaches</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-2xl font-bold text-yellow-700">{demoSlaMetrics.approaching}</p>
              <p className="text-xs font-medium text-yellow-600">Approaching</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Breaches by Severity
            </p>
            <div className="space-y-1.5">
              {Object.entries(demoSlaMetrics.breachBySeverity ?? {}).map(([severity, count]) => {
                const colors: Record<string, { bg: string; text: string; dot: string }> = {
                  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
                  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
                  MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
                  LOW: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
                };
                const c = colors[severity] ?? colors.LOW;
                return (
                  <div
                    key={severity}
                    className={`flex items-center justify-between rounded-md px-3 py-2 ${c.bg}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                      <span className={`text-sm font-medium ${c.text}`}>{severity}</span>
                    </div>
                    <span className={`text-sm font-bold ${c.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance scores */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Compliance Scores
            </p>
            <div className="space-y-2">
              {demoComplianceScores.map((item) => (
                <div key={item.framework} className="flex items-center gap-3">
                  <span className="w-16 text-xs font-medium text-gray-700">{item.framework}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.score >= 90
                          ? 'bg-green-500'
                          : item.score >= 70
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-gray-900">
                    {item.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Scans spanning 2 columns */}
        <div className="lg:col-span-2">
          <Card title="Recent Scans" description="Latest upload jobs and their processing status">
            <RecentScans jobs={recentJobs} />
          </Card>
        </div>
      </div>

      {/* Row 5: Timeline / Activity feed */}
      <Card title="Recent Activity" description="Latest events across the platform">
        <div className="space-y-0">
          {demoTimeline.map((entry, idx) => {
            const iconData = getTimelineIcon(entry.type);
            const isLast = idx === demoTimeline.length - 1;
            return (
              <div key={entry.id} className="flex gap-4">
                {/* Vertical connector line + icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${iconData.color}`}
                  >
                    {iconData.icon}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-gray-200" />}
                </div>

                {/* Content */}
                <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
                  <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                  {entry.description && (
                    <p className="mt-0.5 text-sm text-gray-500">{entry.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">{entry.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
