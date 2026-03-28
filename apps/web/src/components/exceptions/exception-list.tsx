'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface RiskExceptionItem {
  id: string;
  type: string;
  reason: string;
  vexRationale: string | null;
  expiresAt: string | null;
  evidence: Record<string, unknown> | null;
  createdAt: string;
  derivedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  vulnerabilityCase: {
    id: string;
    title: string;
    severity: string;
    status: string;
    cveIds: string[];
  };
  decidedBy: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string; email: string } | null;
}

interface ExceptionListProps {
  organizationId: string;
  currentUserId: string;
  currentUserRole: string;
  /** Optional initial filter status to apply on mount */
  initialFilter?: FilterStatus;
  /** If true, hide the built-in filter tabs (useful when parent controls filtering) */
  hideFilterTabs?: boolean;
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-blue-100 text-blue-800',
  INFO: 'bg-gray-100 text-gray-600',
};

const TYPE_LABELS: Record<string, string> = {
  ACCEPTED_RISK: 'Accepted Risk',
  FALSE_POSITIVE: 'False Positive',
  NOT_APPLICABLE: 'Not Applicable',
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const className = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.INFO;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {severity}
    </span>
  );
}

export function ExceptionList({
  organizationId,
  currentUserId,
  currentUserRole,
  initialFilter = 'ALL',
  hideFilterTabs = false,
}: ExceptionListProps) {
  const [exceptions, setExceptions] = useState<RiskExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>(initialFilter);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = ['ORG_OWNER', 'SECURITY_ADMIN', 'PLATFORM_ADMIN'].includes(currentUserRole);

  const fetchExceptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        organizationId,
        page: String(page),
        limit: '25',
      });
      if (filter !== 'ALL') {
        params.set('status', filter);
      }

      const res = await fetch(`/api/exceptions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load exceptions');
      const data = await res.json();
      setExceptions(data.exceptions);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  }, [organizationId, filter, page]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const handleAction = async (exceptionId: string, action: 'approve' | 'reject') => {
    setActionLoading(exceptionId);
    setError(null);

    try {
      // Get the requested days from the exception evidence
      const exception = exceptions.find((e) => e.id === exceptionId);
      const requestedDays = (exception?.evidence as Record<string, unknown>)?.requestedDays;

      const res = await fetch(`/api/exceptions/${exceptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approvedById: currentUserId,
          durationDays: action === 'approve' ? (requestedDays ?? 90) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to ${action} exception`);
      }

      await fetchExceptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const FILTER_TABS: { value: FilterStatus; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'EXPIRED', label: 'Expired' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Risk Exceptions</h2>
      </div>

      {/* Filter Tabs */}
      {!hideFilterTabs && (
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-white dark:bg-gray-900 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading exceptions...</div>
      ) : exceptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {filter !== 'ALL' ? 'No matching exceptions' : 'No risk exceptions yet'}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {filter !== 'ALL'
              ? 'No exceptions match the current filter. Try viewing all exceptions instead.'
              : 'Risk exceptions will appear here when findings are marked as accepted risk, false positive, or not applicable from a case.'}
          </p>
          {filter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              View all exceptions
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Case
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Requested By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={ex.vulnerabilityCase.severity} />
                        <Link
                          href={`/cases/${ex.vulnerabilityCase.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 truncate max-w-xs"
                        >
                          {ex.vulnerabilityCase.title}
                        </Link>
                      </div>
                      {ex.vulnerabilityCase.cveIds.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-400 font-mono">
                          {ex.vulnerabilityCase.cveIds.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {TYPE_LABELS[ex.type] ?? ex.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ex.derivedStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{ex.decidedBy.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {ex.expiresAt
                          ? new Date(ex.expiresAt).toLocaleDateString()
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {new Date(ex.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {ex.derivedStatus === 'PENDING' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={actionLoading === ex.id}
                              onClick={() => handleAction(ex.id, 'approve')}
                              className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading === ex.id ? '...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === ex.id}
                              onClick={() => handleAction(ex.id, 'reject')}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {actionLoading === ex.id ? '...' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
