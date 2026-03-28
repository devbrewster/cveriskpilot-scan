'use client';

import { useState, useEffect, useCallback } from 'react';
import { useClientContext } from '@/lib/client-context';
import { useAuth } from '@/lib/auth-context';

interface PortfolioClient {
  clientId: string;
  clientName: string;
  clientSlug: string;
  totalFindings: number;
  totalCases: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  openCases: number;
  slaBreaches: number;
  riskScore: number;
  trend: 'improving' | 'worsening' | 'stable';
}

interface PortfolioTotals {
  totalClients: number;
  totalFindings: number;
  totalCases: number;
  totalCritical: number;
  totalHigh: number;
  totalOpenCases: number;
  totalSlaBreaches: number;
}

type SortField = 'clientName' | 'riskScore' | 'criticalCount' | 'highCount' | 'openCases' | 'slaBreaches' | 'totalFindings';

export function PortfolioDashboard() {
  const { setActiveClient } = useClientContext();
  const { organizationId } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioClient[]>([]);
  const [totals, setTotals] = useState<PortfolioTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio?organizationId=${organizationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setPortfolio(data.portfolio || []);
      setTotals(data.totals || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedPortfolio = [...portfolio].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const handleClientClick = (client: PortfolioClient) => {
    setActiveClient(client.clientId, client.clientName);
    window.location.href = '/dashboard';
  };

  function getRiskColor(score: number) {
    if (score >= 50) return 'text-red-700 bg-red-50';
    if (score >= 20) return 'text-orange-700 bg-orange-50';
    if (score >= 5) return 'text-yellow-700 bg-yellow-50';
    return 'text-green-700 bg-green-50';
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case 'improving':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898" />
          </svg>
        );
      case 'worsening':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
          </svg>
        );
    }
  }

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const isActive = sortField === field;
    return (
      <th
        className="cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {isActive && (
            <svg
              className={`h-3 w-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Total Clients</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.totalClients}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Total Findings</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.totalFindings}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Total Cases</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.totalCases}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-red-600">Critical</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{totals.totalCritical}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Open Cases</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totals.totalOpenCases}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">SLA Breaches</p>
            <p className={`mt-1 text-2xl font-bold ${totals.totalSlaBreaches > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {totals.totalSlaBreaches}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {/* Empty */}
      {!loading && portfolio.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <h3 className="text-sm font-semibold text-gray-900">No clients in portfolio</h3>
          <p className="mt-1 text-sm text-gray-500">Create clients to see portfolio metrics.</p>
        </div>
      )}

      {/* Portfolio table */}
      {!loading && portfolio.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:bg-gray-900 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  onClick={() => handleSort('clientName')}
                >
                  <span className="inline-flex items-center gap-1">
                    Client
                    {sortField === 'clientName' && (
                      <svg className={`h-3 w-3 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </span>
                </th>
                <SortHeader field="totalFindings" label="Findings" />
                <SortHeader field="criticalCount" label="Critical" />
                <SortHeader field="highCount" label="High" />
                <SortHeader field="openCases" label="Open Cases" />
                <SortHeader field="slaBreaches" label="SLA Breaches" />
                <SortHeader field="riskScore" label="Risk Score" />
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPortfolio.map((client) => (
                <tr
                  key={client.clientId}
                  className="cursor-pointer transition-colors hover:bg-blue-50"
                  onClick={() => handleClientClick(client)}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-700">
                        {client.clientName.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{client.clientName}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                    {client.totalFindings}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${client.criticalCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                      {client.criticalCount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${client.highCount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
                      {client.highCount}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                    {client.openCases}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${client.slaBreaches > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {client.slaBreaches}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRiskColor(client.riskScore)}`}>
                      {client.riskScore}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {getTrendIcon(client.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
