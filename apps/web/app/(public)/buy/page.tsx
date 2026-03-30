'use client';

import { useState } from 'react';
import Link from 'next/link';

type Plan = 'FREE' | 'FOUNDERS_BETA' | 'PRO';
type BillingInterval = 'monthly' | 'annual';

const PLANS = [
  {
    id: 'FREE' as Plan,
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Try the scanner — no credit card needed',
    features: ['1 user', '50 assets', '3 uploads / month', '50 AI calls / month', 'CLI scanner access'],
  },
  {
    id: 'FOUNDERS_BETA' as Plan,
    name: 'Founders Beta',
    monthlyPrice: 29,
    annualPrice: 278,
    description: 'Locked pricing for early adopters',
    features: ['5 users', '250 assets', 'Unlimited uploads', '250 AI calls / month', 'CLI scanner access', 'Priority support'],
    badge: 'Best Value',
  },
  {
    id: 'PRO' as Plan,
    name: 'Pro',
    monthlyPrice: 49,
    annualPrice: 470,
    description: 'Full platform with dashboard access',
    features: ['10 users', '500 assets', 'Unlimited uploads', '500 AI calls / month', 'CLI scanner access', 'Full web dashboard', 'Compliance mapping', 'PDF/CSV reports'],
    badge: 'Most Popular',
  },
];

export default function BuyPage() {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('FOUNDERS_BETA');
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        body: JSON.stringify({ email, plan: selectedPlan, billingInterval: interval }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.href = '/buy/success?plan=free';
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
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

      {/* Plan cards — full width grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
          const isSelected = selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl border-2 p-8 text-left transition-all ${
                isSelected
                  ? 'border-primary-600 bg-primary-50/50 shadow-lg shadow-primary-600/10 ring-1 ring-primary-600 dark:bg-primary-950/20'
                  : 'border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
              }`}
            >
              {plan.badge && (
                <span className={`absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.badge === 'Most Popular'
                    ? 'bg-primary-600 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  isSelected
                    ? 'border-primary-600 bg-primary-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12">
                      <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
              </div>

              <div className="mt-6">
                {price === 0 ? (
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">Free</span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
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
