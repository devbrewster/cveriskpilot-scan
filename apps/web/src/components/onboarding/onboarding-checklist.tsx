'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}

export function OnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user dismissed the checklist
    if (localStorage.getItem('crp_onboarding_dismissed') === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Fetch onboarding status
    fetch('/api/onboarding/status')
      .then(res => res.json())
      .then(data => {
        if (data.allComplete) {
          setDismissed(true);
        } else {
          setItems(data.items ?? []);
        }
      })
      .catch(() => {
        // If API fails, don't show checklist
        setDismissed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || dismissed || items.length === 0) return null;

  const completedCount = items.filter(i => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/30">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Getting Started
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Complete these steps to get the most out of CVERiskPilot
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('crp_onboarding_dismissed', 'true');
            setDismissed(true);
          }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Dismiss"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {completedCount}/{items.length}
        </span>
      </div>

      {/* Checklist items */}
      <ul className="mt-4 space-y-3">
        {items.map(item => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
            >
              <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                item.completed
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {item.completed && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  item.completed
                    ? 'text-gray-400 line-through dark:text-gray-500'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
