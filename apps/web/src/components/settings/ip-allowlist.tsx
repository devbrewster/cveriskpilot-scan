'use client';

import { useState, useEffect, useCallback } from 'react';

interface IpAllowlistProps {
  organizationId: string;
}

/**
 * Validate a CIDR notation string (IPv4).
 */
function isValidCIDR(value: string): boolean {
  const trimmed = value.trim();

  // IPv4 with optional CIDR
  const match = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/(\d{1,2}))?$/);
  if (!match) return false;

  const octets = [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    parseInt(match[4], 10),
  ];

  if (octets.some((o) => o > 255)) return false;
  if (match[6] !== undefined && parseInt(match[6], 10) > 32) return false;

  return true;
}

export function IpAllowlist({ organizationId }: IpAllowlistProps) {
  const [enabled, setEnabled] = useState(false);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchAllowlist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/ip-allowlist');
      if (!res.ok) throw new Error('Failed to load IP allowlist');
      const data = await res.json();
      setEnabled(data.enabled);
      setAllowlist(data.allowlist);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllowlist();
  }, [fetchAllowlist]);

  const handleAddEntry = () => {
    const trimmed = newEntry.trim();
    if (!trimmed) return;

    if (!isValidCIDR(trimmed)) {
      setValidationError('Invalid format. Use CIDR notation (e.g., 10.0.0.0/8) or a single IP (e.g., 203.0.113.1)');
      return;
    }

    if (allowlist.includes(trimmed)) {
      setValidationError('This IP range is already in the list');
      return;
    }

    setAllowlist([...allowlist, trimmed]);
    setNewEntry('');
    setValidationError(null);
  };

  const handleRemoveEntry = (index: number) => {
    setAllowlist(allowlist.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/settings/ip-allowlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, allowlist }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save allowlist');
      }

      const data = await res.json();
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEntry();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">IP Allowlist</h2>
        <p className="text-sm text-gray-500">
          Restrict access to your organization to specific IP addresses or CIDR ranges.
        </p>
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

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading IP allowlist...</div>
      ) : (
        <>
          {/* Enable Toggle */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">IP Restriction</h3>
                <p className="mt-1 text-xs text-gray-500">
                  When enabled, only requests from the listed IP ranges can access your organization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  enabled ? 'bg-primary-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {enabled && allowlist.length === 0 && (
              <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-2">
                <p className="text-xs text-amber-700">
                  Add at least one IP range before saving, otherwise no one will be able to access the platform.
                </p>
              </div>
            )}
          </div>

          {/* IP Ranges */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Allowed IP Ranges</h3>

            {/* Add Entry */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={newEntry}
                  onChange={(e) => {
                    setNewEntry(e.target.value);
                    setValidationError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                    validationError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                  placeholder="e.g., 10.0.0.0/8 or 203.0.113.1"
                />
                {validationError && (
                  <p className="mt-1 text-xs text-red-600">{validationError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddEntry}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Add
              </button>
            </div>

            {/* Entries List */}
            {allowlist.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center">
                <p className="text-sm text-gray-500">No IP ranges configured.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allowlist.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <code className="rounded bg-gray-100 px-2.5 py-1 text-sm font-mono text-gray-800">
                      {entry}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (enabled && allowlist.length === 0)}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={fetchAllowlist}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
