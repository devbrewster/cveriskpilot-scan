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

interface ComplianceImpact {
  framework: string;
  control: string;
  title: string;
  cwes: string[];
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
// Mock data (used until API is wired)
// ---------------------------------------------------------------------------

const MOCK_SCANS: PipelineScan[] = [
  { scanId: 'scan_01JQXYZ123456', repository: 'acmecorp/api-gateway', branch: 'feat/user-search', commitSha: 'a1b2c3d', prNumber: 342, verdict: 'fail', totalFindings: 12, critical: 2, high: 4, medium: 2, low: 4, controlsAffected: 8, frameworks: ['NIST 800-53', 'SOC 2', 'CMMC'], poamEntriesCreated: 4, createdAt: '2026-03-28T10:15:00Z' },
  { scanId: 'scan_01JQXYZ123457', repository: 'acmecorp/api-gateway', branch: 'main', commitSha: 'e4f5g6h', prNumber: null, verdict: 'pass', totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, controlsAffected: 0, frameworks: ['NIST 800-53', 'SOC 2', 'CMMC'], poamEntriesCreated: 0, createdAt: '2026-03-27T18:30:00Z' },
  { scanId: 'scan_01JQXYZ123458', repository: 'acmecorp/frontend-app', branch: 'fix/xss-sanitize', commitSha: 'i7j8k9l', prNumber: 187, verdict: 'warn', totalFindings: 3, critical: 0, high: 1, medium: 2, low: 0, controlsAffected: 3, frameworks: ['NIST 800-53', 'ASVS'], poamEntriesCreated: 1, createdAt: '2026-03-28T08:45:00Z' },
  { scanId: 'scan_01JQXYZ123459', repository: 'acmecorp/infra-terraform', branch: 'main', commitSha: 'm0n1o2p', prNumber: null, verdict: 'pass', totalFindings: 1, critical: 0, high: 0, medium: 0, low: 1, controlsAffected: 0, frameworks: ['FedRAMP', 'NIST 800-53'], poamEntriesCreated: 0, createdAt: '2026-03-27T22:00:00Z' },
  { scanId: 'scan_01JQXYZ123460', repository: 'acmecorp/payment-service', branch: 'feat/stripe-v3', commitSha: 'q3r4s5t', prNumber: 56, verdict: 'fail', totalFindings: 7, critical: 3, high: 2, medium: 1, low: 1, controlsAffected: 6, frameworks: ['SOC 2', 'ASVS', 'SSDF'], poamEntriesCreated: 3, createdAt: '2026-03-28T06:20:00Z' },
  { scanId: 'scan_01JQXYZ123461', repository: 'acmecorp/auth-service', branch: 'main', commitSha: 'u5v6w7x', prNumber: null, verdict: 'pass', totalFindings: 0, critical: 0, high: 0, medium: 0, low: 0, controlsAffected: 0, frameworks: ['NIST 800-53', 'CMMC', 'FedRAMP'], poamEntriesCreated: 0, createdAt: '2026-03-26T14:10:00Z' },
  { scanId: 'scan_01JQXYZ123462', repository: 'acmecorp/mobile-backend', branch: 'feat/push-notif', commitSha: 'y8z9a0b', prNumber: 412, verdict: 'warn', totalFindings: 5, critical: 0, high: 2, medium: 2, low: 1, controlsAffected: 4, frameworks: ['NIST 800-53', 'SOC 2'], poamEntriesCreated: 2, createdAt: '2026-03-27T11:30:00Z' },
  { scanId: 'scan_01JQXYZ123463', repository: 'acmecorp/data-pipeline', branch: 'fix/sql-param', commitSha: 'c1d2e3f', prNumber: 89, verdict: 'pass', totalFindings: 2, critical: 0, high: 0, medium: 1, low: 1, controlsAffected: 1, frameworks: ['NIST 800-53', 'SSDF'], poamEntriesCreated: 0, createdAt: '2026-03-28T09:00:00Z' },
];

const MOCK_COMPLIANCE_IMPACT: Record<string, ComplianceImpact[]> = {
  scan_01JQXYZ123456: [
    { framework: 'NIST 800-53', control: 'SI-10', title: 'Information Input Validation', cwes: ['CWE-89', 'CWE-502', 'CWE-78'] },
    { framework: 'NIST 800-53', control: 'IA-5', title: 'Authenticator Management', cwes: ['CWE-798'] },
    { framework: 'NIST 800-53', control: 'SI-2', title: 'Flaw Remediation', cwes: ['CWE-79'] },
    { framework: 'NIST 800-53', control: 'AC-4', title: 'Information Flow Enforcement', cwes: ['CWE-22'] },
    { framework: 'SOC 2', control: 'CC6.1', title: 'Logical and Physical Access Controls', cwes: ['CWE-89', 'CWE-79', 'CWE-798'] },
    { framework: 'CMMC', control: 'SI.L2-3.14.2', title: 'Malicious Code Protection', cwes: ['CWE-89', 'CWE-502'] },
    { framework: 'CMMC', control: 'IA.L2-3.5.10', title: 'Cryptographically-Protected Passwords', cwes: ['CWE-798'] },
    { framework: 'CMMC', control: 'AC.L2-3.1.3', title: 'Control CUI Flow', cwes: ['CWE-22'] },
  ],
  scan_01JQXYZ123460: [
    { framework: 'SOC 2', control: 'CC6.1', title: 'Logical and Physical Access Controls', cwes: ['CWE-89', 'CWE-287'] },
    { framework: 'SOC 2', control: 'CC6.6', title: 'System Boundary Protection', cwes: ['CWE-918'] },
    { framework: 'ASVS', control: 'V5.3.4', title: 'SQL Injection Prevention', cwes: ['CWE-89'] },
    { framework: 'ASVS', control: 'V2.1.1', title: 'Password Security Requirements', cwes: ['CWE-287'] },
    { framework: 'SSDF', control: 'PW.5.1', title: 'Verify Software Release Integrity', cwes: ['CWE-89', 'CWE-287'] },
    { framework: 'SSDF', control: 'PO.5.2', title: 'Implement Roles and Responsibilities', cwes: ['CWE-798'] },
  ],
};

const MOCK_REPOS: RepoBreakdown[] = [
  { name: 'acmecorp/api-gateway', lastScan: '2026-03-28T10:15:00Z', scanCount: 147, passRate: 72, worstSeverity: 'CRITICAL', complianceScore: 84 },
  { name: 'acmecorp/frontend-app', lastScan: '2026-03-28T08:45:00Z', scanCount: 203, passRate: 88, worstSeverity: 'HIGH', complianceScore: 89 },
  { name: 'acmecorp/payment-service', lastScan: '2026-03-28T06:20:00Z', scanCount: 89, passRate: 64, worstSeverity: 'CRITICAL', complianceScore: 76 },
  { name: 'acmecorp/infra-terraform', lastScan: '2026-03-27T22:00:00Z', scanCount: 312, passRate: 95, worstSeverity: 'LOW', complianceScore: 96 },
  { name: 'acmecorp/auth-service', lastScan: '2026-03-26T14:10:00Z', scanCount: 178, passRate: 91, worstSeverity: null, complianceScore: 91 },
  { name: 'acmecorp/mobile-backend', lastScan: '2026-03-27T11:30:00Z', scanCount: 94, passRate: 78, worstSeverity: 'HIGH', complianceScore: 82 },
  { name: 'acmecorp/data-pipeline', lastScan: '2026-03-28T09:00:00Z', scanCount: 56, passRate: 85, worstSeverity: 'MEDIUM', complianceScore: 88 },
];

// Mock trend data: last 30 days pass/fail
const MOCK_DAILY_TRENDS = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2026-02-27');
  date.setDate(date.getDate() + i);
  const total = Math.floor(Math.random() * 8) + 4;
  const pass = Math.floor(total * (0.6 + Math.random() * 0.3));
  return { date: date.toISOString().slice(0, 10), pass, fail: total - pass, total };
});

const MOCK_TOP_VIOLATIONS = [
  { control: 'SI-10', framework: 'NIST 800-53', title: 'Information Input Validation', count: 34 },
  { control: 'CC6.1', framework: 'SOC 2', title: 'Logical and Physical Access Controls', count: 28 },
  { control: 'IA-5', framework: 'NIST 800-53', title: 'Authenticator Management', count: 21 },
  { control: 'SI-2', framework: 'NIST 800-53', title: 'Flaw Remediation', count: 19 },
  { control: 'AC-4', framework: 'NIST 800-53', title: 'Information Flow Enforcement', count: 16 },
  { control: 'V5.3.4', framework: 'ASVS', title: 'SQL Injection Prevention', count: 14 },
  { control: 'PW.5.1', framework: 'SSDF', title: 'Verify Software Release Integrity', count: 12 },
  { control: 'SC-7', framework: 'NIST 800-53', title: 'Boundary Protection', count: 11 },
  { control: 'CC6.6', framework: 'SOC 2', title: 'System Boundary Protection', count: 9 },
  { control: 'IA-2', framework: 'NIST 800-53', title: 'Identification and Authentication', count: 8 },
];

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
        setTotalPages(json.totalPages);
      } else {
        // Fallback to mock data
        applyMockFilters();
      }
    } catch {
      applyMockFilters();
    } finally {
      setLoading(false);
    }
  }, [page, verdictFilter, repoFilter, frameworkFilter]);

  function applyMockFilters() {
    let filtered = [...MOCK_SCANS];
    if (verdictFilter !== 'all') filtered = filtered.filter((s) => s.verdict === verdictFilter);
    if (repoFilter !== 'all') filtered = filtered.filter((s) => s.repository === repoFilter);
    if (frameworkFilter !== 'all') filtered = filtered.filter((s) => s.frameworks.includes(frameworkFilter));
    setScans(filtered);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / 10)));
  }

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // Stats
  const totalScansMonth = MOCK_SCANS.length;
  const passCount = MOCK_SCANS.filter((s) => s.verdict === 'pass').length;
  const passRate = totalScansMonth > 0 ? Math.round((passCount / totalScansMonth) * 100) : 0;
  const totalViolations = MOCK_SCANS.reduce((sum, s) => sum + s.controlsAffected, 0);
  const totalPoams = MOCK_SCANS.reduce((sum, s) => sum + s.poamEntriesCreated, 0);

  // Unique repos and frameworks for filter options
  const uniqueRepos = [...new Set(MOCK_SCANS.map((s) => s.repository))];
  const uniqueFrameworks = [...new Set(MOCK_SCANS.flatMap((s) => s.frameworks))];

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

  // Compliance impact for expanded row
  const expandedImpact = expandedScanId ? (MOCK_COMPLIANCE_IMPACT[expandedScanId] ?? []) : [];

  // Trend chart max
  const trendMax = Math.max(...MOCK_DAILY_TRENDS.map((d) => d.total), 1);

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
            title="No pipeline scans found"
            description="Configure your CI/CD pipeline to run compliance scans, or adjust your filters."
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
                    Compliance Impact &mdash; {scans.find((s) => s.scanId === expandedScanId)?.repository}
                  </h4>
                  <button
                    onClick={() => setExpandedScanId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Close
                  </button>
                </div>

                {expandedImpact.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Framework</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Control</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Title</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">CWEs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {expandedImpact.map((item, idx) => (
                          <tr key={`${item.control}-${idx}`}>
                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.framework}</td>
                            <td className="px-3 py-2 font-mono text-xs font-bold text-gray-900 dark:text-white">{item.control}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.title}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {item.cwes.map((cwe) => (
                                  <span key={cwe} className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                    {cwe}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No compliance impact data available for this scan.</p>
                )}

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
            <div className="flex items-end gap-[2px]" style={{ height: 160 }}>
              {MOCK_DAILY_TRENDS.map((day) => {
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
          </Card>
        </div>

        <div>
          <Card title="Most Violated Controls" description="Top 10 controls by violation count">
            <div className="space-y-2">
              {MOCK_TOP_VIOLATIONS.map((item, idx) => {
                const maxCount = MOCK_TOP_VIOLATIONS[0].count;
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
          </Card>
        </div>
      </div>

      {/* Repository Breakdown */}
      <Card title="Repository Breakdown" description="Compliance posture by repository">
        <Table
          columns={repoColumns}
          data={MOCK_REPOS}
          getRowId={(row) => row.name}
          onRowClick={(row) => router.push(`/pipelines/${encodeURIComponent(row.name)}`)}
        />
      </Card>
    </div>
  );
}
