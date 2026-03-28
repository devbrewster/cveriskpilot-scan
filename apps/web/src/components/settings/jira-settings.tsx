'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IssueType = 'Bug' | 'Task' | 'Story' | 'Epic';
type SyncDirection = 'outbound' | 'inbound' | 'bidirectional';
type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
type JiraPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

interface JiraConfig {
  cloudUrl: string;
  apiToken: string;
  userEmail: string;
  defaultProjectKey: string;
  defaultIssueType: IssueType;
  autoSync: boolean;
  syncDirection: SyncDirection;
  priorityMapping: Record<Severity, JiraPriority>;
}

type ConnectionStatus = 'disconnected' | 'connected' | 'error';

const ISSUE_TYPES: IssueType[] = ['Bug', 'Task', 'Story', 'Epic'];
const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];
const JIRA_PRIORITIES: JiraPriority[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

const SYNC_DIRECTION_LABELS: Record<SyncDirection, string> = {
  outbound: 'CVERiskPilot \u2192 Jira',
  inbound: 'Jira \u2192 CVERiskPilot',
  bidirectional: 'Bidirectional',
};

const DEFAULT_PRIORITY_MAPPING: Record<Severity, JiraPriority> = {
  Critical: 'Highest',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Info: 'Lowest',
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const styles: Record<ConnectionStatus, string> = {
    connected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    disconnected: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const dotColors: Record<ConnectionStatus, string> = {
    connected: 'bg-green-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };

  const labels: Record<ConnectionStatus, string> = {
    connected: 'Connected',
    disconnected: 'Not Connected',
    error: 'Connection Error',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[status]}`} />
      {labels[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface JiraSettingsProps {
  organizationId: string;
}

export function JiraSettings({ organizationId }: JiraSettingsProps) {
  const [config, setConfig] = useState<JiraConfig>({
    cloudUrl: '',
    apiToken: '',
    userEmail: '',
    defaultProjectKey: '',
    defaultIssueType: 'Bug',
    autoSync: false,
    syncDirection: 'outbound',
    priorityMapping: { ...DEFAULT_PRIORITY_MAPPING },
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateConfig = <K extends keyof JiraConfig>(key: K, value: JiraConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    // Clear save message on edit
    setSaveMessage(null);
  };

  const updatePriorityMapping = (severity: Severity, priority: JiraPriority) => {
    setConfig((prev) => ({
      ...prev,
      priorityMapping: { ...prev.priorityMapping, [severity]: priority },
    }));
    setSaveMessage(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestMessage(null);

    try {
      const res = await fetch('/api/settings/integrations/jira/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          cloudUrl: config.cloudUrl,
          apiToken: config.apiToken,
          userEmail: config.userEmail,
        }),
      });

      if (res.ok) {
        setConnectionStatus('connected');
        setTestMessage({ type: 'success', text: 'Successfully connected to Jira Cloud.' });
      } else {
        const data = await res.json().catch(() => ({ error: 'Connection failed' }));
        setConnectionStatus('error');
        setTestMessage({ type: 'error', text: data.error || 'Failed to connect to Jira.' });
      }
    } catch {
      setConnectionStatus('error');
      setTestMessage({ type: 'error', text: 'Network error — could not reach API.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/settings/integrations/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...config,
        }),
      });

      if (res.ok) {
        setSaveMessage({ type: 'success', text: 'Jira configuration saved.' });
      } else {
        const data = await res.json().catch(() => ({ error: 'Save failed' }));
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save configuration.' });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error — could not reach API.' });
    } finally {
      setSaving(false);
    }
  };

  const canTest = config.cloudUrl.trim() !== '' && config.apiToken.trim() !== '' && config.userEmail.trim() !== '';
  const canSave = canTest && config.defaultProjectKey.trim() !== '';

  // Shared input class
  const inputCls =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Jira Integration</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect to Jira Cloud to sync vulnerability cases as Jira issues.
          </p>
        </div>
        <ConnectionBadge status={connectionStatus} />
      </div>

      {/* Connection settings */}
      <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Connection</h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Jira Cloud URL *</label>
            <input
              type="url"
              value={config.cloudUrl}
              onChange={(e) => updateConfig('cloudUrl', e.target.value)}
              className={inputCls}
              placeholder="https://yourcompany.atlassian.net"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>User Email *</label>
              <input
                type="email"
                value={config.userEmail}
                onChange={(e) => updateConfig('userEmail', e.target.value)}
                className={inputCls}
                placeholder="admin@yourcompany.com"
              />
            </div>
            <div>
              <label className={labelCls}>API Token *</label>
              <input
                type="password"
                value={config.apiToken}
                onChange={(e) => updateConfig('apiToken', e.target.value)}
                className={inputCls}
                placeholder="Enter your Jira API token"
              />
              <p className="mt-1 text-xs text-gray-400">
                Generate at{' '}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 underline hover:text-primary-700"
                >
                  id.atlassian.com
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={!canTest || testing}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testMessage && (
              <span
                className={`text-sm font-medium ${
                  testMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {testMessage.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Project defaults */}
      <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Project Defaults</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Default Project Key *</label>
            <input
              type="text"
              value={config.defaultProjectKey}
              onChange={(e) => updateConfig('defaultProjectKey', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="VULN"
              maxLength={10}
            />
            <p className="mt-1 text-xs text-gray-400">The Jira project key where issues will be created.</p>
          </div>
          <div>
            <label className={labelCls}>Default Issue Type</label>
            <select
              value={config.defaultIssueType}
              onChange={(e) => updateConfig('defaultIssueType', e.target.value as IssueType)}
              className={inputCls}
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sync settings */}
      <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Synchronization</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className={labelCls}>Auto-sync Cases</label>
              <p className="text-xs text-gray-400">Automatically create or update Jira issues when cases change.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.autoSync}
              onClick={() => updateConfig('autoSync', !config.autoSync)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                config.autoSync ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-900 shadow ring-0 transition-transform ${
                  config.autoSync ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className={labelCls}>Sync Direction</label>
            <select
              value={config.syncDirection}
              onChange={(e) => updateConfig('syncDirection', e.target.value as SyncDirection)}
              className={inputCls}
            >
              {(Object.entries(SYNC_DIRECTION_LABELS) as [SyncDirection, string][]).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Priority mapping */}
      <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Priority Mapping</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Map CVERiskPilot severity levels to Jira priority values.
        </p>
        <div className="space-y-3">
          {SEVERITIES.map((severity) => (
            <div key={severity} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">{severity}</span>
              <span className="text-gray-400">&rarr;</span>
              <select
                value={config.priorityMapping[severity]}
                onChange={(e) => updatePriorityMapping(severity, e.target.value as JiraPriority)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {JIRA_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saveMessage && (
          <span
            className={`text-sm font-medium ${
              saveMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
}
