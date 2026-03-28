'use client';

import { useState, useEffect, useCallback } from 'react';

interface ImpersonationBannerProps {
  organizationName: string;
  startedAt: string; // ISO 8601
  onEndSession: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export function ImpersonationBanner({
  organizationName,
  startedAt,
  onEndSession,
}: ImpersonationBannerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const handleEnd = useCallback(async () => {
    setEnding(true);
    try {
      const res = await fetch('/api/ops/impersonate', { method: 'DELETE' });
      if (res.ok) {
        onEndSession();
      } else {
        console.error('Failed to end impersonation session');
        setEnding(false);
      }
    } catch {
      console.error('Error ending impersonation session');
      setEnding(false);
    }
  }, [onEndSession]);

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-between gap-4 border-b-2 border-amber-600 bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-lg"
    >
      <div className="flex items-center gap-3">
        {/* Shield icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5 flex-shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 1a.75.75 0 01.615.32l6.25 8.75a.75.75 0 01-.615 1.18H3.75a.75.75 0 01-.615-1.18l6.25-8.75A.75.75 0 0110 1zm0 2.107L5.442 9.75h9.116L10 3.107zM10 12a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 12zm0 4.25a.75.75 0 100 1.5.75.75 0 000-1.5z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Viewing as{' '}
          <span className="rounded bg-amber-700/20 px-1.5 py-0.5 font-bold">
            {organizationName}
          </span>
          {' '}&mdash; Read-only mode
        </span>
        <span className="tabular-nums text-amber-900">
          ({formatElapsed(elapsed)})
        </span>
      </div>

      <button
        onClick={handleEnd}
        disabled={ending}
        className="rounded-md border border-amber-800 bg-amber-700 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ending ? 'Ending...' : 'End Session'}
      </button>
    </div>
  );
}
