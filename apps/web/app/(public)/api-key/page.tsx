'use client';

import { useState } from 'react';
import Link from 'next/link';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    description: 'Local scans with compliance mapping. No API key needed.',
    features: [
      'Pipeline scanner CLI',
      '6 compliance frameworks',
      'Terminal + JSON + SARIF + Markdown output',
      'Offline-first — no network required',
    ],
    limits: ['No CVE enrichment', 'No fix versions', 'No AI remediation', 'No dashboard uploads'],
    cta: 'Install Free',
    ctaHref: null as string | null, // handled by onClick
    highlighted: false,
  },
  {
    id: 'founders_beta',
    name: 'Founders Beta',
    price: 29,
    period: '/mo',
    description: 'Enriched scan data + dashboard access. Locked-in pricing.',
    features: [
      'Everything in Free',
      'CVE details + CVSS scores',
      'Fix versions + advisories',
      'AI-powered remediation recommendations',
      'Upload results to dashboard',
      '100 PR comments/month',
      '250 AI calls/month',
      'Email support',
    ],
    limits: [],
    cta: 'Get API Key',
    ctaHref: '/signup?plan=founders_beta',
    highlighted: false,
    badge: 'Limited',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    period: '/mo',
    description: 'Full enrichment, priority support, and executive reporting.',
    features: [
      'Everything in Founders Beta',
      '500 AI remediation calls',
      'Unlimited uploads',
      'Unlimited PR comments',
      'Executive PDF reports',
      'Scan-over-scan comparison',
      'SLA policy engine',
      'Priority support',
    ],
    limits: [],
    cta: 'Get API Key',
    ctaHref: '/signup?plan=pro',
    highlighted: true,
  },
];

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function ApiKeyPage() {
  const [copied, setCopied] = useState(false);

  function handleCopyInstall() {
    navigator.clipboard.writeText('npx @cveriskpilot/scan@latest --preset startup');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
        Get Your API Key
      </h1>
      <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        Unlock enriched CVE data, fix versions, and AI remediation for your pipeline scans.
      </p>

      {/* Install command */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-2">
          <code className="text-xs text-gray-700 dark:text-gray-300">
            npx @cveriskpilot/scan@latest --preset startup
          </code>
          <button
            onClick={handleCopyInstall}
            className="shrink-0 rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="mt-6 space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl border p-5 transition-all ${
              plan.highlighted
                ? 'border-primary-500 bg-primary-50/50 shadow-sm dark:border-primary-600 dark:bg-primary-950/20'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {plan.badge}
              </span>
            )}

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
              </div>
              <div className="text-right">
                {plan.price === 0 ? (
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Free</span>
                ) : (
                  <div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">${plan.price}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{plan.period}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <ul className="mt-3 space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <CheckIcon />
                  {f}
                </li>
              ))}
              {plan.limits.map((l) => (
                <li key={l} className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <XIcon />
                  {l}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-4">
              {plan.ctaHref ? (
                <Link
                  href={plan.ctaHref}
                  className={`block w-full rounded-lg px-4 py-2 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  onClick={handleCopyInstall}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {copied ? 'Copied!' : plan.cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          How it works
        </h3>
        <ol className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300">1</span>
            <span><strong className="text-gray-900 dark:text-white">Sign up</strong> — create an account with a paid plan</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300">2</span>
            <span><strong className="text-gray-900 dark:text-white">Generate API key</strong> — from your dashboard Settings &gt; API Keys</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300">3</span>
            <span><strong className="text-gray-900 dark:text-white">Add to CLI</strong> — <code className="rounded bg-gray-200 px-1 py-0.5 text-[10px] dark:bg-gray-700">crp-scan --api-key YOUR_KEY</code> or set <code className="rounded bg-gray-200 px-1 py-0.5 text-[10px] dark:bg-gray-700">CRP_API_KEY</code> env var</span>
          </li>
        </ol>
      </div>

      {/* Already have account */}
      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400">
          Sign in
        </Link>{' '}
        to manage your API keys.
      </p>

      {/* Enterprise */}
      <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
        Need Enterprise or MSSP?{' '}
        <a href="mailto:sales@cveriskpilot.com" className="underline hover:text-gray-600 dark:hover:text-gray-300">
          Contact sales
        </a>
      </p>
    </>
  );
}
