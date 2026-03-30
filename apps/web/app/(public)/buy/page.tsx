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
        // Free plan — go straight to success
        window.location.href = '/buy/success?plan=free';
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Get your API key in 60 seconds
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Run <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800 dark:bg-gray-800 dark:text-gray-200">npx @cveriskpilot/scan</code> with
          AI-powered compliance scanning
        </p>
      </div>

      {/* Billing interval toggle */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              interval === 'monthly'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval('annual')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              interval === 'annual'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Annual <span className="text-xs opacity-75">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const price = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
          const isSelected = selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                isSelected
                  ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600 dark:bg-primary-950/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
              }`}
            >
              {plan.badge && (
                <span className={`absolute -top-2.5 right-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  plan.badge === 'Most Popular'
                    ? 'bg-primary-600 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 ${
                  isSelected
                    ? 'border-primary-600 bg-primary-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
              </div>

              <div className="mt-3">
                {price === 0 ? (
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${interval === 'annual' ? Math.round(price / 12) : price}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
                    {interval === 'annual' && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                        (${price}/yr)
                      </span>
                    )}
                  </>
                )}
              </div>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>

              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <svg className="h-3.5 w-3.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Email + submit */}
      <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

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
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Setting up...'
            : selectedPlan === 'FREE'
              ? 'Get free API key'
              : `Continue to checkout — $${interval === 'annual' ? PLANS.find(p => p.id === selectedPlan)!.annualPrice : PLANS.find(p => p.id === selectedPlan)!.monthlyPrice}${interval === 'annual' ? '/yr' : '/mo'}`
          }
        </button>

        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          Need Enterprise or MSSP?{' '}
          <a href="mailto:sales@cveriskpilot.com" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Contact sales
          </a>
        </p>
      </form>

      {/* Footer links */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400">
          Sign in
        </Link>
        {' '}&middot;{' '}
        <Link href="/pricing" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400">
          Compare all plans
        </Link>
      </div>
    </>
  );
}
