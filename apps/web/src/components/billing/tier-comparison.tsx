'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ---------------------------------------------------------------------------
// Tier data (mirrored from packages/billing/src/config.ts for client use)
// ---------------------------------------------------------------------------

interface PlanInfo {
  name: string;
  tier: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  limits: { users: string; assets: string; uploads: string; aiCalls: string };
  highlighted?: boolean;
  badge?: string;
  cta: string;
  ctaHref: string;
}

const PLANS: PlanInfo[] = [
  {
    name: 'Free',
    tier: 'FREE',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Unlimited CLI scans with full compliance mapping.',
    limits: { users: '1', assets: '50', uploads: '3/mo', aiCalls: '50/mo' },
    features: ['API access', '6 compliance frameworks', 'Community support'],
    cta: 'Get Started Free',
    ctaHref: '/signup?plan=free',
  },
  {
    name: 'Founders Beta',
    tier: 'FOUNDERS_BETA',
    monthlyPrice: 29,
    annualPrice: 278,
    description: 'Everything in Pro — locked at early adopter pricing forever.',
    limits: { users: '5', assets: '250', uploads: 'Unlimited', aiCalls: '250/mo' },
    features: [
      'All Pro features',
      'Price locked forever',
      'Email support',
    ],
    badge: 'Limited',
    cta: 'Lock In $29/mo Forever',
    ctaHref: '/signup?plan=founders_beta',
  },
  {
    name: 'Pro',
    tier: 'PRO',
    monthlyPrice: 149,
    annualPrice: 1428,
    description: 'Full compliance automation for teams preparing for SOC 2 or CMMC.',
    limits: { users: '10', assets: '1,000', uploads: 'Unlimited', aiCalls: '1,000/mo' },
    features: [
      'API access',
      'Jira & ServiceNow sync',
      'Custom SLA policies',
      'Webhooks',
      'POAM auto-generation',
      'Executive PDF reports',
      'Priority support',
    ],
    highlighted: true,
    badge: 'Most Popular',
    cta: 'Start 14-Day Trial',
    ctaHref: '/signup?plan=pro',
  },
  {
    name: 'Enterprise',
    tier: 'ENTERPRISE',
    monthlyPrice: -1,
    annualPrice: -1,
    description: 'Enterprise compliance automation with SSO, SCIM, and custom policies.',
    limits: { users: 'Unlimited', assets: 'Unlimited', uploads: 'Unlimited', aiCalls: 'Unlimited' },
    features: [
      'Everything in Pro',
      'SSO / SAML / OIDC',
      'SCIM provisioning',
      'ABAC policies & custom roles',
      'Dedicated account manager',
      '99.9% SLA',
    ],
    cta: 'Talk to Sales',
    ctaHref: 'mailto:sales@cveriskpilot.com?subject=Enterprise%20Plan',
  },
  {
    name: 'MSSP',
    tier: 'MSSP',
    monthlyPrice: -1,
    annualPrice: -1,
    description: 'Multi-tenant compliance platform for managed security providers.',
    limits: { users: 'Unlimited', assets: 'Unlimited', uploads: 'Unlimited', aiCalls: 'Unlimited' },
    features: [
      'Everything in Enterprise',
      'White-label branding',
      'Multi-tenant isolation',
      'Per-client usage metering',
      'Usage-based billing API',
      'Custom SLAs',
    ],
    badge: 'For MSSPs',
    cta: 'Talk to Sales',
    ctaHref: 'mailto:sales@cveriskpilot.com?subject=MSSP%20Plan',
  },
];

const FEATURE_MATRIX = [
  { name: 'Users', free: '1', founders: '5', pro: '10', enterprise: 'Unlimited', mssp: 'Unlimited' },
  { name: 'Assets', free: '50', founders: '250', pro: '1,000', enterprise: 'Unlimited', mssp: 'Unlimited' },
  { name: 'Monthly uploads', free: '3', founders: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited', mssp: 'Unlimited' },
  { name: 'AI triage & remediation calls', free: '50/mo', founders: '250/mo', pro: '1,000/mo', enterprise: 'Unlimited', mssp: 'Unlimited' },
  { name: 'API access', free: true, founders: true, pro: true, enterprise: true, mssp: true },
  { name: 'Jira integration', free: false, founders: true, pro: true, enterprise: true, mssp: true },
  { name: 'Custom SLA policies', free: false, founders: true, pro: true, enterprise: true, mssp: true },
  { name: 'Webhooks', free: false, founders: true, pro: true, enterprise: true, mssp: true },
  { name: 'Portfolio dashboard', free: false, founders: false, pro: true, enterprise: true, mssp: true },
  { name: 'Scheduled reports', free: false, founders: false, pro: true, enterprise: true, mssp: true },
  { name: 'SSO / SAML', free: false, founders: false, pro: false, enterprise: true, mssp: true },
  { name: 'Custom parsers', free: false, founders: false, pro: false, enterprise: 'Soon', mssp: 'Soon' },
  { name: 'Multi-client management', free: false, founders: false, pro: false, enterprise: true, mssp: true },
  { name: 'White-label branding', free: false, founders: false, pro: false, enterprise: false, mssp: true },
  { name: 'Per-client usage metering', free: false, founders: false, pro: false, enterprise: false, mssp: true },
  { name: 'Priority support', free: false, founders: false, pro: true, enterprise: true, mssp: true },
  { name: 'Dedicated support', free: false, founders: false, pro: false, enterprise: true, mssp: true },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function formatPrice(monthly: number, annual: number, isAnnual: boolean): string {
  if (monthly < 0) return 'Custom';
  if (monthly === 0) return '$0';
  if (isAnnual) {
    const perMonth = Math.round(annual / 12);
    return `$${perMonth}`;
  }
  return `$${monthly}`;
}

export function TierComparison() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const router = useRouter();

  const handleUpgrade = useCallback(async (tier: string) => {
    setUpgrading(tier);
    try {
      // Fetch CSRF token from session endpoint
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      const csrfToken = sessionData?.csrfToken ?? '';

      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          targetTier: tier,
          billingInterval: isAnnual ? 'annual' : 'monthly',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to process upgrade. Please try again.');
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        // Tier upgraded directly (subscription swap)
        router.refresh();
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setUpgrading(null);
    }
  }, [isAnnual, router]);

  return (
    <div className="space-y-12">
      {/* Annual toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAnnual}
          onClick={() => setIsAnnual(!isAnnual)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            isAnnual ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition duration-200 ease-in-out ${
              isAnnual ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          Annual
        </span>
        {isAnnual && (
          <span className="ml-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Save 20%
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 lg:grid-cols-5">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.highlighted
                ? 'border-primary-500 shadow-xl ring-1 ring-primary-500 dark:border-primary-400 dark:ring-primary-400'
                : 'border-gray-200 shadow-sm dark:border-gray-800'
            } bg-white dark:bg-gray-900`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-0.5 text-xs font-semibold text-white">
                {plan.badge}
              </div>
            )}

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>

            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPrice(plan.monthlyPrice, plan.annualPrice, isAnnual)}
              </span>
              {plan.monthlyPrice >= 0 && plan.monthlyPrice > 0 && (
                <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">/mo</span>
              )}
            </div>
            {isAnnual && plan.monthlyPrice > 0 && (
              <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-400">
                ${plan.annualPrice}/yr billed annually
              </p>
            )}
            {plan.monthlyPrice < 0 && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Tailored to your organization
              </p>
            )}

            <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Users</span><span className="font-medium">{plan.limits.users}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Assets</span><span className="font-medium">{plan.limits.assets}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Uploads</span><span className="font-medium">{plan.limits.uploads}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>AI calls</span><span className="font-medium">{plan.limits.aiCalls}</span>
              </div>
            </div>

            <ul className="mt-4 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckIcon />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={upgrading === plan.tier}
              onClick={() => handleUpgrade(plan.tier)}
              className={`mt-auto block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                plan.highlighted
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {upgrading === plan.tier ? 'Processing...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Feature matrix table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-3 pr-6 text-left font-medium text-gray-900 dark:text-white">Feature</th>
              {PLANS.map((plan) => (
                <th key={plan.tier} className="px-4 py-3 text-center font-medium text-gray-900 dark:text-white">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {FEATURE_MATRIX.map((row) => (
              <tr key={row.name}>
                <td className="py-2.5 pr-6 text-gray-700 dark:text-gray-300">{row.name}</td>
                {(['free', 'founders', 'pro', 'enterprise', 'mssp'] as const).map((key) => {
                  const val = row[key];
                  return (
                    <td key={key} className="px-4 py-2.5 text-center">
                      {typeof val === 'boolean' ? (
                        val ? <span className="inline-flex justify-center"><CheckIcon /></span> : <span className="inline-flex justify-center"><XIcon /></span>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">{val}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
