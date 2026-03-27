'use client';

import { useClientContext } from '@/lib/client-context';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { SeverityChart } from '@/components/dashboard/severity-chart';
import { KevWidget } from '@/components/dashboard/kev-widget';
import { EpssTop10 } from '@/components/dashboard/epss-top10';
import { RecentScans } from '@/components/dashboard/recent-scans';
import {
  mockCases,
  mockUploadJobs,
  mockStats,
  getSeverityCounts,
} from '@/lib/mock-data';

export default function DashboardPage() {
  const { activeClientId, activeClientName } = useClientContext();

  const severityCounts = getSeverityCounts(mockCases);

  // Find nearest KEV due date among active KEV cases
  const kevCases = mockCases.filter(
    (c) =>
      c.kevListed &&
      c.kevDueDate &&
      !['VERIFIED_CLOSED', 'FALSE_POSITIVE', 'NOT_APPLICABLE', 'DUPLICATE'].includes(c.status)
  );
  const nearestKevDueDate: string | null = kevCases.length > 0
    ? kevCases
        .map((c) => c.kevDueDate!)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* Client scope indicator */}
      {activeClientId && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          <span className="text-sm font-medium text-blue-800">
            Viewing data for: {activeClientName || 'Selected Client'}
          </span>
          <span className="text-xs text-blue-600">
            (Switch clients using the sidebar dropdown)
          </span>
        </div>
      )}

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cases"
          value={mockStats.totalCases}
          trend={mockStats.totalCasesTrend}
          trendLabel="vs last month"
        />
        <StatCard
          label="Critical / High"
          value={mockStats.criticalHighCases}
          trend={mockStats.criticalHighTrend}
          trendLabel="vs last month"
          accent="text-red-700"
        />
        <StatCard
          label="KEV-Listed"
          value={mockStats.kevListedCount}
          trend={mockStats.kevTrend}
          trendLabel="vs last month"
          accent={mockStats.kevListedCount > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard
          label="Avg EPSS Score"
          value={`${(mockStats.avgEpssScore * 100).toFixed(1)}%`}
          trend={mockStats.epssTrend}
          trendLabel="vs last month"
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
            <EpssTop10 cases={mockCases} />
          </Card>
        </div>
        <div>
          <KevWidget
            kevCount={mockStats.kevListedCount}
            nearestDueDate={nearestKevDueDate}
          />
        </div>
      </div>

      {/* Row 4: Recent Scans */}
      <Card title="Recent Scans" description="Latest upload jobs and their processing status">
        <RecentScans jobs={mockUploadJobs} />
      </Card>
    </div>
  );
}
