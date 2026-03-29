'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const usageMetrics = [
  { label: 'Assets Scanned', used: 587, limit: 1_000, color: 'bg-blue-500' },
  { label: 'Findings Processed', used: 4_218, limit: 10_000, color: 'bg-green-500' },
  { label: 'AI Triage Calls', used: 312, limit: 500, color: 'bg-purple-500' },
  { label: 'Storage Used', used: 2.4, limit: 10, color: 'bg-cyan-500', unit: 'GB' },
];

interface Plan {
  key: string;
  name: string;
  monthly: number | null;
  bullets: string[];
  cta: 'signup' | 'sales';
  current?: boolean;
}

const plans: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    monthly: 0,
    bullets: ['50 assets', '1 user', '3 uploads/month', '50 AI calls', 'Community support'],
    cta: 'signup',
  },
  {
    key: 'founders',
    name: 'Founders Beta',
    monthly: 29,
    bullets: ['250 assets', '5 users', 'Unlimited uploads', '250 AI calls', 'Email support'],
    cta: 'sales',
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 49,
    bullets: [
      '500 assets',
      '10 users',
      'Unlimited uploads',
      '500 AI calls',
      'Priority support',
      'Compliance frameworks',
      'API access',
    ],
    cta: 'sales',
    current: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: 199,
    bullets: [
      '5,000 assets',
      '50 users',
      'SSO / SAML / SCIM',
      'Dedicated support',
      'SLA guarantees',
      'Custom integrations',
      'Data residency',
    ],
    cta: 'sales',
  },
  {
    key: 'mssp',
    name: 'MSSP',
    monthly: 499,
    bullets: [
      'Unlimited everything',
      'White-label',
      'Client management',
      'Usage-based billing',
      'Full API access',
    ],
    cta: 'sales',
  },
];

type Check = true | false | string;

interface FeatureRow {
  feature: string;
  values: [Check, Check, Check, Check, Check]; // free, founders, pro, enterprise, mssp
}

const featureRows: FeatureRow[] = [
  { feature: 'Assets', values: ['50', '250', '500', '5,000', 'Unlimited'] },
  { feature: 'Users', values: ['1', '5', '10', '50', 'Unlimited'] },
  { feature: 'Uploads', values: ['3/mo', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
  { feature: 'AI Calls', values: ['50/mo', '250/mo', '500/mo', '5,000/mo', 'Unlimited'] },
  { feature: 'Compliance Frameworks', values: [false, false, true, true, true] },
  { feature: 'EPSS / KEV Enrichment', values: [true, true, true, true, true] },
  { feature: 'API Access', values: [false, false, true, true, true] },
  { feature: 'SSO / SAML', values: [false, false, false, true, true] },
  { feature: 'Custom Integrations', values: [false, false, false, true, true] },
  { feature: 'SLA Guarantees', values: [false, false, false, true, true] },
  { feature: 'White-Label', values: [false, false, false, false, true] },
  { feature: 'Priority Support', values: [false, false, true, true, true] },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pct(used: number, limit: number) {
  return ((used / limit) * 100).toFixed(1);
}

function formatPrice(monthly: number | null, annual: boolean) {
  if (monthly === null) return 'Custom';
  if (monthly === 0) return '$0';
  const price = annual ? Math.round(monthly * 12 * 0.8) : monthly;
  return `$${price}`;
}

function CheckCell({ value }: { value: Check }) {
  if (value === true)
    return <span className="text-green-500 font-bold text-lg">&#10003;</span>;
  if (value === false)
    return <span className="text-neutral-400 font-bold text-lg">&#10005;</span>;
  return <span className="text-sm text-neutral-700 dark:text-neutral-300">{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DemoBillingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* Info banner */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
        Viewing demo billing dashboard. Data shown is simulated.
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Billing &amp; Usage
        </h1>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          Pro
        </span>
      </div>

      {/* ---- Usage Dashboard ---- */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          Current Period Usage (March 2026)
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {usageMetrics.map((m) => {
            const percentage = pct(m.used, m.limit);
            const usedLabel = m.unit ? `${m.used} ${m.unit}` : m.used.toLocaleString();
            const limitLabel = m.unit ? `${m.limit} ${m.unit}` : m.limit.toLocaleString();
            return (
              <div
                key={m.label}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {m.label}
                </p>
                <p className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {usedLabel}{' '}
                  <span className="text-sm font-normal text-neutral-400">/ {limitLabel}</span>
                </p>
                <p className="mt-1 text-xs text-neutral-500">{percentage}%</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full ${m.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Cost Estimate ---- */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          Cost Estimate
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Base Cost', value: '$49/mo' },
            { label: 'Metered Overage', value: '$0' },
            { label: 'Estimated Total', value: '$49/mo' },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-neutral-200 bg-white p-5 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {c.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Tier Comparison ---- */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            Compare Plans
          </h2>

          {/* Toggle */}
          <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-1 py-1 dark:border-neutral-700 dark:bg-neutral-800">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                !annual
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                annual
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              Annual
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/50 dark:text-green-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {plans.map((p) => (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-xl border p-5 shadow-sm ${
                p.current
                  ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-950/30 dark:ring-blue-400'
                  : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
              }`}
            >
              {p.current && (
                <span className="absolute -top-2.5 left-4 inline-flex items-center rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  Current Plan
                </span>
              )}
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {p.name}
              </h3>
              <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatPrice(p.monthly, annual)}
                {p.monthly !== null && (
                  <span className="text-sm font-normal text-neutral-400">
                    {annual ? '/yr' : '/mo'}
                  </span>
                )}
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-green-500">&#10003;</span>
                    {b}
                  </li>
                ))}
              </ul>

              {p.cta === 'signup' ? (
                <a
                  href="/signup"
                  className="mt-4 block rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  Get Started
                </a>
              ) : (
                <button
                  disabled
                  className="mt-4 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-center text-xs font-semibold text-neutral-500 cursor-not-allowed dark:border-neutral-600 dark:text-neutral-500"
                >
                  Contact Sales
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---- Feature Comparison Table ---- */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          Feature Comparison
        </h2>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60">
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">
                  Feature
                </th>
                {['Free', 'Founders', 'Pro', 'Enterprise', 'MSSP'].map((col) => (
                  <th
                    key={col}
                    className={`px-4 py-3 text-center font-medium ${
                      col === 'Pro'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, idx) => (
                <tr
                  key={row.feature}
                  className={
                    idx % 2 === 0
                      ? 'bg-white dark:bg-neutral-900'
                      : 'bg-neutral-50/50 dark:bg-neutral-800/30'
                  }
                >
                  <td className="px-4 py-2.5 font-medium text-neutral-700 dark:text-neutral-300">
                    {row.feature}
                  </td>
                  {row.values.map((val, i) => (
                    <td
                      key={i}
                      className={`px-4 py-2.5 text-center ${
                        i === 2
                          ? 'bg-blue-50/60 dark:bg-blue-950/20'
                          : ''
                      }`}
                    >
                      <CheckCell value={val} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
