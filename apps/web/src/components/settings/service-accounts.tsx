'use client';

import { useState, useEffect, useCallback } from 'react';

interface ServiceAccountApiKey {
  id: string;
  name: string;
  keyPreview: string;
  scope: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ServiceAccount {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  apiKeys: ServiceAccountApiKey[];
}

interface ServiceAccountsProps {
  organizationId: string;
}

export function ServiceAccounts({ organizationId }: ServiceAccountsProps) {
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newResult, setNewResult] = useState<{
    serviceAccount: { name: string };
    apiKey: { key: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createScopes, setCreateScopes] = useState('read,upload');
  const [creating, setCreating] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/service-accounts');
      if (!res.ok) throw new Error('Failed to load service accounts');
      const data = await res.json();
      setAccounts(data.serviceAccounts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/service-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          scopes: createScopes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create service account');
      }

      const data = await res.json();
      setNewResult(data);
      setShowCreateForm(false);
      setCreateName('');
      setCreateScopes('read,upload');
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service account');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Service Accounts</h2>
          <p className="text-sm text-gray-500">
            Create service accounts for CI/CD pipelines and automated integrations.
          </p>
        </div>
        {!showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Create Service Account
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* New Key Banner */}
      {newResult && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Copy the API key now - it will not be shown again
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Service Account: {newResult.serviceAccount.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-gray-900 border border-amber-200 select-all">
              {newResult.apiKey.key}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(newResult.apiKey.key)}
              className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewResult(null)}
            className="text-xs text-amber-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-gray-200 bg-white p-6 space-y-4"
        >
          <h3 className="text-md font-semibold text-gray-900">New Service Account</h3>

          <div>
            <label htmlFor="sa-name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="sa-name"
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., GitHub Actions, Jenkins Pipeline"
            />
          </div>

          <div>
            <label htmlFor="sa-scopes" className="block text-sm font-medium text-gray-700">
              Permissions
            </label>
            <select
              id="sa-scopes"
              value={createScopes}
              onChange={(e) => setCreateScopes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="read">Read Only</option>
              <option value="read,upload">Read + Upload (recommended for CI/CD)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Choose the minimum permissions needed for the integration.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Service Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Accounts List */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading service accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No service accounts created yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Create a service account for CI/CD pipeline integrations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((sa) => (
            <div
              key={sa.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-gray-900">{sa.name}</h3>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        sa.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {sa.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{sa.email}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>Created {formatDate(sa.createdAt)}</p>
                  <p>Last used {formatDate(sa.lastLoginAt)}</p>
                </div>
              </div>

              {sa.apiKeys.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">API Keys</p>
                  {sa.apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between text-xs text-gray-600"
                    >
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono">
                          {key.keyPreview}
                        </code>
                        <span className="text-gray-400">
                          {key.scope.split(',').join(', ')}
                        </span>
                      </div>
                      <span className="text-gray-400">
                        Last used: {formatDate(key.lastUsedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
