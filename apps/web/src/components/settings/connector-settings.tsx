'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';
import { ApiConnectorWizard } from './api-connector-wizard';
import { SyncHistory } from './sync-history';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectorRecord {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  status: string;
  schedule: string | null;
  isApiConnector?: boolean;
  syncIntervalMinutes?: number;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
  lastHeartbeat: string | null;
  lastHeartbeatData?: {
    version?: string;
    scannerVersion?: string;
    metrics?: {
      activeScanCount?: number;
      queuedScanCount?: number;
    };
  } | null;
  createdAt: string;
}

type AgentConnectorType = 'nessus' | 'qualys' | 'openvas' | 'generic';
type ApiScannerType = 'TENABLE_IO' | 'QUALYS_VMDR' | 'CROWDSTRIKE_SPOTLIGHT' | 'RAPID7_INSIGHTVM' | 'SNYK';
type TabId = 'agent' | 'api';

const CONNECTOR_TYPE_LABELS: Record<AgentConnectorType, string> = {
  nessus: 'Tenable Nessus',
  qualys: 'Qualys',
  openvas: 'OpenVAS / Greenbone',
  generic: 'Generic Scanner',
};

const API_SCANNER_LABELS: Record<ApiScannerType, string> = {
  TENABLE_IO: 'Tenable.io',
  QUALYS_VMDR: 'Qualys VMDR',
  CROWDSTRIKE_SPOTLIGHT: 'CrowdStrike Falcon',
  RAPID7_INSIGHTVM: 'Rapid7 InsightVM',
  SNYK: 'Snyk',
};

const DEPLOYMENT_INSTRUCTIONS: Record<AgentConnectorType, string> = {
  nessus: `# Install the CVERiskPilot Nessus Connector
curl -sSL https://get.cveriskpilot.com/connector/nessus | bash

# Configure with your auth key
cveriskpilot-connector configure \\
  --type nessus \\
  --endpoint https://your-nessus:8834 \\
  --auth-key <YOUR_AUTH_KEY> \\
  --callback-url https://app.cveriskpilot.com/api/connectors/<ID>/heartbeat`,
  qualys: `# Install the CVERiskPilot Qualys Connector
curl -sSL https://get.cveriskpilot.com/connector/qualys | bash

# Configure with your Qualys API credentials
cveriskpilot-connector configure \\
  --type qualys \\
  --endpoint https://qualysapi.qualys.com \\
  --auth-key <YOUR_AUTH_KEY> \\
  --callback-url https://app.cveriskpilot.com/api/connectors/<ID>/heartbeat`,
  openvas: `# Install the CVERiskPilot OpenVAS Connector
curl -sSL https://get.cveriskpilot.com/connector/openvas | bash

# Configure with your GVM connection
cveriskpilot-connector configure \\
  --type openvas \\
  --endpoint https://your-gvm:9390 \\
  --auth-key <YOUR_AUTH_KEY> \\
  --callback-url https://app.cveriskpilot.com/api/connectors/<ID>/heartbeat`,
  generic: `# Install the CVERiskPilot Generic Connector
curl -sSL https://get.cveriskpilot.com/connector/generic | bash

# Configure with your scanner endpoint
cveriskpilot-connector configure \\
  --type generic \\
  --endpoint https://your-scanner:8080 \\
  --auth-key <YOUR_AUTH_KEY> \\
  --callback-url https://app.cveriskpilot.com/api/connectors/<ID>/heartbeat`,
};

const SYNC_INTERVAL_LABELS: Record<number, string> = {
  15: '15min',
  30: '30min',
  60: '1hr',
  240: '4hr',
  720: '12hr',
  1440: '24hr',
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    offline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };

  const dotColors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-amber-500',
    pending: 'bg-gray-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status] ?? dotColors.pending}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
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

// ---------------------------------------------------------------------------
// Register form (agent connectors)
// ---------------------------------------------------------------------------

function RegisterConnectorForm({
  organizationId,
  onRegistered,
}: {
  organizationId: string;
  onRegistered: (authKey: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AgentConnectorType>('nessus');
  const [endpoint, setEndpoint] = useState('');
  const [schedule, setSchedule] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name,
          type,
          endpoint,
          schedule: schedule || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register');
      }

      const data = await res.json();
      onRegistered(data.authKey);
      setName('');
      setEndpoint('');
      setSchedule('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            placeholder="Production Nessus"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AgentConnectorType)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {Object.entries(CONNECTOR_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Endpoint URL *</label>
        <input
          type="url"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="https://nessus.internal:8834"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Schedule (cron)</label>
        <input
          type="text"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="0 2 * * * (daily at 2 AM)"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !name || !endpoint}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Registering...' : 'Register Connector'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  open,
  connectorName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  connectorName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Connector</h3>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete <span className="font-semibold">{connectorName}</span>? This will remove all sync history and configuration. This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Connectors tab content
// ---------------------------------------------------------------------------

function AgentConnectorsTab({
  organizationId,
  connectors,
  onRefresh,
}: {
  organizationId: string;
  connectors: ConnectorRecord[];
  onRefresh: () => void;
}) {
  const [showRegister, setShowRegister] = useState(false);
  const [newAuthKey, setNewAuthKey] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);
  const [rotatingKey, setRotatingKey] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  const agentConnectors = connectors.filter((c) => !c.isApiConnector);

  const handleRegistered = (authKey: string) => {
    setNewAuthKey(authKey);
    setShowRegister(false);
    onRefresh();
  };

  const handleRotateKey = async (connectorId: string) => {
    setRotatingKey(connectorId);
    try {
      const res = await fetch(`/api/connectors/${connectorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotateKey: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewAuthKey(data.authKey);
      } else {
        addToast('error', 'Failed to rotate authentication key');
      }
    } catch {
      addToast('error', 'Failed to rotate authentication key');
    } finally {
      setRotatingKey(null);
    }
  };

  const handleDelete = (connectorId: string) => {
    setPendingDeleteId(connectorId);
    setConfirmDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await fetch(`/api/connectors/${pendingDeleteId}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      addToast('error', 'Failed to delete connector');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Deploy lightweight agents alongside your scanners for automated data collection.
        </p>
        <button
          type="button"
          onClick={() => setShowRegister(!showRegister)}
          className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showRegister ? 'Cancel' : 'Register Agent'}
        </button>
      </div>

      {/* Auth key alert */}
      {newAuthKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
            Authentication Key (save this now — it will not be shown again):
          </p>
          <code className="mt-1 block break-all rounded bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
            {newAuthKey}
          </code>
          <button
            type="button"
            onClick={() => setNewAuthKey(null)}
            className="mt-2 text-xs text-amber-700 underline hover:text-amber-800 dark:text-amber-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Register form */}
      {showRegister && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Register New Agent Connector</h3>
          <RegisterConnectorForm organizationId={organizationId} onRegistered={handleRegistered} />
        </div>
      )}

      {/* Connector list */}
      {agentConnectors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No agent connectors registered yet. Click "Register Agent" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {agentConnectors.map((connector) => (
            <div
              key={connector.id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{connector.name}</h4>
                      <StatusBadge status={connector.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {CONNECTOR_TYPE_LABELS[connector.type as AgentConnectorType] ?? connector.type}
                      {' — '}
                      {connector.endpoint}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInstructions(showInstructions === connector.id ? null : connector.id)}
                    className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    Deploy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateKey(connector.id)}
                    disabled={rotatingKey === connector.id}
                    className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    {rotatingKey === connector.id ? 'Rotating...' : 'Rotate Key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(connector.id)}
                    className="rounded border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Heartbeat info */}
              <div className="mt-3 flex gap-6 text-xs text-gray-500 dark:text-gray-400">
                <span>Last seen: {timeAgo(connector.lastHeartbeat)}</span>
                {connector.schedule && <span>Schedule: {connector.schedule}</span>}
                {connector.lastHeartbeatData?.version && (
                  <span>Agent: v{connector.lastHeartbeatData.version}</span>
                )}
                {connector.lastHeartbeatData?.scannerVersion && (
                  <span>Scanner: v{connector.lastHeartbeatData.scannerVersion}</span>
                )}
                {connector.lastHeartbeatData?.metrics?.activeScanCount !== undefined && (
                  <span>Active scans: {connector.lastHeartbeatData.metrics.activeScanCount}</span>
                )}
              </div>

              {/* Deployment instructions */}
              {showInstructions === connector.id && (
                <div className="mt-4 rounded-lg bg-gray-900 p-4 dark:bg-gray-950">
                  <p className="mb-2 text-xs font-medium text-gray-400">
                    Deployment Instructions ({CONNECTOR_TYPE_LABELS[connector.type as AgentConnectorType] ?? connector.type})
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-green-400">
                    {(DEPLOYMENT_INSTRUCTIONS[connector.type as AgentConnectorType] ?? DEPLOYMENT_INSTRUCTIONS.generic)
                      .replace(/<ID>/g, connector.id)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete Connector"
        onConfirm={executeDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
      >
        <p>Are you sure you want to delete this connector?</p>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Connectors tab content
// ---------------------------------------------------------------------------

function ApiConnectorsTab({
  organizationId,
  connectors,
  onRefresh,
}: {
  organizationId: string;
  connectors: ConnectorRecord[];
  onRefresh: () => void;
}) {
  const [showWizard, setShowWizard] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConnectorRecord | null>(null);
  const { addToast } = useToast();

  const apiConnectors = connectors.filter((c) => c.isApiConnector);

  const handleSyncNow = async (connectorId: string) => {
    setSyncingId(connectorId);
    try {
      await fetch(`/api/connectors/${encodeURIComponent(connectorId)}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      setTimeout(onRefresh, 2000);
    } catch {
      addToast('error', 'Failed to trigger sync');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/connectors/${deleteTarget.id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      addToast('error', 'Failed to delete connector');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect directly to scanner APIs for automated vulnerability data sync.
        </p>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add API Connector
        </button>
      </div>

      {/* Wizard */}
      <ApiConnectorWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={() => {
          setShowWizard(false);
          onRefresh();
        }}
        organizationId={organizationId}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        connectorName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Connector list */}
      {apiConnectors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <div className="flex flex-col items-center">
            <ShieldIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No API connectors configured yet. Click "Add API Connector" to set up automated sync.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {apiConnectors.map((connector) => {
            const isExpanded = expandedId === connector.id;
            return (
              <div
                key={connector.id}
                className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        <ShieldIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{connector.name}</h4>
                          <StatusBadge status={connector.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {API_SCANNER_LABELS[connector.type as ApiScannerType] ?? connector.type}
                          {' — '}
                          {connector.endpoint}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSyncNow(connector.id)}
                        disabled={syncingId === connector.id}
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
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
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(connector)}
                        className="rounded border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Sync info */}
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Last sync: {timeAgo(connector.lastSyncAt ?? null)}</span>
                    {connector.syncIntervalMinutes && (
                      <span>Interval: {SYNC_INTERVAL_LABELS[connector.syncIntervalMinutes] ?? `${connector.syncIntervalMinutes}min`}</span>
                    )}
                    {connector.lastSyncError && (
                      <span className="text-red-500 dark:text-red-400" title={connector.lastSyncError}>
                        Error: {connector.lastSyncError.length > 60 ? connector.lastSyncError.slice(0, 60) + '...' : connector.lastSyncError}
                      </span>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : connector.id)}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    {isExpanded ? 'Hide sync history' : 'Show sync history'}
                  </button>
                </div>

                {/* Inline sync history */}
                {isExpanded && (
                  <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
                    <SyncHistory connectorId={connector.id} organizationId={organizationId} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ConnectorSettingsProps {
  organizationId: string;
}

export function ConnectorSettings({ organizationId }: ConnectorSettingsProps) {
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('api');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchConnectors = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetch(`/api/connectors?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors);
      } else {
        setFetchError('Failed to load connectors');
      }
    } catch {
      setFetchError('Failed to load connectors');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const agentCount = connectors.filter((c) => !c.isApiConnector).length;
  const apiCount = connectors.filter((c) => c.isApiConnector).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scanner Connectors</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage scanner integrations for automated vulnerability data collection.
        </p>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {fetchError}
          <button type="button" onClick={fetchConnectors} className="ml-2 font-medium underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6" aria-label="Connector tabs">
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'api'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            API Connectors
            {apiCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                {apiCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agent')}
            className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'agent'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Agent Connectors
            {agentCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                {agentCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'api' ? (
        <ApiConnectorsTab organizationId={organizationId} connectors={connectors} onRefresh={fetchConnectors} />
      ) : (
        <AgentConnectorsTab organizationId={organizationId} connectors={connectors} onRefresh={fetchConnectors} />
      )}
    </div>
  );
}
