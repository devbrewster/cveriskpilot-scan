'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FoundersSpots {
  total: number;
  taken: number;
  remaining: number;
}

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Unlimited CLI scans with full compliance mapping. No account needed.',
    features: [
      'Unlimited local CLI scans',
      '6 compliance frameworks',
      '3 dashboard uploads per month',
      'Auto-triage (TP / FP / Review)',
      '50 AI remediation calls',
      '50 assets',
      'JSON, SARIF, Markdown output',
      'Community support',
    ],
    cta: 'Get Started Free',
    ctaHref: '/signup?plan=free',
    planKey: 'free',
    highlighted: false,
  },
  {
    name: 'Founders Beta',
    monthlyPrice: 29,
    annualPrice: 278,
    description: 'Everything in Pro — locked at early adopter pricing forever. Only 50 spots.',
    features: [
      'Everything in Pro',
      'Price locked forever',
      '5 users, 250 assets',
      'Unlimited uploads',
      '100 PR comments per month',
      '250 AI triage calls',
      'Email support',
    ],
    cta: 'Lock In $29/mo Forever',
    ctaHref: '/signup?plan=founders_beta',
    planKey: 'founders_beta',
    highlighted: false,
    badge: 'Limited',
  },
  {
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1428,
    description: 'Full compliance automation for teams preparing for SOC 2 or CMMC.',
    features: [
      '10 users, 1,000 assets',
      'Unlimited uploads & PR comments',
      '1,000 AI triage & remediation calls',
      'POAM auto-generation',
      'Executive PDF reports',
      'Jira & ServiceNow sync',
      'Scan-over-scan trend analysis',
      'SLA policy engine',
      'Priority support',
    ],
    cta: 'Start 14-Day Trial',
    ctaHref: '/signup?plan=pro',
    planKey: 'pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: -1,
    annualPrice: -1,
    description: 'For organizations with SSO, SCIM, and advanced compliance requirements.',
    features: [
      'Unlimited users & assets',
      'SSO / SAML / OIDC',
      'SCIM provisioning',
      'ABAC policies & custom roles',
      'Unlimited AI calls',
      'Custom parser formats',
      'Audit log exports',
      'Dedicated account manager',
      '99.9% SLA',
    ],
    cta: 'Talk to Sales',
    ctaHref: 'mailto:sales@cveriskpilot.com?subject=Enterprise%20Plan',
    highlighted: false,
  },
  {
    name: 'MSSP',
    monthlyPrice: -1,
    annualPrice: -1,
    description: 'Multi-tenant compliance platform for managed security providers.',
    features: [
      'Everything in Enterprise',
      'White-label branding',
      'Multi-tenant isolation',
      'Per-client usage metering',
      'Bulk tenant onboarding',
      'Usage-based billing API',
      'Full REST API access',
      'Dedicated support channel',
      'Custom SLAs',
    ],
    cta: 'Talk to Sales',
    ctaHref: 'mailto:sales@cveriskpilot.com?subject=MSSP%20Plan',
    highlighted: false,
    badge: 'For MSSPs',
  },
];

function formatPrice(monthly: number, annual: number, isAnnual: boolean): string {
  if (monthly < 0) return 'Custom';
  if (monthly === 0) return '$0';
  if (isAnnual) return `$${Math.round(annual / 12)}`;
  return `$${monthly}`;
}

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [foundersSpots, setFoundersSpots] = useState<FoundersSpots | null>(null);

  useEffect(() => {
    fetch('/api/billing/founders-spots')
      .then((res) => res.json())
      .then((data: FoundersSpots) => setFoundersSpots(data))
      .catch(() => { /* silently fail */ });
  }, []);

  return (
    <section id="pricing" className="bg-white dark:bg-gray-950 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Compliance automation at every scale
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            CLI scans are free forever. Full platform starts at $149/month — a fraction of what legacy compliance tools charge.
          </p>
        </div>

        {/* Annual toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
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
          <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            Annual
          </span>
          <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity ${isAnnual ? 'bg-green-100 text-green-700 opacity-100 dark:bg-green-900/30 dark:text-green-400' : 'bg-green-100/60 text-green-600/80 opacity-100 dark:bg-green-900/20 dark:text-green-400/60'}`}>
            Save 20%
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-shadow duration-200 ${
                plan.highlighted
                  ? 'border-primary-500 bg-white shadow-xl shadow-primary-100/50 ring-1 ring-primary-500 dark:border-primary-400 dark:bg-gray-900 dark:shadow-primary-900/20 dark:ring-primary-400'
                  : 'border-gray-200 bg-white shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-gray-900/30'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                  Most Popular
                </div>
              )}
              {'badge' in plan && plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gray-800 px-4 py-1 text-xs font-semibold text-white dark:bg-gray-600">
                  {plan.badge}
                </div>
              )}

              {/* --- Row 1: Name + badge (fixed height) --- */}
              <div className="min-h-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
              </div>

              {/* --- Row 2: Spots indicator (fixed height) --- */}
              <div className="min-h-7">
                {plan.planKey === 'founders_beta' && foundersSpots && foundersSpots.remaining > 0 && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    foundersSpots.remaining < 10
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${foundersSpots.remaining < 10 ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${foundersSpots.remaining < 10 ? 'bg-red-600' : 'bg-amber-600'}`} />
                    </span>
                    Only {foundersSpots.remaining} spots left
                  </span>
                )}
                {plan.planKey === 'founders_beta' && foundersSpots && foundersSpots.remaining === 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Sold Out
                  </span>
                )}
              </div>

              {/* --- Row 3: Description (fixed height for alignment) --- */}
              <p className="min-h-14 text-sm text-gray-500 dark:text-gray-400">
                {plan.description}
              </p>

              {/* --- Row 4: Price (fixed height) --- */}
              <div className="mt-4 min-h-16">
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                    {formatPrice(plan.monthlyPrice, plan.annualPrice, isAnnual)}
                  </span>
                  {plan.monthlyPrice >= 0 && (
                    <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                      /month
                    </span>
                  )}
                </div>
                {isAnnual && plan.monthlyPrice > 0 && (
                  <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                    ${plan.annualPrice}/yr billed annually
                  </p>
                )}
                {plan.monthlyPrice < 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Tailored to your organization
                  </p>
                )}
              </div>

              {/* --- Row 5: Features (flex-1 pushes CTA to bottom) --- */}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400"
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

              {plan.planKey === 'founders_beta' && foundersSpots && foundersSpots.remaining === 0 ? (
                <span className="mt-6 block w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 py-2.5 text-center text-sm font-semibold text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                  Sold Out
                </span>
              ) : (
                <Link
                  href={'planKey' in plan && plan.planKey && isAnnual
                    ? `${plan.ctaHref}&billing=annual`
                    : plan.ctaHref}
                  className={`mt-6 block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                    plan.highlighted
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25'
                      : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* CLI / Pipeline Scanner breakdown */}
        <div className="mx-auto mt-20 max-w-4xl">
          <h3 className="text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Pipeline Scanner CLI
          </h3>
          <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
            Run <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800 dark:bg-gray-800 dark:text-gray-200">npx @cveriskpilot/scan</code> in any project or CI/CD pipeline.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                  <th className="px-6 py-3 font-semibold text-gray-900 dark:text-white">Feature</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">Free</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-900 dark:text-white">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {[
                  ['Dependency, secrets, IaC, API route scanners', true, true],
                  ['6 compliance frameworks (NIST, SOC 2, CMMC, FedRAMP, ASVS, SSDF)', true, true],
                  ['JSON, SARIF, Markdown, table output', true, true],
                  ['CI/CD exit codes (pass/fail on severity)', true, true],
                  ['CVE & CWE identifiers', true, true],
                  ['CVSS scores & vectors', false, true],
                  ['Fix version recommendations', false, true],
                  ['AI remediation guidance', false, true],
                  ['Advisory URLs & references', false, true],
                  ['Upload results to dashboard', false, true],
                  ['PR comments on GitHub', false, true],
                  ['POAM auto-generation', false, true],
                ].map(([feature, free, paid]) => (
                  <tr key={feature as string} className="bg-white dark:bg-gray-950">
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{feature as string}</td>
                    <td className="px-6 py-3 text-center">
                      {free ? (
                        <span className="text-green-600 dark:text-green-400">&#10003;</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {paid ? (
                        <span className="text-green-600 dark:text-green-400">&#10003;</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Generate your API key at{' '}
            <Link href="/settings?tab=api-keys" className="text-primary-600 underline hover:text-primary-500 dark:text-primary-400">
              Settings &rarr; API Keys
            </Link>{' '}
            to unlock enriched data and dashboard uploads.
          </p>
        </div>
      </div>
    </section>
  );
}
