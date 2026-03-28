'use client';

import { useState, useMemo } from 'react';
import { demoAuditEntries } from '@/lib/demo-data';
import type { DemoAuditEntry } from '@/lib/demo-data';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const ACTIONS: DemoAuditEntry['action'][] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATE_CHANGE',
  'RISK_EXCEPTION',
  'EXPORT',
  'LOGIN',
  'LOGOUT',
];

const ENTITY_TYPES = [
  'VulnerabilityCase',
  'Finding',
  'User',
  'ScanArtifact',
  'RiskException',
  'Report',
];

const ACTION_COLORS: Record<DemoAuditEntry['action'], string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  STATE_CHANGE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  RISK_EXCEPTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  EXPORT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  LOGIN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '\u2026' : text;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DemoAuditLogPage() {
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [entityFilter, setEntityFilter] = useState<string>('All');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return demoAuditEntries.filter((e) => {
      if (actionFilter !== 'All' && e.action !== actionFilter) return false;
      if (entityFilter !== 'All' && e.entityType !== entityFilter) return false;
      return true;
    });
  }, [actionFilter, entityFilter]);

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setActionFilter('All');
    setEntityFilter('All');
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
        Viewing demo audit log. Data shown is simulated.
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Immutable record of all security-relevant actions.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="All">All Actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="All">All Entity Types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {(actionFilter !== 'All' || entityFilter !== 'All') && (
          <button
            onClick={clearFilters}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-neutral-400">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity Type</th>
              <th className="px-4 py-3">Entity ID</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((entry) => {
              const isExpanded = expandedRows.has(entry.id);
              return (
                <tr
                  key={entry.id}
                  onClick={() => toggleRow(entry.id)}
                  className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[entry.action]}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">{entry.entityType}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {truncate(entry.entityId, 16)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <div className="font-medium">{entry.actor.name}</div>
                      <div className="text-xs text-neutral-400">{entry.actor.email}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {entry.actorIp}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    {isExpanded ? (
                      <span>{entry.details}</span>
                    ) : (
                      <span>{truncate(entry.details, 48)}</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neutral-400"
                >
                  No audit log entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
