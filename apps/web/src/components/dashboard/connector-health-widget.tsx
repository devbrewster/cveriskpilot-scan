'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectorStatus = 'online' | 'offline' | 'degraded' | 'pending';
type SyncJobStatus = 'PENDING' | 'RUNNING' | 'POLLING' | 'DOWNLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface ConnectorHealth {
  id: string;
  name: string;
  type: string;
  status: ConnectorStatus;
  isApiConnector: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: SyncJobStatus | null;
  lastSyncError: string | null;
  syncIntervalMinutes: number;
  nextSyncAt: string | null;
}

interface ConnectorHealthWidgetProps {
  organizationId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ConnectorStatus, string> = {
  online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_DOT: Record<ConnectorStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-red-500',
  degraded: 'bg-amber-500',
  pending: 'bg-gray-400',
};

const SYNC_STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  FAILED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  RUNNING: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const SCANNER_TYPE_LABELS: Record<string, string> = {
  TENABLE_IO: 'Tenable.io',
  QUALYS_VMDR: 'Qualys VMDR',
  CROWDSTRIKE_SPOTLIGHT: 'CrowdStrike',
  RAPID7_INSIGHTVM: 'Rapid7',
  SNYK: 'Snyk',
  nessus: 'Nessus',
  qualys: 'Qualys',
  openvas: 'OpenVAS',
  generic: 'Generic',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeUntil(dateStr: string | null): string {
  if (!dateStr) return '-';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Overdue';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function LinkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-1.122a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364l1.757 1.757" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ExclamationTriangleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function ConnectorHealthWidget({ organizationId }: ConnectorHealthWidgetProps) {
  const [connectors, setConnectors] = useState<ConnectorHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch(`/api/connectors?organizationId=${encodeURIComponent(organizationId)}&includeHealth=true`);
      if (res.ok) {
        const data = await res.json();
        setConnectors(
          (data.connectors ?? []).filter((c: ConnectorHealth) => c.isApiConnector),
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleSyncNow = async (connectorId: string) => {
    setSyncingId(connectorId);
    try {
      await fetch(`/api/connectors/${encodeURIComponent(connectorId)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      // Refresh after a short delay to show updated status
      setTimeout(fetchConnectors, 2000);
    } catch {
      // silent
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (connectors.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-center">
        <LinkIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No API connectors configured.</p>
        <a
          href="/settings#connectors"
          className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Set up a connector
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connectors.map((connector) => (
        <div
          key={connector.id}
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {connector.name}
                </h4>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[connector.status]}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[connector.status]}`} />
                  {connector.status.charAt(0).toUpperCase() + connector.status.slice(1)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {SCANNER_TYPE_LABELS[connector.type] ?? connector.type}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSyncNow(connector.id)}
              disabled={syncingId === connector.id}
              className="shrink-0 rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {syncingId === connector.id ? (
                <span className="flex items-center gap-1">
                  <SpinnerIcon className="h-3 w-3" />
                  Syncing
                </span>
              ) : (
                'Sync Now'
              )}
            </button>
          </div>

          {/* Sync info */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Last sync: {timeAgo(connector.lastSyncAt)}</span>
            {connector.lastSyncStatus && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                SYNC_STATUS_COLORS[connector.lastSyncStatus] ?? SYNC_STATUS_COLORS.PENDING
              }`}>
                {connector.lastSyncStatus}
              </span>
            )}
            <span>Next: {timeUntil(connector.nextSyncAt)}</span>
          </div>

          {/* Error indicator */}
          {connector.lastSyncError && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{connector.lastSyncError}</span>
            </div>
          )}
        </div>
      ))}

      {/* Management link */}
      <div className="text-center">
        <a
          href="/settings#connectors"
          className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Manage connectors
        </a>
      </div>
    </div>
  );
}
