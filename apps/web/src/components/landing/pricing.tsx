'use client';

import { useState } from 'react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'For individual researchers and small teams getting started.',
    features: [
      '1 user',
      '3 uploads per month',
      '50 AI remediation calls',
      '50 assets',
      'Community support',
      'Standard reports',
    ],
    cta: 'Get Started Free',
    ctaHref: '/signup?plan=free',
    highlighted: false,
  },
  {
    name: 'Founders Beta',
    monthlyPrice: 29,
    annualPrice: 278,
    description: 'Early adopter pricing. Locked in forever.',
    features: [
      '250 assets',
      '5 users',
      'Unlimited uploads',
      '250 AI calls',
      'Email support',
    ],
    cta: 'Join Founders Beta',
    ctaHref: '/signup?plan=founders_beta',
    highlighted: false,
    badge: 'Limited',
  },
  {
    name: 'Pro',
    monthlyPrice: 49,
    annualPrice: 470,
    description: 'For security teams that need full coverage and priority support.',
    features: [
      '10 users',
      'Unlimited uploads',
      '500 AI remediation calls',
      '500 assets',
      'Priority support',
      'Executive PDF reports',
      'Scan-over-scan comparison',
      'SLA policy engine',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/signup?plan=pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 199,
    annualPrice: 1910,
    description: 'For organizations with advanced security and compliance needs.',
    features: [
      '50 users',
      'Unlimited uploads',
      '5,000 AI remediation calls',
      '5,000 assets',
      'SSO / SAML / SCIM',
      'Custom parser formats (coming soon)',
      'ABAC policies',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@cveriskpilot.com?subject=Enterprise%20Plan',
    highlighted: false,
  },
  {
    name: 'MSSP',
    monthlyPrice: 499,
    annualPrice: 4790,
    description: 'Multi-tenant managed security service provider.',
    features: [
      'Unlimited everything',
      'White-label branding',
      'Per-client usage metering',
      'Bulk tenant onboarding',
      'Usage-based billing',
      'Full API access',
      'Dedicated support channel',
    ],
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@cveriskpilot.com?subject=MSSP%20Plan',
    highlighted: false,
    badge: 'For MSSPs',
  },
];

function formatPrice(monthly: number, annual: number, isAnnual: boolean): string {
  if (monthly === 0) return '$0';
  if (isAnnual) return `$${Math.round(annual / 12)}`;
  return `$${monthly}`;
}

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-white dark:bg-gray-900 py-20 sm:py-28 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Start free. Upgrade when you need more power.
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
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
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
          {isAnnual && (
            <span className="ml-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Save 20%
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-12 grid max-w-7xl gap-6 lg:grid-cols-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-shadow duration-200 ${
                plan.highlighted
                  ? 'border-primary-500 bg-white dark:bg-gray-900 shadow-xl shadow-primary-100/50 ring-1 ring-primary-500 dark:border-primary-400 dark:bg-gray-900 dark:shadow-primary-900/20 dark:ring-primary-400'
                  : 'border-gray-200 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-gray-900/30'
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

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {plan.name}
              </h3>
              <p className="mt-1 min-h-[40px] text-sm text-gray-500 dark:text-gray-400">
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-extrabold tabular-nums text-gray-900 dark:text-white">
                  {formatPrice(plan.monthlyPrice, plan.annualPrice, isAnnual)}
                </span>
                <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">
                  /month
                </span>
              </div>
              {isAnnual && plan.monthlyPrice > 0 && (
                <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                  ${plan.annualPrice}/yr billed annually
                </p>
              )}
              {plan.name === 'MSSP' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  + per-client usage
                </p>
              )}

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400"
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

              <Link
                href={plan.ctaHref}
                className={`mt-auto pt-4 block w-full rounded-xl py-2 text-center text-sm font-semibold transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25'
                    : 'border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
