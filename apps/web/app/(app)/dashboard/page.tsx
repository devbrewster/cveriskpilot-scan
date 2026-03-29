'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useClientContext } from '@/lib/client-context';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { SeverityChart } from '@/components/dashboard/severity-chart';
import { KevWidget } from '@/components/dashboard/kev-widget';
import { EpssTop10 } from '@/components/dashboard/epss-top10';
import { RecentScans } from '@/components/dashboard/recent-scans';
import { SlaWidget } from '@/components/dashboard/sla-widget';
import { ComplianceScores } from '@/components/dashboard/compliance-scores';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import type { VulnerabilityCase, UploadJob, Severity } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface DashboardApiResponse {
  severityCounts: Record<string, number>;
  kevCount: number;
  epssTop10: Array<{
    id: string;
    title: string;
    cveIds: string[];
    severity: Severity;
    epssScore: number | null;
    epssPercentile: number | null;
    kevListed: boolean;
    status: string;
  }>;
  recentScans: Array<{
    id: string;
    status: string;
    totalFindings: number;
    findingsCreated: number;
    casesCreated: number;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
    artifact: {
      filename: string;
      parserFormat: string;
    } | null;
  }>;
  totalFindings: number;
  totalCases: number;
  nearestKevDueDate: string | null;
  mttrDays: number | null;
  recentActivity: Array<{
    id: string;
    type: 'scan' | 'case' | 'remediation' | 'alert' | 'kev' | 'policy';
    title: string;
    description?: string;
    timestamp: string;
  }>;
  complianceScores: Array<{
    framework: string;
    score: number;
    controlsTotal: number;
    controlsMet: number;
  }>;
}

export default function DashboardPage() {
  const { organizationId } = useAuth();
  const { activeClientId, activeClientName } = useClientContext();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeClientId) params.set('clientId', activeClientId);

    setLoading(true);
    setError(null);

    fetch(`/api/dashboard?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard data');
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeClientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-red-600">{error || 'Failed to load dashboard data'}</div>
      </div>
    );
  }

  // Build severity counts with all severity levels
  const severityCounts: Record<Severity, number> = {
    CRITICAL: data.severityCounts['CRITICAL'] ?? 0,
    HIGH: data.severityCounts['HIGH'] ?? 0,
    MEDIUM: data.severityCounts['MEDIUM'] ?? 0,
    LOW: data.severityCounts['LOW'] ?? 0,
    INFO: data.severityCounts['INFO'] ?? 0,
  };

  const criticalHighCases = severityCounts.CRITICAL + severityCounts.HIGH;

  // Compute average EPSS score from top-10 data (best available)
  const epssScores = data.epssTop10.filter((c) => c.epssScore !== null).map((c) => c.epssScore!);
  const avgEpssScore = epssScores.length > 0
    ? epssScores.reduce((sum, s) => sum + s, 0) / epssScores.length
    : 0;

  // Map epssTop10 to VulnerabilityCase shape expected by EpssTop10 component
  const epssTop10Cases: VulnerabilityCase[] = data.epssTop10.map((c) => ({
    id: c.id,
    title: c.title,
    cveIds: c.cveIds,
    severity: c.severity,
    cvssScore: null,
    epssScore: c.epssScore,
    epssPercentile: c.epssPercentile,
    kevListed: c.kevListed,
    kevDueDate: null,
    status: c.status as VulnerabilityCase['status'],
    findingCount: 0,
    assignedToId: null,
    assignedTo: null,
    dueAt: null,
    firstSeenAt: '',
    lastSeenAt: '',
  }));

  // Map recentScans to UploadJob shape expected by RecentScans component
  const recentJobs: UploadJob[] = data.recentScans.map((s) => ({
    id: s.id,
    filename: s.artifact?.filename ?? 'Unknown',
    parserFormat: (s.artifact?.parserFormat ?? 'CSV') as UploadJob['parserFormat'],
    status: s.status as UploadJob['status'],
    totalFindings: s.totalFindings,
    findingsCreated: s.findingsCreated,
    casesCreated: s.casesCreated,
    createdAt: s.createdAt,
    completedAt: s.completedAt,
    errorMessage: s.errorMessage,
  }));

  return (
    <div className="space-y-6">
      {/* Client scope indicator */}
      {activeClientId && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800 dark:bg-blue-950">
          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Viewing data for: {activeClientName || 'Selected Client'}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            (Switch clients using the sidebar dropdown)
          </span>
        </div>
      )}

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Findings"
          value={data.totalFindings}
        />
        <StatCard
          label="Open Cases"
          value={data.totalCases}
        />
        <StatCard
          label="Critical / High"
          value={criticalHighCases}
          accent="text-red-700"
        />
        <StatCard
          label="KEV-Listed"
          value={data.kevCount}
          accent={data.kevCount > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard
          label="Avg EPSS (Top 10)"
          value={`${(avgEpssScore * 100).toFixed(1)}%`}
        />
        <StatCard
          label="MTTR"
          value={data.mttrDays !== null ? `${data.mttrDays}d` : '—'}
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
            kevCount={data.kevCount}
            nearestDueDate={data.nearestKevDueDate}
          />
        </div>
      </div>

      {/* Row 4: SLA Status + Recent Scans */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          {organizationId ? (
            <SlaWidget organizationId={organizationId} />
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-400">SLA data unavailable</div>
            </div>
          )}
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
            <ComplianceScores scores={data.complianceScores} />
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Recent Activity" description="Latest events across the platform">
            <ActivityTimeline events={data.recentActivity} />
          </Card>
        </div>
      </div>
    </div>
  );
}
