'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SlaCheckResult {
  checkedAt: string;
  totalBreached: number;
  totalApproaching: number;
  breachBySeverity: Record<string, number>;
  approachingBySeverity: Record<string, number>;
  breached: Array<{
    id: string;
    title: string;
    severity: string;
    daysOverdue: number;
  }>;
  approaching: Array<{
    id: string;
    title: string;
    severity: string;
    daysRemaining: number;
  }>;
}

interface SlaWidgetProps {
  organizationId: string;
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  HIGH: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  MEDIUM: { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  LOW: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  INFO: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
};

export function SlaWidget({ organizationId }: SlaWidgetProps) {
  const [data, setData] = useState<SlaCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlaStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sla/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) throw new Error('Failed to check SLA status');
      const result = await res.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SLA data');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSlaStatus();
  }, [fetchSlaStatus]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SLA Status</h3>
        <div className="mt-4 flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SLA Status</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={fetchSlaStatus}
          className="mt-2 text-xs text-primary-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasBreaches = data.totalBreached > 0;
  const hasApproaching = data.totalApproaching > 0;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SLA Status</h3>
        <button
          type="button"
          onClick={fetchSlaStatus}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          title="Refresh"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={`rounded-lg p-4 ${hasBreaches ? 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800' : 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'}`}
        >
          <p className={`text-2xl font-bold ${hasBreaches ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
            {data.totalBreached}
          </p>
          <p className={`text-xs font-medium ${hasBreaches ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            SLA Breaches
          </p>
        </div>
        <div
          className={`rounded-lg p-4 ${hasApproaching ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' : 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'}`}
        >
          <p
            className={`text-2xl font-bold ${hasApproaching ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}
          >
            {data.totalApproaching}
          </p>
          <p
            className={`text-xs font-medium ${hasApproaching ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}
          >
            Approaching
          </p>
        </div>
      </div>

      {/* Breach by Severity */}
      {hasBreaches && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Breaches by Severity
          </p>
          <div className="space-y-1.5">
            {SEVERITY_ORDER.filter((s) => (data.breachBySeverity[s] ?? 0) > 0).map(
              (severity) => {
                const colors = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.INFO;
                const count = data.breachBySeverity[severity] ?? 0;
                return (
                  <Link
                    key={severity}
                    href={`/cases?severity=${severity}&slaBreached=true`}
                    className={`flex items-center justify-between rounded-md px-3 py-2 ${colors.bg} hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                      <span className={`text-sm font-medium ${colors.text}`}>
                        {severity}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>{count}</span>
                  </Link>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Approaching by Severity */}
      {hasApproaching && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Approaching Deadline
          </p>
          <div className="space-y-1.5">
            {SEVERITY_ORDER.filter((s) => (data.approachingBySeverity[s] ?? 0) > 0).map(
              (severity) => {
                const colors = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.INFO;
                const count = data.approachingBySeverity[severity] ?? 0;
                return (
                  <Link
                    key={severity}
                    href={`/cases?severity=${severity}&slaApproaching=true`}
                    className="flex items-center justify-between rounded-md bg-yellow-50 dark:bg-yellow-950 px-3 py-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        {severity}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{count}</span>
                  </Link>
                );
              },
            )}
          </div>
        </div>
      )}

      {!hasBreaches && !hasApproaching && (
        <div className="mt-4 rounded-md bg-green-50 dark:bg-green-950 p-4 text-center">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">All cases within SLA</p>
          <p className="text-xs text-green-600 dark:text-green-400">No breaches or approaching deadlines</p>
        </div>
      )}
    </div>
  );
}
