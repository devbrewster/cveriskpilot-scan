'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  demoPipelineScans,
  demoPipelineRepos,
} from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Verdict = 'pass' | 'fail' | 'warn';

// ---------------------------------------------------------------------------
// Verdict badge
// ---------------------------------------------------------------------------

const verdictColors: Record<Verdict, string> = {
  pass: 'bg-green-100 text-green-800 border-green-200',
  fail: 'bg-red-100 text-red-800 border-red-200',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${verdictColors[verdict]}`}>
      {verdict.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoPipelinesPage() {
  const [verdictFilter, setVerdictFilter] = useState<string>('all');

  const scans = demoPipelineScans;
  const repos = demoPipelineRepos;

  const filteredScans = verdictFilter === 'all'
    ? scans
    : scans.filter((s) => s.verdict === verdictFilter);

  // Stats
  const totalScans = scans.length;
  const passCount = scans.filter((s) => s.verdict === 'pass').length;
  const passRate = totalScans > 0 ? Math.round((passCount / totalScans) * 100) : 0;
  const totalViolations = scans.reduce((sum, s) => sum + s.controlsAffected, 0);
  const totalPoams = scans.reduce((sum, s) => sum + s.poamEntriesCreated, 0);

  // Trend data
  const trendData = Array.from({ length: 14 }, (_, i) => {
    const date = new Date('2026-03-15');
    date.setDate(date.getDate() + i);
    const total = Math.floor(Math.random() * 6) + 3;
    const pass = Math.floor(total * (0.55 + Math.random() * 0.35));
    return { date: date.toISOString().slice(5, 10), pass, fail: total - pass, total };
  });
  const trendMax = Math.max(...trendData.map((d) => d.total), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Compliance Scans</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor CI/CD pipeline scan results, compliance violations, and POAM generation &mdash; Demo Mode
        </p>
      </div>

      {/* Demo banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
        <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-2.147 2.146a2.25 2.25 0 01-1.591.659H7.938a2.25 2.25 0 01-1.591-.659L4.2 14.5m15.6 0l.147-.146a2.25 2.25 0 000-3.182l-.31-.31" />
        </svg>
        <span className="text-sm font-medium text-amber-800">
          Demo Mode &mdash; Showing sample pipeline scan data
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Scans</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalScans}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pass Rate</p>
          <p className={`mt-2 text-3xl font-bold ${passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
            {passRate}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Compliance Violations</p>
          <p className={`mt-2 text-3xl font-bold ${totalViolations > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {totalViolations}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">POAM Entries</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totalPoams}</p>
        </div>
      </div>

      {/* Scan History */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Scan History</h3>
            <p className="mt-1 text-sm text-gray-500">Pipeline compliance scan results</p>
          </div>
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
          >
            <option value="all">All Verdicts</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="warn">Warn</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Verdict</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Repository</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Commit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Findings</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Frameworks</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">POAM</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredScans.map((scan) => (
                <tr key={scan.scanId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <VerdictBadge verdict={scan.verdict} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {scan.repository.split('/')[1]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-xs text-gray-600">
                    {scan.branch}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-xs text-blue-600">
                    {scan.commitSha}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{scan.totalFindings}</span>
                      {scan.critical > 0 && (
                        <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-700">{scan.critical}C</span>
                      )}
                      {scan.high > 0 && (
                        <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-bold text-orange-700">{scan.high}H</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {scan.frameworks.map((fw) => (
                        <span key={fw} className="inline-flex items-center rounded-full border border-gray-300 bg-transparent px-2 py-0.5 text-[10px] font-medium text-gray-700">
                          {fw}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span className={scan.poamEntriesCreated > 0 ? 'font-medium text-amber-700' : 'text-gray-400'}>
                      {scan.poamEntriesCreated}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {formatDateTime(scan.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend + Repos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-1 text-base font-semibold text-gray-900">Compliance Trends</h3>
          <p className="mb-4 text-sm text-gray-500">Pass/fail rate over the last 14 days</p>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {trendData.map((day) => {
              const passH = (day.pass / trendMax) * 100;
              const failH = (day.fail / trendMax) * 100;
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center justify-end" title={`${day.date}: ${day.pass}P / ${day.fail}F`}>
                  <div className="w-full max-w-[14px] rounded-t bg-red-400" style={{ height: `${failH}px` }} />
                  <div className="w-full max-w-[14px] rounded-t bg-green-500" style={{ height: `${passH}px` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" /> Pass</div>
            <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" /> Fail</div>
          </div>
        </div>

        {/* Repository list */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-base font-semibold text-gray-900">Repositories</h3>
          <p className="mb-4 text-sm text-gray-500">Compliance posture by repo</p>
          <div className="space-y-3">
            {repos.map((repo) => (
              <div key={repo.name} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{repo.name.split('/')[1]}</span>
                  <span className={`text-sm font-bold ${repo.passRate >= 80 ? 'text-green-600' : repo.passRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {repo.passRate}%
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${repo.passRate >= 80 ? 'bg-green-500' : repo.passRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${repo.passRate}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{repo.scanCount} scans</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Link to interactive demo */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
        <h3 className="text-lg font-semibold text-blue-900">Try the Interactive Pipeline Scanner</h3>
        <p className="mt-1 text-sm text-blue-700">See how a compliance scan runs in real-time on a pull request</p>
        <Link
          href="/demo/pipeline"
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Run Interactive Demo
        </Link>
      </div>
    </div>
  );
}
