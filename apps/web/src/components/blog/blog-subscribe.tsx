'use client';

import { useState } from 'react';

export function BlogSubscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'blog' }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('You\'re in. Watch your inbox.');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Try again.');
    }
  }

  return (
    <div className="mt-16 rounded-xl border border-slate-800 bg-slate-900/50 p-8">
      <div className="mx-auto max-w-xl text-center">
        <h3 className="text-xl font-semibold text-white">
          Get weekly CVE intelligence + compliance tips
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          New CVEs that matter, compliance control breakdowns, and DevSecOps insights.
          No spam. Unsubscribe anytime.
        </p>

        {status === 'success' ? (
          <p className="mt-6 text-sm font-medium text-green-400">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="mt-3 text-sm text-red-400">{message}</p>
        )}
      </div>
    </div>
  );
}
