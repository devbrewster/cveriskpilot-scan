'use client';

import { useState } from 'react';

interface DemoPortfolioClient {
  clientId: string;
  clientName: string;
  totalFindings: number;
  totalCases: number;
  criticalCount: number;
  highCount: number;
  openCases: number;
  slaBreaches: number;
  riskScore: number;
  trend: 'improving' | 'worsening' | 'stable';
}

const DEMO_PORTFOLIO: DemoPortfolioClient[] = [
  { clientId: 'cl-001', clientName: 'Acme Corporation', totalFindings: 387, totalCases: 132, criticalCount: 8, highCount: 31, openCases: 97, slaBreaches: 3, riskScore: 62, trend: 'improving' },
  { clientId: 'cl-002', clientName: 'Globex Industries', totalFindings: 145, totalCases: 52, criticalCount: 3, highCount: 12, openCases: 38, slaBreaches: 0, riskScore: 34, trend: 'stable' },
  { clientId: 'cl-003', clientName: 'Initech LLC', totalFindings: 55, totalCases: 19, criticalCount: 1, highCount: 4, openCases: 12, slaBreaches: 0, riskScore: 12, trend: 'improving' },
];

const DEMO_TOTALS = {
  totalClients: 3,
  totalFindings: 587,
  totalCases: 203,
  totalCritical: 12,
  totalHigh: 47,
  totalOpenCases: 147,
  totalSlaBreaches: 3,
};

type SortField = 'clientName' | 'riskScore' | 'criticalCount' | 'highCount' | 'openCases' | 'slaBreaches' | 'totalFindings';

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

export default function DemoPortfolioPage() {
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedPortfolio = [...DEMO_PORTFOLIO].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortOrder === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

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
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cross-client vulnerability posture overview for MSSP teams
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated portfolio data across demo clients.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Clients</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{DEMO_TOTALS.totalClients}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Findings</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{DEMO_TOTALS.totalFindings}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Cases</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{DEMO_TOTALS.totalCases}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-red-600">Critical</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{DEMO_TOTALS.totalCritical}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Open Cases</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{DEMO_TOTALS.totalOpenCases}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">SLA Breaches</p>
          <p className={`mt-1 text-2xl font-bold ${DEMO_TOTALS.totalSlaBreaches > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {DEMO_TOTALS.totalSlaBreaches}
          </p>
        </div>
      </div>

      {/* Portfolio table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
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
              <tr key={client.clientId} className="transition-colors hover:bg-blue-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-700">
                      {client.clientName.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{client.clientName}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{client.totalFindings}</td>
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
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">{client.openCases}</td>
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
    </div>
  );
}
