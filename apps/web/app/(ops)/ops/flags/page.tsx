'use client';

import { useEffect, useState, useCallback } from 'react';

interface OrgOverride {
  orgId: string;
  orgName: string;
  enabled: boolean;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: 'global' | 'org';
  orgOverrides: OrgOverride[];
  updatedAt: string;
  updatedBy: string;
}

function Toggle({
  enabled,
  onChange,
  size = 'md',
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const dotDims = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex ${dims} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        enabled ? 'bg-violet-600' : 'bg-gray-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block ${dotDims} transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          enabled ? translate : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function ScopeBadge({ scope }: { scope: 'global' | 'org' }) {
  return scope === 'global' ? (
    <span className="inline-flex items-center rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400 ring-1 ring-violet-500/30">
      Global
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400 ring-1 ring-blue-500/30">
      Per-Org
    </span>
  );
}

function FlagRow({
  flag,
  onToggle,
  onToggleOrg,
  onAddOverride,
}: {
  flag: FeatureFlag;
  onToggle: (flagId: string, enabled: boolean) => void;
  onToggleOrg: (flagId: string, orgId: string, enabled: boolean) => void;
  onAddOverride: (flagId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const overrideCount = flag.orgOverrides.length;
  const updatedDate = new Date(flag.updatedAt);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Toggle */}
        <Toggle enabled={flag.enabled} onChange={(val) => onToggle(flag.id, val)} />

        {/* Name + Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="text-sm font-semibold text-white">{flag.name}</code>
            <ScopeBadge scope={flag.scope} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{flag.description}</p>
        </div>

        {/* Override count + Expand */}
        <div className="flex items-center gap-3">
          {overrideCount > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 rounded-md bg-gray-800 px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors"
            >
              <span>{overrideCount} override{overrideCount !== 1 ? 's' : ''}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {overrideCount === 0 && (
            <span className="text-xs text-gray-600">No overrides</span>
          )}
        </div>

        {/* Last updated */}
        <div className="hidden text-right sm:block">
          <p className="text-[10px] text-gray-600">
            {updatedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <p className="text-[10px] text-gray-700">{flag.updatedBy}</p>
        </div>
      </div>

      {/* Expanded override section */}
      {expanded && (
        <div className="border-t border-gray-800 bg-gray-950/50 px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Organization Overrides
            </h4>
            <button
              onClick={() => onAddOverride(flag.id)}
              className="rounded-md bg-violet-600/20 px-2.5 py-1 text-xs font-medium text-violet-400 ring-1 ring-violet-500/30 hover:bg-violet-600/30 transition-colors"
            >
              + Add Override
            </button>
          </div>
          {flag.orgOverrides.length === 0 ? (
            <p className="py-2 text-xs text-gray-600">No organization-specific overrides configured.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-600">
                  <th className="pb-2 font-medium">Organization</th>
                  <th className="pb-2 font-medium">Org ID</th>
                  <th className="pb-2 text-right font-medium">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {flag.orgOverrides.map((override) => (
                  <tr key={override.orgId}>
                    <td className="py-2 text-xs text-gray-300">{override.orgName}</td>
                    <td className="py-2">
                      <code className="text-[11px] text-gray-500">{override.orgId}</code>
                    </td>
                    <td className="py-2 text-right">
                      <Toggle
                        enabled={override.enabled}
                        onChange={(val) => onToggleOrg(flag.id, override.orgId, val)}
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/flags');
      if (!res.ok) throw new Error('Failed to fetch flags');
      const json = await res.json();
      setFlags(json.flags);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (flagId: string, enabled: boolean) => {
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, enabled } : f)),
    );
    try {
      const res = await fetch('/api/ops/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, enabled }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      const json = await res.json();
      setFlags((prev) =>
        prev.map((f) => (f.id === json.flag.id ? json.flag : f)),
      );
    } catch {
      // Revert on error
      fetchFlags();
    }
  };

  const handleToggleOrg = async (flagId: string, orgId: string, enabled: boolean) => {
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) =>
        f.id === flagId
          ? {
              ...f,
              orgOverrides: f.orgOverrides.map((o) =>
                o.orgId === orgId ? { ...o, enabled } : o,
              ),
            }
          : f,
      ),
    );
    try {
      const res = await fetch('/api/ops/flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, enabled, orgId }),
      });
      if (!res.ok) throw new Error('Failed to update flag override');
      const json = await res.json();
      setFlags((prev) =>
        prev.map((f) => (f.id === json.flag.id ? json.flag : f)),
      );
    } catch {
      fetchFlags();
    }
  };

  const handleAddOverride = (flagId: string) => {
    const orgId = prompt('Enter Organization ID (e.g., org_example):');
    if (!orgId) return;

    const flag = flags.find((f) => f.id === flagId);
    if (flag?.orgOverrides.some((o) => o.orgId === orgId)) {
      alert('Override already exists for this organization.');
      return;
    }

    handleToggleOrg(flagId, orgId, true);
  };

  const filteredFlags =
    filter === 'all'
      ? flags
      : filter === 'enabled'
        ? flags.filter((f) => f.enabled)
        : flags.filter((f) => !f.enabled);

  const enabledCount = flags.filter((f) => f.enabled).length;
  const disabledCount = flags.filter((f) => !f.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">Loading feature flags...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Feature Flags</h2>
          <p className="mt-1 text-sm text-gray-500">
            {flags.length} flags configured — {enabledCount} enabled, {disabledCount} disabled
          </p>
        </div>
        <button
          onClick={fetchFlags}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-800/50 p-1">
        {(['all', 'enabled', 'disabled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === tab
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-[10px] opacity-70">
              {tab === 'all'
                ? flags.length
                : tab === 'enabled'
                  ? enabledCount
                  : disabledCount}
            </span>
          </button>
        ))}
      </div>

      {/* Flag list */}
      <div className="space-y-3">
        {filteredFlags.map((flag) => (
          <FlagRow
            key={flag.id}
            flag={flag}
            onToggle={handleToggle}
            onToggleOrg={handleToggleOrg}
            onAddOverride={handleAddOverride}
          />
        ))}
        {filteredFlags.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-600">
            No flags match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
