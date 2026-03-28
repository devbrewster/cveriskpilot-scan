'use client';

import { useState, useMemo } from 'react';
import { demoRiskExceptions } from '@/lib/demo-data';
import { SeverityBadge } from '@/components/ui/badges';

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

type TabValue = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
];

const TYPE_COLORS: Record<string, string> = {
  ACCEPTED_RISK: 'bg-amber-100 text-amber-800',
  FALSE_POSITIVE: 'bg-blue-100 text-blue-800',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-700',
};

const TYPE_LABELS: Record<string, string> = {
  ACCEPTED_RISK: 'Accepted Risk',
  FALSE_POSITIVE: 'False Positive',
  NOT_APPLICABLE: 'Not Applicable',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-700',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

function isExpiringWithin30Days(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const now = new Date();
  const expires = new Date(expiresAt);
  if (expires <= now) return false;
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function DemoRiskExceptionsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('ALL');

  const filteredExceptions = useMemo(() => {
    if (activeTab === 'ALL') return demoRiskExceptions;
    return demoRiskExceptions.filter((e) => e.derivedStatus === activeTab);
  }, [activeTab]);

  // Stat counts
  const totalCount = demoRiskExceptions.length;
  const pendingCount = demoRiskExceptions.filter((e) => e.derivedStatus === 'PENDING').length;
  const expiringCount = demoRiskExceptions.filter(
    (e) => e.derivedStatus === 'APPROVED' && isExpiringWithin30Days(e.expiresAt),
  ).length;

  // Tab counts
  const tabCounts: Record<TabValue, number> = {
    ALL: totalCount,
    PENDING: pendingCount,
    APPROVED: demoRiskExceptions.filter((e) => e.derivedStatus === 'APPROVED').length,
    REJECTED: demoRiskExceptions.filter((e) => e.derivedStatus === 'REJECTED').length,
    EXPIRED: demoRiskExceptions.filter((e) => e.derivedStatus === 'EXPIRED').length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Exceptions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage accepted risks, false positives, and not-applicable exceptions across your vulnerability cases
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Viewing demo risk exceptions. Data shown is simulated.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Exceptions</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Pending Approval</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Expiring Within 30 Days</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">{expiringCount}</p>
        </div>
      </div>

      {/* Tab filter bar */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                activeTab === tab.value
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tabCounts[tab.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Case</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requested By</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expires</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Approved By</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredExceptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-500">No exceptions match the current filter.</p>
                    <p className="text-xs text-gray-400">Try selecting a different status tab.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExceptions.map((exc) => (
                <tr key={exc.id} className="transition-colors hover:bg-gray-50">
                  {/* Case */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <SeverityBadge severity={exc.vulnerabilityCase.severity} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {exc.vulnerabilityCase.title}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {exc.vulnerabilityCase.cveIds.map((cve) => (
                            <span key={cve} className="font-mono text-xs text-blue-600">
                              {cve}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Type */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[exc.type]}`}>
                      {TYPE_LABELS[exc.type]}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[exc.derivedStatus]}`}>
                      {exc.derivedStatus}
                    </span>
                  </td>
                  {/* Requested By */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {exc.requestedBy.name}
                  </td>
                  {/* Expires */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {exc.expiresAt ? formatDate(exc.expiresAt) : '\u2014'}
                  </td>
                  {/* Approved By */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {exc.approvedBy ? exc.approvedBy.name : '\u2014'}
                  </td>
                  {/* Created */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDate(exc.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
