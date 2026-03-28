'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { StatCard } from '@/components/ui/stat-card';
import { ExceptionList } from '@/components/exceptions/exception-list';

export const dynamic = 'force-dynamic';

type TabValue = 'ALL' | 'PENDING' | 'EXPIRING_SOON';

interface ExceptionSummary {
  total: number;
  pending: number;
  expiringSoon: number;
}

export default function RiskExceptionsPage() {
  const { userId, organizationId, role, loaded, authenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('ALL');
  const [summary, setSummary] = useState<ExceptionSummary>({
    total: 0,
    pending: 0,
    expiringSoon: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!organizationId) return;

    setSummaryLoading(true);
    try {
      // Fetch all exceptions to compute summary stats
      const res = await fetch(
        `/api/exceptions?organizationId=${organizationId}&limit=100`,
      );
      if (!res.ok) throw new Error('Failed to load summary');
      const data = await res.json();

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      let pending = 0;
      let expiringSoon = 0;

      for (const ex of data.exceptions) {
        if (ex.derivedStatus === 'PENDING') {
          pending++;
        }
        if (
          ex.derivedStatus === 'APPROVED' &&
          ex.expiresAt &&
          new Date(ex.expiresAt) <= thirtyDaysFromNow &&
          new Date(ex.expiresAt) > now
        ) {
          expiringSoon++;
        }
      }

      setSummary({
        total: data.total,
        pending,
        expiringSoon,
      });
    } catch {
      // Silently fail; stats will show 0
    } finally {
      setSummaryLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const TABS: { value: TabValue; label: string }[] = [
    { value: 'ALL', label: 'All Exceptions' },
    { value: 'PENDING', label: 'Pending Approval' },
    { value: 'EXPIRING_SOON', label: 'Expiring Soon' },
  ];

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!authenticated || !userId || !organizationId || !role) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-red-600">
          You must be signed in to view risk exceptions.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Risk Exceptions
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage accepted risks, false positives, and exception approvals
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Exceptions"
          value={summaryLoading ? '...' : summary.total}
        />
        <StatCard
          label="Pending Approval"
          value={summaryLoading ? '...' : summary.pending}
          accent={summary.pending > 0 ? 'text-yellow-700' : undefined}
        />
        <StatCard
          label="Expiring Within 30 Days"
          value={summaryLoading ? '...' : summary.expiringSoon}
          accent={summary.expiringSoon > 0 ? 'text-orange-700' : undefined}
        />
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Exception tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.value === 'PENDING' && summary.pending > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                  {summary.pending}
                </span>
              )}
              {tab.value === 'EXPIRING_SOON' && summary.expiringSoon > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                  {summary.expiringSoon}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'ALL' && (
        <ExceptionList
          organizationId={organizationId}
          currentUserId={userId}
          currentUserRole={role}
        />
      )}

      {activeTab === 'PENDING' && (
        <ExceptionList
          organizationId={organizationId}
          currentUserId={userId}
          currentUserRole={role}
          initialFilter="PENDING"
          hideFilterTabs
          key="pending-filter"
        />
      )}

      {activeTab === 'EXPIRING_SOON' && (
        <ExceptionList
          organizationId={organizationId}
          currentUserId={userId}
          currentUserRole={role}
          initialFilter="EXPIRED"
          hideFilterTabs
          key="expiring-filter"
        />
      )}
    </div>
  );
}
