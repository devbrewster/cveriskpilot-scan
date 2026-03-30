'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function BuySuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isFree = searchParams.get('plan') === 'free';

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const provision = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/quick-purchase/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isFree ? { plan: 'free' } : { sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to provision API key');
        setLoading(false);
        return;
      }

      setApiKey(data.key);
      setTier(data.tier || (isFree ? 'FREE' : ''));
      setLoading(false);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }, [sessionId, isFree]);

  useEffect(() => {
    if (!sessionId && !isFree) {
      setError('Missing checkout session. Please try purchasing again.');
      setLoading(false);
      return;
    }
    provision();
  }, [sessionId, isFree, provision]);

  function copyToClipboard(text: string, type: 'key' | 'cmd') {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
        <p className="mt-6 text-base text-gray-500 dark:text-gray-400">
          {isFree ? 'Creating your API key...' : 'Confirming payment and creating your API key...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Something went wrong</h2>
          <p className="mt-3 text-base text-red-600 dark:text-red-400">{error}</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/buy"
              className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Try again
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scanCmd = `npx @cveriskpilot/scan --api-key ${apiKey}`;

  return (
    <div className="space-y-8">
      {/* Success header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isFree ? "You're all set!" : 'Payment confirmed!'}
        </h1>
        <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
          Your {tier || 'API'} key is ready. Copy it now — it will not be shown again.
        </p>
      </div>

      {/* API key display */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8 dark:border-amber-700 dark:bg-amber-950/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Your API Key
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(apiKey!, 'key')}
            className="rounded-md bg-amber-200 px-4 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:hover:bg-amber-700"
          >
            {copied ? 'Copied!' : 'Copy key'}
          </button>
        </div>
        <code className="mt-4 block break-all rounded-lg bg-white p-4 font-mono text-base text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          {apiKey}
        </code>
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
          Store this key securely. It cannot be retrieved after you leave this page.
        </p>
      </div>

      {/* Quick start + Next steps — side by side on desktop */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Quick start */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick start</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Run your first compliance scan:
          </p>
          <div className="relative mt-4">
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-5 text-sm text-green-400 dark:bg-gray-950">
              <code>{scanCmd}</code>
            </pre>
            <button
              type="button"
              onClick={() => copyToClipboard(scanCmd, 'cmd')}
              className="absolute right-3 top-3 rounded-md bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-600"
            >
              {copiedCmd ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">Or set it as an environment variable:</p>
            <pre className="overflow-x-auto rounded-lg bg-gray-100 p-4 font-mono text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              export CVERISKPILOT_API_KEY={apiKey}{'\n'}npx @cveriskpilot/scan
            </pre>
          </div>
        </div>

        {/* Next steps */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Next steps</h2>
          <ul className="mt-4 space-y-5">
            <li className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">1</span>
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">Read the docs</p>
                <Link href="/docs/cli" className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400">
                  CLI reference &rarr;
                </Link>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">2</span>
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">Add to your CI/CD pipeline</p>
                <Link href="/docs/github-action" className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400">
                  GitHub Action setup &rarr;
                </Link>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">3</span>
              <div>
                <p className="text-base font-medium text-gray-900 dark:text-white">Want the full dashboard?</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <Link href="/login" className="text-primary-600 hover:text-primary-500 dark:text-primary-400">
                    Set a password
                  </Link>
                  {' '}to access findings, cases, compliance mapping, and reports.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
