'use client';

import { useState, useEffect, useCallback } from 'react';

interface UsageData {
  uploads: number;
  aiCalls: number;
  assets: number;
  teamMembers: number;
}

interface OrgProfileProps {
  organizationId: string;
  tier: string;
}

const TIER_BADGE_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-800 border-gray-200',
  FOUNDERS_BETA: 'bg-green-100 text-green-800 border-green-200',
  PRO: 'bg-blue-100 text-blue-800 border-blue-200',
  ENTERPRISE: 'bg-purple-100 text-purple-800 border-purple-200',
  MSSP: 'bg-pink-100 text-pink-800 border-pink-200',
};

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  FOUNDERS_BETA: 'Founders Beta',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
  MSSP: 'MSSP',
};

const TIER_FEATURES: Record<string, string[]> = {
  FREE: [
    'Up to 3 scan uploads per month',
    '50 AI-powered triage calls',
    'Basic dashboard and findings view',
    'Community support',
  ],
  FOUNDERS_BETA: [
    'Unlimited scan uploads',
    '500 AI-powered triage calls',
    'Full dashboard, cases, and reporting',
    'Priority email support',
  ],
  PRO: [
    'Unlimited scan uploads',
    '500 AI-powered triage calls per month',
    'POAM generation and compliance mapping',
    'Up to 10 team members',
  ],
  ENTERPRISE: [
    'Unlimited scan uploads',
    '5,000 AI-powered triage calls per month',
    'SSO (SAML/OIDC), RBAC, and audit logging',
    'Up to 50 team members with role-based access',
  ],
  MSSP: [
    'Unlimited everything — uploads, AI, assets, users',
    'Multi-tenant client management',
    'White-label branding and custom domains',
    'Dedicated support and SLA guarantees',
  ],
};

interface TierLimits {
  uploads: number | null;
  aiCalls: number | null;
  assets: number | null;
  teamMembers: number | null;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  FREE: { uploads: 3, aiCalls: 50, assets: 50, teamMembers: 1 },
  FOUNDERS_BETA: { uploads: null, aiCalls: 500, assets: 500, teamMembers: 10 },
  PRO: { uploads: null, aiCalls: 500, assets: 500, teamMembers: 10 },
  ENTERPRISE: { uploads: null, aiCalls: 5000, assets: null, teamMembers: 50 },
  MSSP: { uploads: null, aiCalls: null, assets: null, teamMembers: null },
};

const SHOW_UPGRADE_TIERS = new Set(['FREE', 'PRO']);

function UsageStatCard({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number | null;
}) {
  const limitLabel = limit === null ? 'Unlimited' : String(limit);
  const percentage = limit === null ? 0 : limit === 0 ? 100 : Math.min((current / limit) * 100, 100);
  const barColor =
    limit === null
      ? 'bg-green-500'
      : percentage >= 90
        ? 'bg-red-500'
        : percentage >= 70
          ? 'bg-yellow-500'
          : 'bg-primary-500';

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">
        {current} <span className="text-sm font-normal text-gray-400">/ {limitLabel}</span>
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full transition-all ${barColor}`}
          style={{ width: limit === null ? '15%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function OrgProfile({ organizationId, tier }: OrgProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [slug, setSlug] = useState('');

  const [usage, setUsage] = useState<UsageData>({
    uploads: 0,
    aiCalls: 0,
    assets: 0,
    teamMembers: 0,
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/settings/org-profile?organizationId=${organizationId}`);
      if (!res.ok) throw new Error('Failed to load organization profile');
      const data = await res.json();
      setOrgName(data.name ?? '');
      setContactEmail(data.contactEmail ?? '');
      setSlug(data.slug ?? organizationId);
      if (data.usage) {
        setUsage(data.usage);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/settings/org-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: orgName,
          contactEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save changes');
      }

      setSuccess('Organization profile updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const tierBadgeColor = TIER_BADGE_COLORS[tier] ?? TIER_BADGE_COLORS.FREE;
  const tierLabel = TIER_LABELS[tier] ?? tier;
  const tierFeatures = TIER_FEATURES[tier] ?? TIER_FEATURES.FREE;
  const limits = TIER_LIMITS[tier] ?? TIER_LIMITS.FREE;

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Loading organization profile...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Organization Details */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>
          <p className="text-sm text-gray-500">
            Manage your organization name, contact information, and branding.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-1 text-xs text-red-600 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 space-y-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label htmlFor="org-slug" className="block text-sm font-medium text-gray-700">
                Organization ID
              </label>
              <input
                id="org-slug"
                type="text"
                readOnly
                value={slug}
                className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="org-email" className="block text-sm font-medium text-gray-700">
                Primary Contact Email
              </label>
              <input
                id="org-email"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Logo</label>
              <div className="mt-1 flex items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6">
                <div className="text-center">
                  <svg
                    className="mx-auto h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                    />
                  </svg>
                  <p className="mt-1 text-xs text-gray-500">Drag &amp; drop or click to upload</p>
                  <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Current Plan */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
          <p className="text-sm text-gray-500">
            Your subscription tier and included features.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${tierBadgeColor}`}
            >
              {tierLabel}
            </span>
          </div>

          <ul className="space-y-2">
            {tierFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 pt-2">
            <a
              href="/api/billing/portal"
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Manage Billing
            </a>
            {SHOW_UPGRADE_TIERS.has(tier) && (
              <a
                href="/pricing"
                className="rounded-md border border-primary-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
              >
                Upgrade Plan
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Usage This Month */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Usage This Month</h2>
          <p className="text-sm text-gray-500">
            Current consumption against your plan limits.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UsageStatCard label="Uploads" current={usage.uploads} limit={limits.uploads} />
          <UsageStatCard label="AI Calls" current={usage.aiCalls} limit={limits.aiCalls} />
          <UsageStatCard label="Assets Tracked" current={usage.assets} limit={limits.assets} />
          <UsageStatCard
            label="Team Members"
            current={usage.teamMembers}
            limit={limits.teamMembers}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
        </div>

        <div className="rounded-lg border-2 border-red-200 bg-red-50/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Delete Organization</h3>
              <p className="mt-1 text-xs text-gray-500">
                Permanently remove this organization and all associated data. This action cannot be
                undone.
              </p>
            </div>
            <div className="relative group">
              <button
                type="button"
                disabled
                className="rounded-md border border-red-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-red-600 opacity-50 cursor-not-allowed"
              >
                Delete Organization
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden w-48 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                Contact support to delete your organization.
                <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
