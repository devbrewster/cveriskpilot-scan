'use client';

import { useState } from 'react';
import Link from 'next/link';
import { demoPipelineRepos, demoPipelineScans } from '@/lib/demo-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-green-700 bg-green-100';
  if (score >= 75) return 'text-yellow-700 bg-yellow-100';
  return 'text-red-700 bg-red-100';
}

function barColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoScorecardPage() {
  const [selectedRepo, setSelectedRepo] = useState(0);
  const repo = demoPipelineRepos[selectedRepo];

  // Build scan history from demoPipelineScans for selected repo
  const repoScans = demoPipelineScans.filter((s) => s.repository === repo.name);

  // Most violated controls (simulated from all repos)
  const violatedControls = [
    { control: 'SI-10', framework: 'NIST 800-53', count: 14, severity: 'CRITICAL' },
    { control: 'IA-5', framework: 'NIST 800-53', count: 9, severity: 'CRITICAL' },
    { control: 'CC6.1', framework: 'SOC 2', count: 8, severity: 'HIGH' },
    { control: 'AC-4', framework: 'NIST 800-53', count: 6, severity: 'HIGH' },
    { control: 'SC-7', framework: 'FedRAMP', count: 5, severity: 'HIGH' },
    { control: 'V5.3.4', framework: 'ASVS', count: 4, severity: 'MEDIUM' },
  ];

  const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/demo/pipeline" className="hover:text-blue-600">Pipeline Scanner</Link>
        <span>/</span>
        <span className="text-gray-900">Scorecard</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Repository Compliance Scorecard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Per-repository compliance scores across all active frameworks &mdash; Demo Mode
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Repo list */}
        <div className="space-y-2 lg:col-span-1">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Repositories</div>
          {demoPipelineRepos.map((r, idx) => (
            <button
              key={r.name}
              type="button"
              onClick={() => setSelectedRepo(idx)}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                selectedRepo === idx
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{r.name.split('/')[1]}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(r.passRate)}`}>
                  {r.passRate}%
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
                <span>{r.scanCount} scans</span>
                <span>Last: {relativeTime(r.lastScan)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className={`h-full rounded-full ${barColor(r.passRate)}`} style={{ width: `${r.passRate}%` }} />
              </div>
            </button>
          ))}
        </div>

        {/* Right: Selected repo detail */}
        <div className="space-y-6 lg:col-span-2">
          {/* Repo header */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{repo.name}</h2>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreColor(repo.passRate)}`}>
                {repo.passRate}% Pass Rate
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{repo.scanCount} total scans</span>
              <span>Last scan: {relativeTime(repo.lastScan)}</span>
              <span>{repo.frameworks.length} framework{repo.frameworks.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Framework scores */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Framework Compliance Scores</h3>
            <div className="space-y-4">
              {repo.frameworks.map((fw) => (
                <div key={fw.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{fw.name}</span>
                    <span className="text-sm font-bold text-gray-900">{fw.score}%</span>
                  </div>
                  <div className="mb-1 h-3 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor(fw.score)}`}
                      style={{ width: `${fw.score}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>{fw.controlsPassing} / {fw.controlsTotal} controls passing</span>
                    <span>{fw.controlsTotal - fw.controlsPassing} failing</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scan history */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Recent Scans</h3>
            {repoScans.length > 0 ? (
              <div className="space-y-2">
                {repoScans.map((scan) => (
                  <div key={scan.scanId} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      scan.verdict === 'pass' ? 'bg-green-100 text-green-700' :
                      scan.verdict === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {scan.verdict.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-900">
                        {scan.branch}
                        {scan.prNumber && <span className="ml-1 text-gray-500">#{scan.prNumber}</span>}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-gray-400">{scan.commitSha}</span>
                    <span className="text-[10px] text-gray-500">{relativeTime(scan.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <p className="text-sm text-gray-500">Scan history shown for repos with matching data.</p>
                <p className="text-xs text-gray-400">In production, every PR triggers a scan entry.</p>
              </div>
            )}

            {/* Simulated pass/fail chart */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h4 className="mb-3 text-xs font-semibold text-gray-700">Pass/Fail Trend (Last 10 Scans)</h4>
              <div className="flex items-end gap-1">
                {[true, true, false, true, true, true, false, true, true, false].map((pass, idx) => (
                  <div key={idx} className="flex-1">
                    <div
                      className={`mx-auto w-full max-w-[20px] rounded-t ${pass ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ height: pass ? '32px' : '24px' }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>10 scans ago</span>
                <span>Latest</span>
              </div>
            </div>
          </div>

          {/* Most violated controls */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Most Violated Controls</h3>
            <div className="space-y-2">
              {violatedControls.map((vc) => (
                <div key={vc.control} className="flex items-center gap-3 rounded border border-gray-100 bg-gray-50 p-2">
                  <span className="font-mono text-xs font-bold text-gray-900">{vc.control}</span>
                  <span className="text-xs text-gray-500">{vc.framework}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_COLORS[vc.severity] || 'bg-gray-100 text-gray-700'}`}>
                    {vc.severity}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-red-400" style={{ width: `${(vc.count / 14) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{vc.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
