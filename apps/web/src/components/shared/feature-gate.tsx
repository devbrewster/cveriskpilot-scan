'use client';

import type {
  FeatureFlag} from '@/lib/feature-flags';
import {
  isFeatureEnabled,
  FEATURE_LABELS,
  FEATURE_MIN_TIER,
  type Tier,
} from '@/lib/feature-flags';
import { useAuth } from '@/lib/auth-context';

interface FeatureGateProps {
  flag: FeatureFlag;
  /** Organization tier (defaults to FREE for demo) */
  tier?: Tier;
  /** Organization entitlements JSON override */
  entitlements?: { enabledFeatures?: string[]; disabledFeatures?: string[] } | null;
  /** Content to show when feature is enabled */
  children: React.ReactNode;
  /** Optional custom fallback (defaults to upgrade prompt) */
  fallback?: React.ReactNode;
}

export function FeatureGate({
  flag,
  tier = 'FREE',
  entitlements = null,
  children,
  fallback,
}: FeatureGateProps) {
  const { email } = useAuth();
  const enabled = isFeatureEnabled(tier, flag, entitlements, email);

  if (enabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  const minTier = FEATURE_MIN_TIER[flag];
  const label = FEATURE_LABELS[flag];

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
        <svg
          className="h-6 w-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
      <p className="mt-1 text-sm text-gray-500">
        This feature requires the <span className="font-medium text-blue-700">{minTier}</span> plan or higher.
      </p>
      <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        Upgrade to {minTier}
      </button>
    </div>
  );
}
