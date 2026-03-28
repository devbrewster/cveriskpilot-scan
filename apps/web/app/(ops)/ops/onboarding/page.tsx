'use client';

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Milestone = 'first_scan' | 'first_case' | 'first_report' | 'invited_team' | 'upgraded_plan';
type Stage = 'trial' | 'activated' | 'converted' | 'churned';

interface RecentSignup {
  id: string;
  orgName: string;
  email: string;
  tier: string;
  signupDate: string;
  stage: Stage;
  milestones: Milestone[];
}

interface OnboardingData {
  stages: { name: Stage; count: number }[];
  recentSignups: RecentSignup[];
  conversionRate: number;
  avgTimeToConvert: number;
  activeTrials: number;
  thisMonthSignups: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_MILESTONES: { key: Milestone; label: string; icon: string }[] = [
  { key: 'first_scan', label: 'Scan', icon: 'S' },
  { key: 'first_case', label: 'Case', icon: 'C' },
  { key: 'first_report', label: 'Report', icon: 'R' },
  { key: 'invited_team', label: 'Team', icon: 'T' },
  { key: 'upgraded_plan', label: 'Upgrade', icon: 'U' },
];

const STAGE_COLORS: Record<Stage, string> = {
  trial: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  activated: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
  converted: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
  churned: 'bg-red-500/20 text-red-400 ring-red-500/30',
};

const FUNNEL_COLORS: Record<Stage, string> = {
  trial: 'bg-violet-500',
  activated: 'bg-blue-500',
  converted: 'bg-emerald-500',
  churned: 'bg-red-500',
};

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ops/onboarding')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load onboarding data');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        {error ?? 'Failed to load data'}
      </div>
    );
  }

  const maxStageCount = Math.max(...data.stages.map((s) => s.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Onboarding Pipeline</h2>
        <p className="mt-1 text-sm text-gray-400">
          Track signups from trial to conversion across the customer lifecycle.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Conversion Rate', value: `${data.conversionRate}%`, color: 'text-emerald-400' },
          { label: 'Avg Time to Convert', value: `${data.avgTimeToConvert}d`, color: 'text-blue-400' },
          { label: 'Active Trials', value: String(data.activeTrials), color: 'text-violet-400' },
          { label: 'This Month Signups', value: String(data.thisMonthSignups), color: 'text-amber-400' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-gray-800 bg-gray-900 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {kpi.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel Visualization */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Conversion Funnel
        </h3>
        <div className="space-y-3">
          {data.stages.map((stage, i) => {
            const widthPct = maxStageCount > 0 ? (stage.count / maxStageCount) * 100 : 0;
            const prevCount = i > 0 ? data.stages[i - 1].count : null;
            const dropOff =
              prevCount !== null && prevCount > 0
                ? Math.round(((prevCount - stage.count) / prevCount) * 100)
                : null;

            return (
              <div key={stage.name} className="flex items-center gap-4">
                <div className="w-24 text-right">
                  <span className="text-sm font-medium capitalize text-gray-300">
                    {stage.name}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 flex-1 overflow-hidden rounded bg-gray-800">
                      <div
                        className={`absolute inset-y-0 left-0 rounded ${FUNNEL_COLORS[stage.name]} transition-all duration-500`}
                        style={{ width: `${widthPct}%` }}
                      />
                      <span className="relative z-10 flex h-full items-center px-3 text-sm font-semibold text-white">
                        {stage.count}
                      </span>
                    </div>
                    {dropOff !== null && (
                      <span className="w-16 text-xs text-gray-500">
                        -{dropOff}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Funnel flow arrows */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className="font-medium text-gray-400">Trial</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="font-medium text-gray-400">Activated</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="font-medium text-gray-400">Converted</span>
        </div>
      </div>

      {/* Recent Signups Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Recent Signups
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3 font-medium">Org Name</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Signup Date</th>
                <th className="px-6 py-3 font-medium">Days</th>
                <th className="px-6 py-3 font-medium">Milestones</th>
                <th className="px-6 py-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {data.recentSignups.map((signup) => (
                <tr key={signup.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-3 font-medium text-white">{signup.orgName}</td>
                  <td className="px-6 py-3 text-gray-400">{signup.email}</td>
                  <td className="px-6 py-3 text-gray-400">
                    {new Date(signup.signupDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-3 text-gray-400">{daysSince(signup.signupDate)}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1">
                      {ALL_MILESTONES.map((m) => {
                        const hit = signup.milestones.includes(m.key);
                        return (
                          <span
                            key={m.key}
                            title={m.label}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                              hit
                                ? 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30'
                                : 'bg-gray-800 text-gray-600'
                            }`}
                          >
                            {m.icon}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${STAGE_COLORS[signup.stage]}`}
                    >
                      {signup.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
