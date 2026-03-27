'use client';

import { useState, useEffect } from 'react';

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

type ConnectorType = 'nessus' | 'qualys' | 'openvas' | 'generic';

const CONNECTOR_TYPE_LABELS: Record<ConnectorType, string> = {
  nessus: 'Tenable Nessus',
  qualys: 'Qualys',
  openvas: 'OpenVAS / Greenbone',
  generic: 'Generic Scanner',
};

const DEPLOYMENT_INSTRUCTIONS: Record<ConnectorType, string> = {
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
// Register form
// ---------------------------------------------------------------------------

function RegisterConnectorForm({
  organizationId,
  onRegistered,
}: {
  organizationId: string;
  onRegistered: (authKey: string) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ConnectorType>('nessus');
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
            onChange={(e) => setType(e.target.value as ConnectorType)}
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
// Main component
// ---------------------------------------------------------------------------

interface ConnectorSettingsProps {
  organizationId: string;
}

export function ConnectorSettings({ organizationId }: ConnectorSettingsProps) {
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [newAuthKey, setNewAuthKey] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);
  const [rotatingKey, setRotatingKey] = useState<string | null>(null);

  const fetchConnectors = async () => {
    try {
      const res = await fetch(`/api/connectors?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, [organizationId]);

  const handleRegistered = (authKey: string) => {
    setNewAuthKey(authKey);
    setShowRegister(false);
    fetchConnectors();
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
      }
    } catch {
      // silent
    } finally {
      setRotatingKey(null);
    }
  };

  const handleDelete = async (connectorId: string) => {
    if (!confirm('Are you sure you want to delete this connector?')) return;
    try {
      await fetch(`/api/connectors/${connectorId}`, { method: 'DELETE' });
      fetchConnectors();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scanner Connectors</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage scanner integrations for automated vulnerability data collection.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRegister(!showRegister)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showRegister ? 'Cancel' : 'Register Connector'}
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
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Register New Connector</h3>
          <RegisterConnectorForm organizationId={organizationId} onRegistered={handleRegistered} />
        </div>
      )}

      {/* Connector list */}
      {connectors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No connectors registered yet. Click "Register Connector" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {connectors.map((connector) => (
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
                      {CONNECTOR_TYPE_LABELS[connector.type as ConnectorType] ?? connector.type}
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
                    Deployment Instructions ({CONNECTOR_TYPE_LABELS[connector.type as ConnectorType] ?? connector.type})
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-green-400">
                    {(DEPLOYMENT_INSTRUCTIONS[connector.type as ConnectorType] ?? DEPLOYMENT_INSTRUCTIONS.generic)
                      .replace(/<ID>/g, connector.id)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
