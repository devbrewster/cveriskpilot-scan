'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Table, type ColumnDef } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown } from '@/components/ui/filters';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Verdict = 'pass' | 'fail' | 'warn';
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface PipelineScan {
  scanId: string;
  repository: string;
  branch: string;
  commitSha: string;
  prNumber: number | null;
  verdict: Verdict;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  controlsAffected: number;
  frameworks: string[];
  poamEntriesCreated: number;
  createdAt: string;
}

interface RepoBreakdown {
  name: string;
  lastScan: string;
  scanCount: number;
  passRate: number;
  worstSeverity: Severity | null;
  complianceScore: number;
}

interface PipelineApiResponse {
  scans: PipelineScan[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Verdict badge
// ---------------------------------------------------------------------------

const verdictColors: Record<Verdict, string> = {
  pass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  fail: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${verdictColors[verdict]}`}>
      {verdict.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Derived data helpers
// ---------------------------------------------------------------------------

interface DailyTrend {
  date: string;
  pass: number;
  fail: number;
  total: number;
}

interface TopViolation {
  control: string;
  framework: string;
  title: string;
  count: number;
}

function deriveRepoBreakdown(scans: PipelineScan[]): RepoBreakdown[] {
  const byRepo = new Map<string, PipelineScan[]>();
  for (const s of scans) {
    const arr = byRepo.get(s.repository) ?? [];
    arr.push(s);
    byRepo.set(s.repository, arr);
  }

  return [...byRepo.entries()].map(([name, repoScans]) => {
    const sorted = [...repoScans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const passCount = repoScans.filter((s) => s.verdict === 'pass').length;
    const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    let worstSeverity: Severity | null = null;
    for (const sev of severities) {
      if (repoScans.some((s) => s[sev.toLowerCase() as 'critical' | 'high' | 'medium' | 'low'] > 0)) {
        worstSeverity = sev;
        break;
      }
    }
    return {
      name,
      lastScan: sorted[0].createdAt,
      scanCount: repoScans.length,
      passRate: repoScans.length > 0 ? Math.round((passCount / repoScans.length) * 100) : 0,
      worstSeverity,
      complianceScore: repoScans.length > 0 ? Math.round((passCount / repoScans.length) * 100) : 100,
    };
  });
}

function deriveDailyTrends(scans: PipelineScan[]): DailyTrend[] {
  const byDate = new Map<string, { pass: number; fail: number }>();
  for (const s of scans) {
    const date = s.createdAt.slice(0, 10);
    const entry = byDate.get(date) ?? { pass: 0, fail: 0 };
    if (s.verdict === 'pass') entry.pass++;
    else entry.fail++;
    byDate.set(date, entry);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, { pass, fail }]) => ({ date, pass, fail, total: pass + fail }));
}

function deriveTopViolations(scans: PipelineScan[]): TopViolation[] {
  const controlCounts = new Map<string, { framework: string; title: string; count: number }>();
  for (const s of scans) {
    for (const fw of s.frameworks) {
      const key = `${fw}:${fw}`;
      const entry = controlCounts.get(key) ?? { framework: fw, title: fw, count: 0 };
      entry.count += s.controlsAffected;
      controlCounts.set(key, entry);
    }
  }
  return [...controlCounts.values()]
    .filter((v) => v.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((v) => ({ control: v.framework, framework: v.framework, title: v.title, count: v.count }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const severityBadgeColors: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PipelinesPage() {
  const router = useRouter();
  useAuth();

  const [scans, setScans] = useState<PipelineScan[]>([]);
  const [allScans, setAllScans] = useState<PipelineScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);

  // Filters
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');
  const [frameworkFilter, setFrameworkFilter] = useState('all');

  const fetchScans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (verdictFilter !== 'all') params.set('verdict', verdictFilter);
      if (repoFilter !== 'all') params.set('repo', repoFilter);
      if (frameworkFilter !== 'all') params.set('framework', frameworkFilter);

      const res = await fetch(`/api/pipeline/scans?${params.toString()}`);
      if (res.ok) {
        const json: PipelineApiResponse = await res.json();
        setScans(json.scans);
        setAllScans((prev) => (page === 1 && verdictFilter === 'all' && repoFilter === 'all' && frameworkFilter === 'all' ? json.scans : prev));
        setTotalPages(json.totalPages);
      } else {
        setScans([]);
        setAllScans([]);
        setTotalPages(1);
      }
    } catch {
      setScans([]);
      setAllScans([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, verdictFilter, repoFilter, frameworkFilter]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // Stats derived from actual data
  const totalScansMonth = allScans.length;
  const passCount = allScans.filter((s) => s.verdict === 'pass').length;
  const passRate = totalScansMonth > 0 ? Math.round((passCount / totalScansMonth) * 100) : 0;
  const totalViolations = allScans.reduce((sum, s) => sum + s.controlsAffected, 0);
  const totalPoams = allScans.reduce((sum, s) => sum + s.poamEntriesCreated, 0);

  // Unique repos and frameworks for filter options
  const uniqueRepos = [...new Set(allScans.map((s) => s.repository))];
  const uniqueFrameworks = [...new Set(allScans.flatMap((s) => s.frameworks))];

  // Scan history table columns
  const columns: ColumnDef<PipelineScan>[] = [
    {
      key: 'verdict',
      header: 'Verdict',
      width: '80px',
      render: (row) => <VerdictBadge verdict={row.verdict} />,
    },
    {
      key: 'repository',
      header: 'Repository',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900 dark:text-white">{row.repository.split('/')[1]}</span>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (row) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.branch}</span>
      ),
    },
    {
      key: 'commit',
      header: 'Commit',
      width: '90px',
      render: (row) => (
        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{row.commitSha}</span>
      ),
    },
    {
      key: 'frameworks',
      header: 'Frameworks',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.frameworks.map((fw) => (
            <Badge key={fw} variant="outline">{fw}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'findings',
      header: 'Findings',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{row.totalFindings}</span>
          {row.critical > 0 && (
            <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {row.critical}C
            </span>
          )}
          {row.high > 0 && (
            <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {row.high}H
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'poam',
      header: 'POAM',
      width: '60px',
      render: (row) => (
        <span className={row.poamEntriesCreated > 0 ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-gray-400'}>
          {row.poamEntriesCreated}
        </span>
      ),
    },
    {
      key: 'triggeredBy',
      header: 'Trigger',
      width: '80px',
      render: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.prNumber ? `PR #${row.prNumber}` : 'Push'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.createdAt)}</span>
      ),
    },
  ];

  // Repo breakdown table columns
  const repoColumns: ColumnDef<RepoBreakdown>[] = [
    {
      key: 'name',
      header: 'Repository',
      sortable: true,
      render: (row) => <span className="font-medium text-gray-900 dark:text-white">{row.name}</span>,
    },
    {
      key: 'scanCount',
      header: 'Total Scans',
      sortable: true,
      render: (row) => <span>{row.scanCount}</span>,
    },
    {
      key: 'passRate',
      header: 'Pass Rate',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full ${row.passRate >= 80 ? 'bg-green-500' : row.passRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${row.passRate}%` }}
            />
          </div>
          <span className="text-xs font-medium">{row.passRate}%</span>
        </div>
      ),
    },
    {
      key: 'lastScan',
      header: 'Last Scan',
      sortable: true,
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(row.lastScan)}</span>,
    },
    {
      key: 'worstSeverity',
      header: 'Worst Severity',
      render: (row) =>
        row.worstSeverity ? (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityBadgeColors[row.worstSeverity]}`}>
            {row.worstSeverity}
          </span>
        ) : (
          <span className="text-xs text-gray-400">None</span>
        ),
    },
    {
      key: 'complianceScore',
      header: 'Compliance',
      sortable: true,
      render: (row) => (
        <span className={`text-sm font-bold ${row.complianceScore >= 80 ? 'text-green-600 dark:text-green-400' : row.complianceScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
          {row.complianceScore}%
        </span>
      ),
    },
  ];

  // Derived data from actual scans
  const repoBreakdown = deriveRepoBreakdown(allScans);
  const dailyTrends = deriveDailyTrends(allScans);
  const topViolations = deriveTopViolations(allScans);

  // Trend chart max
  const trendMax = Math.max(...(dailyTrends.length > 0 ? dailyTrends.map((d) => d.total) : [1]), 1);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Compliance Scans</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor CI/CD pipeline scan results, compliance violations, and POAM generation
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Scans (This Month)" value={totalScansMonth} />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          accent={passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-yellow-600' : 'text-red-600'}
        />
        <StatCard
          label="Compliance Violations"
          value={totalViolations}
          accent={totalViolations > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard
          label="POAM Entries Created"
          value={totalPoams}
          accent={totalPoams > 0 ? 'text-amber-600' : undefined}
        />
      </div>

      {/* Scan History */}
      <Card
        title="Scan History"
        description="Pipeline compliance scan results"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <FilterDropdown
              label="Verdict"
              value={verdictFilter}
              onChange={(v) => { setVerdictFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All Verdicts' },
                { value: 'pass', label: 'Pass' },
                { value: 'fail', label: 'Fail' },
                { value: 'warn', label: 'Warn' },
              ]}
            />
            <FilterDropdown
              label="Repository"
              value={repoFilter}
              onChange={(v) => { setRepoFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All Repos' },
                ...uniqueRepos.map((r) => ({ value: r, label: r.split('/')[1] })),
              ]}
            />
            <FilterDropdown
              label="Framework"
              value={frameworkFilter}
              onChange={(v) => { setFrameworkFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All Frameworks' },
                ...uniqueFrameworks.map((f) => ({ value: f, label: f })),
              ]}
            />
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading scans...</div>
          </div>
        ) : scans.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
            }
            title="No pipeline scans yet"
            description={verdictFilter !== 'all' || repoFilter !== 'all' || frameworkFilter !== 'all'
              ? 'No scans match your current filters. Try adjusting them.'
              : 'Run npx @cveriskpilot/scan in your CI/CD pipeline to start monitoring compliance.'}
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={scans}
              getRowId={(row) => row.scanId}
              onRowClick={(row) => setExpandedScanId(expandedScanId === row.scanId ? null : row.scanId)}
            />

            {/* Expanded row detail */}
            {expandedScanId && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Scan Details &mdash; {scans.find((s) => s.scanId === expandedScanId)?.repository}
                  </h4>
                  <button
                    onClick={() => setExpandedScanId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Close
                  </button>
                </div>

                {/* Findings summary by severity */}
                {(() => {
                  const scan = scans.find((s) => s.scanId === expandedScanId);
                  if (!scan || scan.totalFindings === 0) return null;
                  return (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {scan.critical > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center dark:border-red-800 dark:bg-red-900/20">
                          <p className="text-lg font-bold text-red-700 dark:text-red-400">{scan.critical}</p>
                          <p className="text-[10px] font-medium text-red-600 dark:text-red-500">Critical</p>
                        </div>
                      )}
                      {scan.high > 0 && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-center dark:border-orange-800 dark:bg-orange-900/20">
                          <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{scan.high}</p>
                          <p className="text-[10px] font-medium text-orange-600 dark:text-orange-500">High</p>
                        </div>
                      )}
                      {scan.medium > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-center dark:border-yellow-800 dark:bg-yellow-900/20">
                          <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{scan.medium}</p>
                          <p className="text-[10px] font-medium text-yellow-600 dark:text-yellow-500">Medium</p>
                        </div>
                      )}
                      {scan.low > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center dark:border-blue-800 dark:bg-blue-900/20">
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{scan.low}</p>
                          <p className="text-[10px] font-medium text-blue-600 dark:text-blue-500">Low</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Compliance Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Compliance Trends" description="Pass/fail rate over the last 30 days">
            {dailyTrends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No scan data yet.</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Run <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">npx @cveriskpilot/scan</code> to see trends.
                </p>
              </div>
            ) : (
            <>
              <div className="flex items-end gap-[2px]" style={{ height: 160 }}>
                {dailyTrends.map((day) => {
                  const passH = (day.pass / trendMax) * 140;
                  const failH = (day.fail / trendMax) * 140;
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center justify-end" title={`${day.date}: ${day.pass} pass, ${day.fail} fail`}>
                      <div className="w-full max-w-[12px] rounded-t bg-red-400 dark:bg-red-500" style={{ height: `${failH}px` }} />
                      <div className="w-full max-w-[12px] rounded-t bg-green-500 dark:bg-green-400" style={{ height: `${passH}px` }} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> Pass
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" /> Fail
                </div>
                <span className="ml-auto">Last 30 days</span>
              </div>
            </>
            )}
          </Card>
        </div>

        <div>
          <Card title="Most Violated Controls" description="Top 10 controls by violation count">
            {topViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No violations found.</p>
              </div>
            ) : (
            <div className="space-y-2">
              {topViolations.map((item, idx) => {
                const maxCount = topViolations[0].count;
                return (
                  <div key={item.control} className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs font-medium text-gray-400">{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200">{item.control}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.count}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-red-400 dark:bg-red-500"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </Card>
        </div>
      </div>

      {/* Repository Breakdown */}
      <Card title="Repository Breakdown" description="Compliance posture by repository">
        {repoBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No repositories scanned yet.</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Run <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">npx @cveriskpilot/scan</code> in your CI/CD pipeline to get started.
            </p>
          </div>
        ) : (
          <Table
            columns={repoColumns}
            data={repoBreakdown}
            getRowId={(row) => row.name}
            onRowClick={(row) => router.push(`/pipelines/${encodeURIComponent(row.name)}`)}
          />
        )}
      </Card>
    </div>
  );
}
