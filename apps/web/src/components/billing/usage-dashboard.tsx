'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetricValues {
  assets_scanned: number;
  findings_processed: number;
  ai_calls: number;
  storage_gb: number;
}

interface ClientUsage {
  clientId: string;
  clientName?: string;
  period: string;
  metrics: MetricValues;
}

interface OrgUsageSummary {
  orgId: string;
  period: string;
  totals: MetricValues;
  clients: ClientUsage[];
}

interface CostBreakdownItem {
  quantity: number;
  unitCost: number;
  cost: number;
}

interface CostEstimate {
  baseCost: number;
  meteredCost: number;
  totalEstimated: number;
  breakdown: Record<string, CostBreakdownItem>;
}

interface UsageResponse {
  usage: OrgUsageSummary;
  costEstimate: CostEstimate;
  tier: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const METRIC_LABELS: Record<keyof MetricValues, string> = {
  assets_scanned: 'Assets Scanned',
  findings_processed: 'Findings Processed',
  ai_calls: 'AI Calls',
  storage_gb: 'Storage (GB)',
};

const METRIC_COLORS: Record<keyof MetricValues, string> = {
  assets_scanned: 'bg-blue-500',
  findings_processed: 'bg-amber-500',
  ai_calls: 'bg-purple-500',
  storage_gb: 'bg-green-500',
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

// Simple bar for usage visualization
function UsageBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-3 rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UsageDashboardProps {
  organizationId: string;
}

export function UsageDashboard({ organizationId }: UsageDashboardProps) {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        setLoading(true);
        const res = await fetch(`/api/billing/usage?organizationId=${organizationId}`);
        if (!res.ok) throw new Error('Failed to fetch usage data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        {error ?? 'No usage data available'}
      </div>
    );
  }

  const { usage, costEstimate, tier } = data;
  const isMSSP = tier === 'MSSP';
  const metrics = Object.keys(METRIC_LABELS) as (keyof MetricValues)[];

  // Determine max values for bar charts (use highest client value)
  const maxPerMetric: Record<string, number> = {};
  for (const m of metrics) {
    const clientMax = usage.clients.length > 0
      ? Math.max(...usage.clients.map((c) => c.metrics[m]))
      : 0;
    maxPerMetric[m] = Math.max(clientMax, usage.totals[m], 1);
  }

  return (
    <div className="space-y-8">
      {/* Period header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Usage Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Period: {usage.period}
          </p>
        </div>
        <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {tier} tier
        </div>
      </div>

      {/* Total metrics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {METRIC_LABELS[metric]}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(usage.totals[metric])}
            </p>
            <div className="mt-2">
              <UsageBar
                value={usage.totals[metric]}
                max={maxPerMetric[metric]}
                color={METRIC_COLORS[metric]}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Cost estimate (MSSP only shows metered) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projected Cost</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Base</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(costEstimate.baseCost)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Metered Usage</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(costEstimate.meteredCost)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Estimated</p>
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(costEstimate.totalEstimated)}</p>
          </div>
        </div>

        {isMSSP && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 text-left font-medium text-gray-600 dark:text-gray-400">Metric</th>
                  <th className="py-2 text-right font-medium text-gray-600 dark:text-gray-400">Quantity</th>
                  <th className="py-2 text-right font-medium text-gray-600 dark:text-gray-400">Unit Cost</th>
                  <th className="py-2 text-right font-medium text-gray-600 dark:text-gray-400">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {metrics.map((metric) => {
                  const item = costEstimate.breakdown[metric];
                  if (!item) return null;
                  return (
                    <tr key={metric}>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{METRIC_LABELS[metric]}</td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">{formatNumber(item.quantity)}</td>
                      <td className="py-2 text-right text-gray-500 dark:text-gray-400">{formatCurrency(item.unitCost)}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-client usage table (MSSP orgs) */}
      {isMSSP && usage.clients.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Per-Client Usage</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 text-left font-medium text-gray-600 dark:text-gray-400">Client</th>
                  {metrics.map((m) => (
                    <th key={m} className="py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                      {METRIC_LABELS[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {usage.clients.map((client) => (
                  <tr key={client.clientId}>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">
                      {client.clientName ?? client.clientId}
                    </td>
                    {metrics.map((m) => (
                      <td key={m} className="py-2 text-right text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16">
                            <UsageBar value={client.metrics[m]} max={maxPerMetric[m]} color={METRIC_COLORS[m]} />
                          </div>
                          <span className="w-12 text-right">{formatNumber(client.metrics[m])}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
