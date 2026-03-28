'use client';

import { useEffect, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditAction =
  | 'IMPERSONATE'
  | 'VIEW_CUSTOMER'
  | 'TOGGLE_FLAG'
  | 'UPDATE_TIER'
  | 'RESET_PASSWORD'
  | 'DISABLE_ACCOUNT'
  | 'EDIT_BILLING'
  | 'SEND_ANNOUNCEMENT';

interface AuditEntry {
  id: string;
  timestamp: string;
  staffEmail: string;
  action: AuditAction;
  targetOrg: string;
  details: string;
  ip: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_BADGE_COLORS: Record<string, string> = {
  IMPERSONATE: 'bg-red-500/20 text-red-400 ring-red-500/30',
  VIEW_CUSTOMER: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
  TOGGLE_FLAG: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  EDIT_BILLING: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  UPDATE_TIER: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  SEND_ANNOUNCEMENT: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
  RESET_PASSWORD: 'bg-purple-500/20 text-purple-400 ring-purple-500/30',
  DISABLE_ACCOUNT: 'bg-red-500/20 text-red-300 ring-red-500/30',
};

const STAFF_EMAILS = [
  'admin@cveriskpilot.com',
  'ops@cveriskpilot.com',
  'support@cveriskpilot.com',
  'billing@cveriskpilot.com',
];

const ACTION_TYPES: AuditAction[] = [
  'IMPERSONATE',
  'VIEW_CUSTOMER',
  'TOGGLE_FLAG',
  'UPDATE_TIER',
  'RESET_PASSWORD',
  'DISABLE_ACCOUNT',
  'EDIT_BILLING',
  'SEND_ANNOUNCEMENT',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [staffFilter, setStaffFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (staffFilter) params.set('staffEmail', staffFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/ops/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load audit log');
      const json: AuditResponse = await res.json();
      setEntries(json.entries);
      setTotalCount(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [staffFilter, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Staff Audit Log</h2>
        <p className="mt-1 text-sm text-gray-400">
          All internal staff actions on customer data.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Staff Email
          </label>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="">All staff</option>
            {STAFF_EMAILS.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Action Type
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="">All actions</option>
            {ACTION_TYPES.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <button
          onClick={() => {
            setStaffFilter('');
            setActionFilter('');
            setDateFrom('');
            setDateTo('');
          }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors"
        >
          Clear filters
        </button>

        <div className="ml-auto text-xs text-gray-500">
          {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No audit log entries match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Staff Email</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Target Org</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                  <th className="px-6 py-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="whitespace-nowrap px-6 py-3 text-gray-400">
                      {new Date(entry.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3 text-gray-300">{entry.staffEmail}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${
                          ACTION_BADGE_COLORS[entry.action] ??
                          'bg-gray-500/20 text-gray-400 ring-gray-500/30'
                        }`}
                      >
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-white">{entry.targetOrg}</td>
                    <td className="max-w-xs truncate px-6 py-3 text-gray-400" title={entry.details}>
                      {entry.details}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-gray-500">
                      {entry.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
