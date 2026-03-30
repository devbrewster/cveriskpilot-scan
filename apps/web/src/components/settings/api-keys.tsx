'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { fetchWithCsrf } from '@/lib/csrf';

const ITEMS_PER_PAGE = 10;

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

export function ApiKeys({ organizationId: _organizationId }: ApiKeysProps) {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'primary' | 'danger';
    confirmLabel: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'primary', confirmLabel: 'Confirm', onConfirm: () => {} });

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createScopes, setCreateScopes] = useState('read');
  const [createExpiresAt, setCreateExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/keys');
      if (!res.ok) {
        const text = await res.text();
        let msg = 'Failed to load API keys';
        try { msg = JSON.parse(text).error ?? msg; } catch { /* non-JSON response */ }
        throw new Error(msg);
      }
      const data = await res.json();
      setKeys(data.keys ?? []);
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
      const res = await fetchWithCsrf('/api/keys', {
        method: 'POST',
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

  const handleRevoke = (id: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: 'Revoke API Key',
      message: `Are you sure you want to revoke the API key "${name}"? This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Revoke',
      onConfirm: async () => {
        try {
          const res = await fetchWithCsrf(`/api/keys/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error ?? 'Failed to revoke key');
          }
          await fetchKeys();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to revoke key');
        }
      },
    });
  };

  const handleRotate = (id: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: 'Rotate API Key',
      message: `Rotate the API key "${name}"? The old key will immediately stop working.`,
      variant: 'primary',
      confirmLabel: 'Rotate',
      onConfirm: async () => {
        try {
          const res = await fetchWithCsrf(`/api/keys/${id}`, { method: 'PUT' });
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
      },
    });
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
    pipeline: 'Pipeline',
    admin: 'Admin',
    scim: 'SCIM',
  };

  const totalPages = Math.ceil(keys.length / ITEMS_PER_PAGE);
  const paginatedKeys = keys.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

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

      {/* Quick Start: crp-scan CLI setup */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800/50 p-5">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline Scanner Setup</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Scan your codebase for vulnerabilities, secrets, and compliance gaps — results upload to your dashboard automatically.
            </p>
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">1. Create a key with Pipeline scope above, then run:</p>
              </div>
              <div className="rounded-md bg-gray-900 p-3">
                <code className="block text-xs text-green-400 font-mono whitespace-pre-wrap">{`npx @cveriskpilot/scan --preset startup --api-key <your-key>`}</code>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-2">Or set the key as an environment variable:</p>
              </div>
              <div className="rounded-md bg-gray-900 p-3 space-y-1">
                <code className="block text-xs text-green-400 font-mono">{`export CRP_API_KEY=crp_your_key_here`}</code>
                <code className="block text-xs text-green-400 font-mono">{`npx @cveriskpilot/scan --preset startup`}</code>
              </div>
              <details className="mt-2">
                <summary className="text-xs font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:text-primary-800">
                  More presets &amp; CI/CD examples
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="rounded-md bg-gray-900 p-3 space-y-1">
                    <code className="block text-xs text-gray-400 font-mono"># Available presets</code>
                    <code className="block text-xs text-green-400 font-mono">npx @cveriskpilot/scan --preset startup    <span className="text-gray-500"># SOC 2 + ASVS</span></code>
                    <code className="block text-xs text-green-400 font-mono">npx @cveriskpilot/scan --preset enterprise <span className="text-gray-500"># NIST + SOC 2 + ASVS</span></code>
                    <code className="block text-xs text-green-400 font-mono">npx @cveriskpilot/scan --preset federal    <span className="text-gray-500"># NIST + CMMC + FedRAMP</span></code>
                    <code className="block text-xs text-green-400 font-mono">npx @cveriskpilot/scan --preset devsecops  <span className="text-gray-500"># SSDF + ASVS</span></code>
                    <code className="block text-xs text-green-400 font-mono">npx @cveriskpilot/scan --preset defense    <span className="text-gray-500"># CMMC + NIST + FedRAMP</span></code>
                    <code className="block text-xs text-green-400 font-mono">npx @cveriskpilot/scan --preset all        <span className="text-gray-500"># All 6 frameworks</span></code>
                  </div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">GitHub Actions:</p>
                  <div className="rounded-md bg-gray-900 p-3">
                    <code className="block text-xs text-green-400 font-mono whitespace-pre-wrap">{`- name: CVERiskPilot Scan
  run: npx @cveriskpilot/scan --preset startup --ci
  env:
    CRP_API_KEY: \${{ secrets.CRP_API_KEY }}`}</code>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
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
            <code className="flex-1 rounded bg-white dark:bg-gray-900 px-3 py-2 text-sm font-mono text-gray-900 border border-amber-200 select-all">
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
          className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 space-y-4"
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
              <option value="pipeline">Pipeline (CI/CD Scanner)</option>
              <option value="read,upload,pipeline">Read + Upload + Pipeline</option>
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
              className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
            Create an API key to connect the pipeline scanner or integrate with your CI/CD.
          </p>
          <button
            type="button"
            onClick={() => { setCreateScopes('pipeline'); setShowCreateModal(true); }}
            className="mt-3 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Create Pipeline Key
          </button>
        </div>
      ) : (
        <>
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
              {paginatedKeys.map((key) => (
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
        </>
      )}

      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        title={confirmDialog.title}
        onConfirm={confirmDialog.onConfirm}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.variant}
      >
        <p>{confirmDialog.message}</p>
      </Dialog>
    </div>
  );
}
