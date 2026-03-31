'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Plan = 'FREE' | 'FOUNDERS_BETA' | 'PRO';
type BillingInterval = 'monthly' | 'annual';

interface FoundersSpots {
  total: number;
  taken: number;
  remaining: number;
}

const PLANS = [
  {
    id: 'FREE' as Plan,
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Unlimited CLI scans with compliance mapping',
    features: ['1 user', '50 assets', '3 uploads / month', '50 AI calls / month', 'Unlimited CLI scans', '6 compliance frameworks'],
  },
  {
    id: 'FOUNDERS_BETA' as Plan,
    name: 'Founders Beta',
    monthlyPrice: 29,
    annualPrice: 278,
    description: 'Everything in Pro — locked at early adopter pricing forever',
    features: ['5 users', '250 assets', 'Unlimited uploads', '250 AI calls / month', 'All Pro features', 'Price locked forever'],
    badge: 'Best Value',
  },
  {
    id: 'PRO' as Plan,
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1428,
    description: 'Full compliance automation for security teams',
    features: ['10 users', '1,000 assets', 'Unlimited uploads', '1,000 AI calls / month', 'POAM auto-generation', 'Jira & ServiceNow sync', 'Executive PDF reports', 'SLA policy engine'],
    badge: 'Most Popular',
  },
];

export default function BuyPage() {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('FOUNDERS_BETA');
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundersSpots, setFoundersSpots] = useState<FoundersSpots | null>(null);

  useEffect(() => {
    fetch('/api/billing/founders-spots')
      .then((res) => res.json())
      .then((data: FoundersSpots) => {
        setFoundersSpots(data);
        // If sold out and Founders Beta is selected, switch to Pro
        if (data.remaining === 0 && selectedPlan === 'FOUNDERS_BETA') {
          setSelectedPlan('PRO');
        }
      })
      .catch(() => {
        // Silently fail — hardcoded fallback is fine
      });
  }, []);

  const foundersSoldOut = foundersSpots !== null && foundersSpots.remaining === 0;

  async function handlePurchase(startTrial = false) {
    if (!email) {
      setError('Email is required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/billing/quick-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          plan: selectedPlan,
          billingInterval: interval,
          ...(startTrial ? { trial: true } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      if (data.trial) {
        window.location.href = '/buy/success?plan=pro-trial';
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.href = '/buy/success?plan=free';
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handlePurchase(false);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
          Get your API key in 60 seconds
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
          Run{' '}
          <code className="rounded-md bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            npx @cveriskpilot/scan
          </code>{' '}
          with AI-powered compliance scanning. Pick a plan, enter your email, and start scanning.
        </p>
      </div>

      {/* Billing interval toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${
              interval === 'monthly'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('annual')}
            className={`rounded-md px-6 py-2 text-sm font-medium transition-colors ${
              interval === 'annual'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Annual <span className="ml-1 text-xs opacity-75">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards — wide desktop layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
          const isSelected = selectedPlan === plan.id;
          const isFoundersBeta = plan.id === 'FOUNDERS_BETA';
          const isDisabled = isFoundersBeta && foundersSoldOut;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => !isDisabled && setSelectedPlan(plan.id)}
              disabled={isDisabled}
              className={`relative rounded-2xl border-2 p-8 text-left transition-all ${
                isDisabled
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-950'
                  : isSelected
                    ? 'border-primary-600 bg-primary-50/50 shadow-lg shadow-primary-600/10 ring-1 ring-primary-600 dark:bg-primary-950/20'
                    : 'border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
              }`}
            >
              {isDisabled ? (
                <span className="absolute -top-3 right-4 rounded-full bg-gray-500 px-3 py-1 text-xs font-semibold text-white">
                  Sold Out
                </span>
              ) : plan.badge ? (
                <span className={`absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.badge === 'Most Popular'
                    ? 'bg-primary-600 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {plan.badge}
                </span>
              ) : null}

              <div className="flex items-center gap-3">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isDisabled
                    ? 'border-gray-300 dark:border-gray-600'
                    : isSelected
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && !isDisabled && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12">
                      <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
              </div>

              {/* Founders Beta spots counter */}
              {isFoundersBeta && foundersSpots && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {foundersSpots.taken} of {foundersSpots.total} spots claimed
                    </span>
                    <span className={`font-semibold ${
                      foundersSpots.remaining === 0
                        ? 'text-red-600 dark:text-red-400'
                        : foundersSpots.remaining < 10
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
                    }`}>
                      {foundersSpots.remaining === 0
                        ? 'Sold out'
                        : `${foundersSpots.remaining} left`
                      }
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        foundersSpots.remaining === 0
                          ? 'bg-red-500'
                          : foundersSpots.remaining < 10
                            ? 'bg-amber-500'
                            : 'bg-primary-600'
                      }`}
                      style={{ width: `${(foundersSpots.taken / foundersSpots.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6">
                {price === 0 ? (
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">Free</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${isDisabled ? 'text-gray-400 line-through dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                      ${interval === 'annual' ? Math.round(price / 12) : price}
                    </span>
                    <span className="text-base text-gray-500 dark:text-gray-400">/mo</span>
                    {interval === 'annual' && (
                      <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">
                        (${price}/yr)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>

              <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>

      {/* Email + submit — wide form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="buy-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="buy-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Setting up...'
                : selectedPlan === 'FREE'
                  ? 'Get free API key'
                  : `Continue to checkout — $${interval === 'annual' ? PLANS.find(p => p.id === selectedPlan)!.annualPrice : PLANS.find(p => p.id === selectedPlan)!.monthlyPrice}${interval === 'annual' ? '/yr' : '/mo'}`
              }
            </button>

            {selectedPlan === 'PRO' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handlePurchase(true)}
                className="rounded-lg border border-primary-600 px-6 py-3 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950/20"
              >
                Start 14-day free trial
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-500">
          <p>
            Need Enterprise or MSSP?{' '}
            <a href="mailto:sales@cveriskpilot.com" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">
              Contact sales
            </a>
          </p>
          <div className="flex items-center gap-4">
            <span>Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400">
                Sign in
              </Link>
            </span>
            <span>&middot;</span>
            <Link href="/pricing" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400">
              Compare all plans
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
