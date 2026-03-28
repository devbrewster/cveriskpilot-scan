'use client';

import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

interface AnalyticsData {
  scansPerDay: Array<{ date: string; count: number }>;
  apiCallsPerDay: Array<{ date: string; count: number }>;
  activeUsersPerDay: Array<{ date: string; count: number }>;
  storageByOrg: Array<{ orgName: string; storageBytes: number }>;
  scansByFormat: Array<{ format: string; count: number }>;
  usersByTier: Record<string, number>;
  totals: {
    totalScans30d: number;
    totalApiCalls30d: number;
    totalActiveUsers: number;
    totalStorageBytes: number;
  };
}

type DateRange = '7d' | '30d' | '90d';

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(1)} KB`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const TIER_COLORS: Record<string, string> = {
  FREE: 'bg-gray-500',
  FOUNDERS_BETA: 'bg-amber-500',
  PRO: 'bg-violet-500',
  ENTERPRISE: 'bg-blue-500',
  MSSP: 'bg-emerald-500',
};

const TIER_TEXT_COLORS: Record<string, string> = {
  FREE: 'text-gray-400',
  FOUNDERS_BETA: 'text-amber-400',
  PRO: 'text-violet-400',
  ENTERPRISE: 'text-blue-400',
  MSSP: 'text-emerald-400',
};

export default function OpsAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');

  useEffect(() => {
    setLoading(true);
    fetch('/api/ops/analytics')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter scansPerDay based on selected range
  function sliceByRange<T>(arr: T[]): T[] {
    if (!arr) return [];
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    return arr.slice(-days);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-800" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-800" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        Failed to load analytics data.
      </div>
    );
  }

  const scans = sliceByRange(data.scansPerDay);
  const maxScanCount = Math.max(...scans.map((d) => d.count), 1);
  const maxStorage = data.storageByOrg[0]?.storageBytes ?? 1;
  const totalFormatScans = data.scansByFormat.reduce((s, f) => s + f.count, 0);
  const totalTierUsers = Object.values(data.usersByTier).reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usage Analytics</h1>
          <p className="mt-1 text-sm text-gray-400">Platform-wide usage metrics and trends</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-800 p-1">
          {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-violet-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OpsStatCard label="Total Scans (30d)" value={formatNumber(data.totals.totalScans30d)} />
        <OpsStatCard label="API Calls (30d)" value={formatNumber(data.totals.totalApiCalls30d)} />
        <OpsStatCard label="Active Users" value={formatNumber(data.totals.totalActiveUsers)} />
        <OpsStatCard label="Storage Used" value={formatBytes(data.totals.totalStorageBytes)} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scans Per Day */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Scans Per Day</h3>
          <div className="space-y-1.5">
            {scans.slice(-15).map((d) => (
              <div key={d.date} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 text-gray-500 font-mono">
                  {d.date.slice(5)}
                </span>
                <div className="flex-1">
                  <div
                    className="h-4 rounded-sm bg-violet-500/70 transition-all"
                    style={{ width: `${(d.count / maxScanCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-400 font-mono">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Orgs by Storage */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Top Organizations by Storage</h3>
          <div className="space-y-3">
            {data.storageByOrg.map((org, i) => (
              <div key={org.orgName}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-300">
                    <span className="text-gray-500 mr-1.5">{i + 1}.</span>
                    {org.orgName}
                  </span>
                  <span className="text-gray-400 font-mono">
                    {formatBytes(org.storageBytes)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-violet-500/60 transition-all"
                    style={{ width: `${(org.storageBytes / maxStorage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scans by Format */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Scans by Format</h3>
          <div className="space-y-2.5">
            {data.scansByFormat.map((f) => {
              const pct = ((f.count / totalFormatScans) * 100).toFixed(1);
              return (
                <div key={f.format} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 text-gray-300">{f.format}</span>
                  <div className="flex-1">
                    <div className="h-3 w-full rounded-full bg-gray-800">
                      <div
                        className="h-3 rounded-full bg-violet-500/50 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-gray-400 font-mono">
                    {f.count} <span className="text-gray-600">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Users by Tier */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Users by Tier</h3>

          {/* Stacked bar */}
          <div className="mb-4 flex h-8 w-full overflow-hidden rounded-md">
            {Object.entries(data.usersByTier).map(([tier, count]) => (
              <div
                key={tier}
                className={`${TIER_COLORS[tier] ?? 'bg-gray-600'} transition-all`}
                style={{ width: `${(count / totalTierUsers) * 100}%` }}
                title={`${tier}: ${count}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {Object.entries(data.usersByTier).map(([tier, count]) => {
              const pct = ((count / totalTierUsers) * 100).toFixed(1);
              return (
                <div key={tier} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-sm ${TIER_COLORS[tier] ?? 'bg-gray-600'}`} />
                    <span className={TIER_TEXT_COLORS[tier] ?? 'text-gray-400'}>
                      {tier.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-gray-400 font-mono">
                    {count} <span className="text-gray-600">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-300">Total Users</span>
              <span className="font-mono text-white">{totalTierUsers.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Ops-themed stat card (dark)                                                */
/* -------------------------------------------------------------------------- */
function OpsStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}
