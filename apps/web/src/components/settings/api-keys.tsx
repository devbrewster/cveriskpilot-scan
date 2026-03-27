'use client';

import { useState, useEffect, useCallback } from 'react';

interface ApiKeyEntry {
  id: string;
  name: string;
  keyPreview: string;
  scope: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeysProps {
  organizationId: string;
}

export function ApiKeys({ organizationId }: ApiKeysProps) {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createScopes, setCreateScopes] = useState('read');
  const [createExpiresAt, setCreateExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/keys');
      if (!res.ok) throw new Error('Failed to load API keys');
      const data = await res.json();
      setKeys(data.keys);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          scopes: createScopes,
          expiresAt: createExpiresAt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create API key');
      }

      const data = await res.json();
      setNewKeyResult({ key: data.key, name: data.name });
      setShowCreateModal(false);
      setCreateName('');
      setCreateScopes('read');
      setCreateExpiresAt('');
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke the API key "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to revoke key');
      }
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke key');
    }
  };

  const handleRotate = async (id: string, name: string) => {
    if (!confirm(`Rotate the API key "${name}"? The old key will immediately stop working.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'PUT' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to rotate key');
      }

      const data = await res.json();
      setNewKeyResult({ key: data.key, name });
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate key');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
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

  const scopeLabels: Record<string, string> = {
    read: 'Read',
    upload: 'Upload',
    admin: 'Admin',
    scim: 'SCIM',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500">
            Manage API keys for programmatic access to CVERiskPilot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Create API Key
        </button>
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

      {/* New Key Display (shown once after create/rotate) */}
      {newKeyResult && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Copy your API key now - it will not be shown again
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Key: {newKeyResult.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-gray-900 border border-amber-200 select-all">
              {newKeyResult.key}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(newKeyResult.key)}
              className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewKeyResult(null)}
            className="text-xs text-amber-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-gray-200 bg-white p-6 space-y-4"
        >
          <h3 className="text-md font-semibold text-gray-900">Create New API Key</h3>

          <div>
            <label htmlFor="key-name" className="block text-sm font-medium text-gray-700">
              Key Name
            </label>
            <input
              id="key-name"
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., CI/CD Pipeline"
            />
          </div>

          <div>
            <label htmlFor="key-scopes" className="block text-sm font-medium text-gray-700">
              Scopes
            </label>
            <select
              id="key-scopes"
              value={createScopes}
              onChange={(e) => setCreateScopes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="read">Read Only</option>
              <option value="read,upload">Read + Upload</option>
              <option value="admin">Admin (Full Access)</option>
              <option value="scim">SCIM Provisioning</option>
            </select>
          </div>

          <div>
            <label htmlFor="key-expires" className="block text-sm font-medium text-gray-700">
              Expires At (optional)
            </label>
            <input
              id="key-expires"
              type="date"
              value={createExpiresAt}
              onChange={(e) => setCreateExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave empty for a key that never expires.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Keys Table */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading API keys...</div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No API keys created yet.</p>
          <p className="mt-1 text-xs text-gray-400">
            Create an API key for programmatic access.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Scopes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Used
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{key.name}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                      {key.keyPreview}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.scope.split(',').map((s) => (
                        <span
                          key={s}
                          className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {scopeLabels[s.trim()] ?? s.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {key.expiresAt ? (
                      <span
                        className={
                          new Date(key.expiresAt) < new Date()
                            ? 'text-red-600 font-medium'
                            : ''
                        }
                      >
                        {formatDate(key.expiresAt)}
                        {new Date(key.expiresAt) < new Date() && ' (expired)'}
                      </span>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(key.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleRotate(key.id, key.name)}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        Rotate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevoke(key.id, key.name)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
