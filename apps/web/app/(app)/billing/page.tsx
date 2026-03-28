'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UsageDashboard } from '@/components/billing/usage-dashboard';
import { TierComparison } from '@/components/billing/tier-comparison';

const TIER_BADGE_STYLES: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  FOUNDERS_BETA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PRO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ENTERPRISE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  MSSP: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function BillingPage() {
  const { organizationId, tier, loaded } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleManageSubscription() {
    try {
      setPortalLoading(true);
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to open billing portal');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      // Fallback: alert the user if the portal request fails
      alert('Unable to open the billing portal. Please try again later.');
    } finally {
      setPortalLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const currentTier = tier ?? 'FREE';
  const badgeStyle = TIER_BADGE_STYLES[currentTier] ?? TIER_BADGE_STYLES.FREE;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Billing &amp; Usage
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
            >
              {currentTier.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor your plan usage, review costs, and manage your subscription.
          </p>
        </div>
        <button
          type="button"
          onClick={handleManageSubscription}
          disabled={portalLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {portalLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Opening...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                />
              </svg>
              Manage Subscription
            </>
          )}
        </button>
      </div>

      {/* Usage dashboard */}
      {organizationId && (
        <UsageDashboard organizationId={organizationId} />
      )}

      {/* Tier comparison / upgrade plans */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Compare Plans
        </h2>
        <TierComparison />
      </div>
    </div>
  );
}
