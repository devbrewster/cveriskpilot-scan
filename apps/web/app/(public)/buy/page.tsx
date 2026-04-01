'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Plan = 'FREE' | 'FOUNDERS_BETA' | 'PRO';

interface FoundersSpots {
  total: number;
  taken: number;
  remaining: number;
}

const PLANS: { id: Plan; name: string; price: number; tagline: string; highlight?: string }[] = [
  { id: 'FREE', name: 'Free', price: 0, tagline: '1 user, 50 assets, 6 frameworks' },
  { id: 'FOUNDERS_BETA', name: 'Founders Beta', price: 29, tagline: '5 users, 250 assets, 10 frameworks', highlight: 'Best Value' },
  { id: 'PRO', name: 'Pro', price: 149, tagline: '10 users, 1K assets, POAM export' },
];

export default function BuyPage() {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('FOUNDERS_BETA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundersSpots, setFoundersSpots] = useState<FoundersSpots | null>(null);

  useEffect(() => {
    fetch('/api/billing/founders-spots')
      .then((res) => res.json())
      .then((data: FoundersSpots) => {
        setFoundersSpots(data);
        if (data.remaining === 0 && selectedPlan === 'FOUNDERS_BETA') {
          setSelectedPlan('PRO');
        }
      })
      .catch(() => {});
  }, []);

  const foundersSoldOut = foundersSpots !== null && foundersSpots.remaining === 0;
  const activePlan = PLANS.find((p) => p.id === selectedPlan)!;

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
          billingInterval: 'monthly',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Get your API key
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          Pick a plan, enter your email, start scanning.
        </p>
      </div>

      {/* Single form card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Plan selector — side by side */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Plan</legend>
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isFounders = plan.id === 'FOUNDERS_BETA';
              const isDisabled = isFounders && foundersSoldOut;

              return (
                <label
                  key={plan.id}
                  className={`relative flex cursor-pointer flex-col items-center rounded-xl border-2 px-3 py-4 text-center transition-all ${
                    isDisabled
                      ? 'cursor-not-allowed border-gray-100 opacity-50 dark:border-gray-800'
                      : isSelected
                        ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600/20 dark:bg-primary-950/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => setSelectedPlan(plan.id)}
                    className="sr-only"
                  />

                  {/* Badge */}
                  {plan.highlight && !isDisabled && (
                    <span className="absolute -top-2.5 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {plan.highlight}
                    </span>
                  )}
                  {isDisabled && (
                    <span className="absolute -top-2.5 rounded-full bg-gray-200 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-500 dark:bg-gray-700">
                      Sold Out
                    </span>
                  )}

                  {/* Plan name */}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{plan.name}</span>

                  {/* Price */}
                  <span className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">/mo</span>
                  )}

                  {/* Tagline */}
                  <span className="mt-1.5 text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                    {plan.tagline}
                  </span>

                  {/* Founders spots */}
                  {isFounders && foundersSpots && !foundersSoldOut && (
                    <span className="mt-1.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                      {foundersSpots.remaining} spots left
                    </span>
                  )}

                  {/* Selected indicator */}
                  {isSelected && !isDisabled && (
                    <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600">
                      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12">
                        <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Email */}
        <div className="mt-5">
          <label htmlFor="buy-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
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
            className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        {/* Submit */}
        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? 'Setting up...'
              : selectedPlan === 'FREE'
                ? 'Get free API key'
                : `Checkout — $${activePlan.price}/mo`
            }
          </button>

          {selectedPlan === 'PRO' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handlePurchase(true)}
              className="rounded-xl border border-primary-600 px-5 py-3 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950/20"
            >
              14-day trial
            </button>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>
            Enterprise?{' '}
            <a href="mailto:sales@cveriskpilot.com" className="text-primary-600 hover:underline dark:text-primary-400">
              Contact sales
            </a>
          </span>
          <span>
            <Link href="/login" className="text-primary-600 hover:underline dark:text-primary-400">Sign in</Link>
            {' | '}
            <Link href="/pricing" className="text-primary-600 hover:underline dark:text-primary-400">Compare plans</Link>
          </span>
        </div>
      </form>

      {/* CLI hint */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        Free tier works without a key:{' '}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          npx @cveriskpilot/scan
        </code>
      </p>
    </div>
  );
}
