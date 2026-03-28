'use client';

import Link from 'next/link';

interface ComplianceScore {
  framework: string;
  score: number;
  controlsTotal: number;
  controlsMet: number;
}

interface ComplianceScoresProps {
  scores: ComplianceScore[];
}

function getBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getTextColor(score: number): string {
  if (score >= 90) return 'text-green-700 dark:text-green-400';
  if (score >= 70) return 'text-yellow-700 dark:text-yellow-400';
  return 'text-red-700 dark:text-red-400';
}

export function ComplianceScores({ scores }: ComplianceScoresProps) {
  if (scores.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        No compliance frameworks configured
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scores.map((item) => (
        <div key={item.framework}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900 dark:text-white">{item.framework}</span>
            <span className="text-gray-500 dark:text-gray-400">
              {item.controlsMet}/{item.controlsTotal} controls{' '}
              <span className={`font-semibold ${getTextColor(item.score)}`}>
                {item.score}%
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full rounded-full ${getBarColor(item.score)} transition-all`}
              style={{ width: `${item.score}%` }}
            />
          </div>
        </div>
      ))}

      <Link
        href="/compliance/frameworks"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        View all frameworks
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
