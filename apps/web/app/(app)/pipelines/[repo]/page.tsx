'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Table, type ColumnDef } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Verdict = 'pass' | 'fail' | 'warn';

interface FrameworkScore {
  name: string;
  score: number;
  controlsTotal: number;
  controlsPassing: number;
}

interface ScorecardFinding {
  id: string;
  title: string;
  severity: Severity;
  cweId: string;
  mappedControls: string[];
  firstSeen: string;
  status: 'open' | 'in_progress' | 'resolved';
}

interface RecentScan {
  scanId: string;
  verdict: Verdict;
  commitSha: string;
  branch: string;
  totalFindings: number;
  findingsDelta: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mock data per repo
// ---------------------------------------------------------------------------

const REPO_DATA: Record<string, {
  lastScan: string;
  overallScore: number;
  frameworks: FrameworkScore[];
  findings: ScorecardFinding[];
  recentScans: RecentScan[];
  resolvedFindings: number;
  openFindings: number;
  scoreTrend: number[];
}> = {
  'acmecorp/api-gateway': {
    lastScan: '2026-03-28T10:15:00Z',
    overallScore: 84,
    frameworks: [
      { name: 'NIST 800-53', score: 84, controlsTotal: 42, controlsPassing: 35 },
      { name: 'SOC 2', score: 91, controlsTotal: 18, controlsPassing: 16 },
      { name: 'CMMC Level 2', score: 78, controlsTotal: 31, controlsPassing: 24 },
      { name: 'FedRAMP', score: 86, controlsTotal: 38, controlsPassing: 33 },
      { name: 'ASVS', score: 72, controlsTotal: 24, controlsPassing: 17 },
    ],
    findings: [
      { id: 'f-001', title: 'SQL Injection in user query', severity: 'CRITICAL', cweId: 'CWE-89', mappedControls: ['SI-10', 'CC6.1'], firstSeen: '2026-03-28T10:15:00Z', status: 'open' },
      { id: 'f-002', title: 'Hardcoded API key in config', severity: 'CRITICAL', cweId: 'CWE-798', mappedControls: ['IA-5', 'CC6.6'], firstSeen: '2026-03-28T10:15:00Z', status: 'open' },
      { id: 'f-003', title: 'XSS in search input', severity: 'HIGH', cweId: 'CWE-79', mappedControls: ['SI-2', 'CC6.1'], firstSeen: '2026-03-25T14:20:00Z', status: 'in_progress' },
      { id: 'f-004', title: 'Path traversal in file upload', severity: 'HIGH', cweId: 'CWE-22', mappedControls: ['AC-4', 'CC6.1'], firstSeen: '2026-03-28T10:15:00Z', status: 'open' },
      { id: 'f-005', title: 'SSRF via image proxy', severity: 'HIGH', cweId: 'CWE-918', mappedControls: ['SC-7', 'CC6.6'], firstSeen: '2026-03-20T09:00:00Z', status: 'in_progress' },
      { id: 'f-006', title: 'CSRF in form submission', severity: 'MEDIUM', cweId: 'CWE-352', mappedControls: ['SC-23'], firstSeen: '2026-03-15T11:30:00Z', status: 'open' },
      { id: 'f-007', title: 'Sensitive data in error response', severity: 'MEDIUM', cweId: 'CWE-200', mappedControls: ['SC-28', 'CC6.7'], firstSeen: '2026-03-22T08:00:00Z', status: 'open' },
    ],
    recentScans: [
      { scanId: 's-01', verdict: 'fail', commitSha: 'a1b2c3d', branch: 'feat/user-search', totalFindings: 12, findingsDelta: 3, createdAt: '2026-03-28T10:15:00Z' },
      { scanId: 's-02', verdict: 'pass', commitSha: 'e4f5g6h', branch: 'main', totalFindings: 0, findingsDelta: -2, createdAt: '2026-03-27T18:30:00Z' },
      { scanId: 's-03', verdict: 'warn', commitSha: 'x9y8z7w', branch: 'fix/auth-check', totalFindings: 2, findingsDelta: -1, createdAt: '2026-03-27T12:00:00Z' },
      { scanId: 's-04', verdict: 'pass', commitSha: 'p4q5r6s', branch: 'main', totalFindings: 0, findingsDelta: 0, createdAt: '2026-03-26T22:00:00Z' },
      { scanId: 's-05', verdict: 'fail', commitSha: 'k1l2m3n', branch: 'feat/payment-flow', totalFindings: 9, findingsDelta: 5, createdAt: '2026-03-26T14:30:00Z' },
      { scanId: 's-06', verdict: 'pass', commitSha: 'g7h8i9j', branch: 'main', totalFindings: 0, findingsDelta: -3, createdAt: '2026-03-25T18:00:00Z' },
      { scanId: 's-07', verdict: 'warn', commitSha: 'c4d5e6f', branch: 'fix/xss-sanitize', totalFindings: 3, findingsDelta: 1, createdAt: '2026-03-25T10:00:00Z' },
      { scanId: 's-08', verdict: 'pass', commitSha: 'a0b1c2d', branch: 'main', totalFindings: 0, findingsDelta: 0, createdAt: '2026-03-24T20:00:00Z' },
      { scanId: 's-09', verdict: 'pass', commitSha: 'w3x4y5z', branch: 'main', totalFindings: 1, findingsDelta: 0, createdAt: '2026-03-24T08:00:00Z' },
      { scanId: 's-10', verdict: 'fail', commitSha: 't6u7v8w', branch: 'feat/api-v2', totalFindings: 8, findingsDelta: 4, createdAt: '2026-03-23T16:00:00Z' },
    ],
    resolvedFindings: 38,
    openFindings: 7,
    scoreTrend: [71, 73, 76, 78, 80, 79, 82, 84, 83, 84],
  },
  'acmecorp/frontend-app': {
    lastScan: '2026-03-28T08:45:00Z',
    overallScore: 89,
    frameworks: [
      { name: 'NIST 800-53', score: 92, controlsTotal: 42, controlsPassing: 39 },
      { name: 'ASVS', score: 86, controlsTotal: 24, controlsPassing: 21 },
      { name: 'SOC 2', score: 94, controlsTotal: 18, controlsPassing: 17 },
      { name: 'FedRAMP', score: 88, controlsTotal: 38, controlsPassing: 33 },
      { name: 'CMMC Level 2', score: 85, controlsTotal: 31, controlsPassing: 26 },
    ],
    findings: [
      { id: 'f-101', title: 'XSS in search component', severity: 'HIGH', cweId: 'CWE-79', mappedControls: ['SI-2', 'V5.3.3'], firstSeen: '2026-03-28T08:45:00Z', status: 'open' },
      { id: 'f-102', title: 'Missing CSP header', severity: 'MEDIUM', cweId: 'CWE-1021', mappedControls: ['SC-7'], firstSeen: '2026-03-20T14:00:00Z', status: 'in_progress' },
      { id: 'f-103', title: 'Open redirect in login flow', severity: 'MEDIUM', cweId: 'CWE-601', mappedControls: ['CM-7'], firstSeen: '2026-03-18T09:30:00Z', status: 'open' },
    ],
    recentScans: [
      { scanId: 's-11', verdict: 'warn', commitSha: 'i7j8k9l', branch: 'fix/xss-sanitize', totalFindings: 3, findingsDelta: 0, createdAt: '2026-03-28T08:45:00Z' },
      { scanId: 's-12', verdict: 'pass', commitSha: 'n1o2p3q', branch: 'main', totalFindings: 0, findingsDelta: -1, createdAt: '2026-03-27T16:00:00Z' },
      { scanId: 's-13', verdict: 'pass', commitSha: 'r4s5t6u', branch: 'main', totalFindings: 0, findingsDelta: 0, createdAt: '2026-03-26T20:00:00Z' },
    ],
    resolvedFindings: 52,
    openFindings: 3,
    scoreTrend: [82, 83, 85, 86, 87, 88, 88, 89, 89, 89],
  },
};

// Default data for unknown repos
const DEFAULT_REPO_DATA = {
  lastScan: '2026-03-28T00:00:00Z',
  overallScore: 75,
  frameworks: [
    { name: 'NIST 800-53', score: 75, controlsTotal: 42, controlsPassing: 32 },
    { name: 'SOC 2', score: 80, controlsTotal: 18, controlsPassing: 14 },
  ],
  findings: [],
  recentScans: [],
  resolvedFindings: 10,
  openFindings: 5,
  scoreTrend: [70, 71, 72, 73, 74, 74, 75, 75, 75, 75],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const verdictColors: Record<Verdict, string> = {
  pass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  fail: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
};

const severityColors: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  LOW: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBorderColor(score: number): string {
  if (score >= 80) return 'border-green-200 dark:border-green-800';
  if (score >= 60) return 'border-yellow-200 dark:border-yellow-800';
  return 'border-red-200 dark:border-red-800';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RepoScorecardPage() {
  const params = useParams();
  const router = useRouter();
  const repoParam = decodeURIComponent(params.repo as string);

  const data = REPO_DATA[repoParam] ?? DEFAULT_REPO_DATA;
  const totalFindings = data.openFindings + data.resolvedFindings;
  const resolvedPct = totalFindings > 0 ? Math.round((data.resolvedFindings / totalFindings) * 100) : 0;

  // Group findings by severity
  const severityOrder: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const groupedFindings = severityOrder
    .map((sev) => ({
      severity: sev,
      items: data.findings.filter((f) => f.severity === sev),
    }))
    .filter((g) => g.items.length > 0);

  // Finding table columns
  const findingColumns: ColumnDef<ScorecardFinding>[] = [
    {
      key: 'title',
      header: 'Finding',
      render: (row) => <span className="font-medium text-gray-900 dark:text-white">{row.title}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      width: '90px',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${severityColors[row.severity]}`}>
          {row.severity}
        </span>
      ),
    },
    {
      key: 'cweId',
      header: 'CWE',
      width: '80px',
      render: (row) => <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.cweId}</span>,
    },
    {
      key: 'controls',
      header: 'Mapped Controls',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.mappedControls.map((c) => (
            <span key={c} className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {c}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'firstSeen',
      header: 'First Seen',
      width: '120px',
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(row.firstSeen)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[row.status]}`}>
          {row.status === 'in_progress' ? 'In Progress' : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
  ];

  // Recent scans table columns
  const scanColumns: ColumnDef<RecentScan>[] = [
    {
      key: 'verdict',
      header: 'Verdict',
      width: '70px',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${verdictColors[row.verdict]}`}>
          {row.verdict.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'commit',
      header: 'Commit',
      width: '80px',
      render: (row) => <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{row.commitSha}</span>,
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (row) => <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.branch}</span>,
    },
    {
      key: 'findings',
      header: 'Findings',
      width: '80px',
      render: (row) => <span>{row.totalFindings}</span>,
    },
    {
      key: 'delta',
      header: 'Delta',
      width: '70px',
      render: (row) => {
        if (row.findingsDelta === 0) return <span className="text-gray-400">0</span>;
        if (row.findingsDelta > 0) return <span className="text-red-600 dark:text-red-400">+{row.findingsDelta}</span>;
        return <span className="text-green-600 dark:text-green-400">{row.findingsDelta}</span>;
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  // Trend chart
  const trendMax = Math.max(...data.scoreTrend, 1);

  return (
    <div className="space-y-6">
      {/* Back link + Header */}
      <div>
        <button
          onClick={() => router.push('/pipelines')}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Pipelines
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{repoParam}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last scanned {formatDateTime(data.lastScan)}
            </p>
          </div>
          {/* Overall compliance score circle */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="40" cy="40" r="34" fill="none" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - data.overallScore / 100)}`}
                  strokeLinecap="round"
                  className={data.overallScore >= 80 ? 'text-green-500' : data.overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'}
                  stroke="currentColor"
                />
              </svg>
              <span className={`absolute text-xl font-bold ${scoreColor(data.overallScore)}`}>
                {data.overallScore}%
              </span>
            </div>
            <span className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Overall Score</span>
          </div>
        </div>
      </div>

      {/* Framework Scores */}
      <Card title="Framework Scores" description="Compliance posture per framework">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {data.frameworks.map((fw) => (
            <div key={fw.name} className={`rounded-lg border p-4 ${scoreBorderColor(fw.score)}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{fw.name}</h4>
                <span className={`text-lg font-bold ${scoreColor(fw.score)}`}>{fw.score}%</span>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full transition-all ${scoreBarColor(fw.score)}`}
                    style={{ width: `${fw.score}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {fw.controlsPassing} / {fw.controlsTotal} controls passing
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Open Findings */}
      <Card title="Open Findings" description={`${data.findings.length} findings across ${groupedFindings.length} severity levels`}>
        {data.findings.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No open findings for this repository.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedFindings.map((group) => (
              <div key={group.severity}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${severityColors[group.severity]}`}>
                    {group.severity}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{group.items.length} finding{group.items.length !== 1 ? 's' : ''}</span>
                </div>
                <Table
                  columns={findingColumns}
                  data={group.items}
                  getRowId={(row) => row.id}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Remediation Progress + Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Remediation Progress" description="Resolved vs open findings">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Resolved</span>
                <span className="font-medium text-green-600 dark:text-green-400">{data.resolvedFindings} / {totalFindings}</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${resolvedPct}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Open</span>
                <span className="font-medium text-red-600 dark:text-red-400">{data.openFindings} / {totalFindings}</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-full rounded-full bg-red-400" style={{ width: `${100 - resolvedPct}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Resolution Rate</span>
                <span className={`text-lg font-bold ${resolvedPct >= 80 ? 'text-green-600 dark:text-green-400' : resolvedPct >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                  {resolvedPct}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Compliance Score Trend" description="Score over the last 10 scans">
          <div className="flex items-end gap-2" style={{ height: 140 }}>
            {data.scoreTrend.map((score, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">{score}</span>
                <div
                  className={`w-full max-w-[24px] rounded-t ${scoreBarColor(score)}`}
                  style={{ height: `${(score / 100) * 110}px` }}
                  title={`Scan ${idx + 1}: ${score}%`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
            <span>10 scans ago</span>
            <span>Latest</span>
          </div>
        </Card>
      </div>

      {/* Recent Scans */}
      <Card title="Recent Scans" description="Last 10 scan results for this repository">
        {data.recentScans.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No scan history available.
          </div>
        ) : (
          <Table
            columns={scanColumns}
            data={data.recentScans}
            getRowId={(row) => row.scanId}
          />
        )}
      </Card>
    </div>
  );
}
