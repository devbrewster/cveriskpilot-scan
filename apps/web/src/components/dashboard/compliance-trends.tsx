'use client';

import { useEffect, useState } from 'react';

interface TrendData {
  period: string;
  trendSummary: Record<string, number>;
  trendEvents: Array<{
    metric: string;
    cveId: string | null;
    previousValue: string | null;
    currentValue: string;
    delta: number | null;
    severity: string | null;
    detectedAt: string;
  }>;
  casesTimeSeries: Array<{
    date: string;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  complianceTimeSeries: Record<
    string,
    Array<{ score: number; date: string; controlsMet: number; controlsTotal: number }>
  >;
  totalTrendEvents: number;
  newCasesInPeriod: number;
}

const METRIC_LABELS: Record<string, string> = {
  new_cve: 'New CVEs',
  resolved_cve: 'Resolved',
  epss_jump: 'EPSS Jumps',
  severity_change: 'Severity Changes',
  kev_added: 'KEV Additions',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-400',
};

export function ComplianceTrends({ period = '30d' }: { period?: string }) {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const res = await fetch(`/api/dashboard/trends?period=${period}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch trends:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrends();
  }, [period]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">No trend data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Object.entries(METRIC_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {data.trendSummary[key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Cases Over Time (simple bar representation) */}
      {data.casesTimeSeries.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Cases by Day</h3>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {data.casesTimeSeries.map((day) => {
              const maxTotal = Math.max(...data.casesTimeSeries.map((d) => d.total), 1);
              const heightPct = (day.total / maxTotal) * 100;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-stretch justify-end gap-px group relative"
                  style={{ height: '100%' }}
                >
                  {/* Stacked severity bars */}
                  <div className="flex flex-col-reverse gap-px" style={{ height: `${heightPct}%` }}>
                    {day.critical > 0 && (
                      <div className="bg-red-500 rounded-t-sm" style={{ flex: day.critical }} />
                    )}
                    {day.high > 0 && (
                      <div className="bg-orange-500" style={{ flex: day.high }} />
                    )}
                    {day.medium > 0 && (
                      <div className="bg-yellow-500" style={{ flex: day.medium }} />
                    )}
                    {day.low > 0 && (
                      <div className="bg-blue-500 rounded-b-sm" style={{ flex: day.low }} />
                    )}
                    {day.total - day.critical - day.high - day.medium - day.low > 0 && (
                      <div className="bg-gray-300 rounded-b-sm" style={{ flex: day.total - day.critical - day.high - day.medium - day.low }} />
                    )}
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="rounded bg-gray-900 px-2 py-1 text-xs text-white whitespace-nowrap">
                      {day.date}: {day.total} cases
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>{data.casesTimeSeries[0]?.date}</span>
            <span>{data.casesTimeSeries[data.casesTimeSeries.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Compliance Score Trends */}
      {Object.keys(data.complianceTimeSeries).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Compliance Score Trends</h3>
          <div className="space-y-3">
            {Object.entries(data.complianceTimeSeries).map(([framework, snapshots]) => {
              const latest = snapshots[snapshots.length - 1];
              const first = snapshots[0];
              const delta = latest && first ? latest.score - first.score : 0;

              return (
                <div key={framework} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium text-gray-700 truncate">
                    {framework}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (latest?.score ?? 0) >= 80
                          ? 'bg-emerald-500'
                          : (latest?.score ?? 0) >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${latest?.score ?? 0}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-semibold text-gray-900">
                    {latest?.score?.toFixed(0) ?? '—'}%
                  </span>
                  {delta !== 0 && (
                    <span
                      className={`w-12 text-right text-xs font-medium ${
                        delta > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Trend Events */}
      {data.trendEvents.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Recent Changes ({data.totalTrendEvents})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.trendEvents.slice(0, 20).map((event, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    SEVERITY_COLORS[event.severity ?? 'INFO'] ?? 'bg-gray-400'
                  }`}
                />
                <span className="text-gray-500 w-24 flex-shrink-0">
                  {METRIC_LABELS[event.metric] ?? event.metric}
                </span>
                <span className="font-mono text-xs text-gray-700 truncate">
                  {event.cveId ?? '—'}
                </span>
                {event.previousValue && (
                  <span className="text-gray-400 text-xs">
                    {event.previousValue} → {event.currentValue}
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                  {new Date(event.detectedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
