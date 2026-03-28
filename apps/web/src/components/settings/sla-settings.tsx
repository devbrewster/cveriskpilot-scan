'use client';

import { useState, useEffect, useCallback } from 'react';

interface SlaPolicy {
  id: string;
  name: string;
  description: string | null;
  criticalDays: number;
  highDays: number;
  mediumDays: number;
  lowDays: number;
  kevCriticalDays: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { vulnerabilityCases: number };
}

interface SlaPolicyFormData {
  name: string;
  description: string;
  criticalDays: number;
  highDays: number;
  mediumDays: number;
  lowDays: number;
  kevCriticalDays: number;
  isDefault: boolean;
}

const DEFAULT_FORM: SlaPolicyFormData = {
  name: '',
  description: '',
  criticalDays: 7,
  highDays: 30,
  mediumDays: 90,
  lowDays: 180,
  kevCriticalDays: 3,
  isDefault: false,
};

interface SlaSettingsProps {
  organizationId: string;
}

export function SlaSettings({ organizationId }: SlaSettingsProps) {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlaPolicyFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sla?organizationId=${organizationId}`);
      if (!res.ok) throw new Error('Failed to load policies');
      const data = await res.json();
      setPolicies(data.policies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleEdit = (policy: SlaPolicy) => {
    setEditingId(policy.id);
    setForm({
      name: policy.name,
      description: policy.description ?? '',
      criticalDays: policy.criticalDays,
      highDays: policy.highDays,
      mediumDays: policy.mediumDays,
      lowDays: policy.lowDays,
      kevCriticalDays: policy.kevCriticalDays,
      isDefault: policy.isDefault,
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        const res = await fetch(`/api/sla/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to update policy');
        }
      } else {
        const res = await fetch('/api/sla', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, organizationId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to create policy');
        }
      }
      handleCancel();
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SLA policy?')) return;

    try {
      const res = await fetch(`/api/sla/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to delete policy');
      }
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const severityFields = [
    { key: 'criticalDays' as const, label: 'Critical', color: 'bg-red-100 text-red-800' },
    { key: 'highDays' as const, label: 'High', color: 'bg-orange-100 text-orange-800' },
    { key: 'mediumDays' as const, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'lowDays' as const, label: 'Low', color: 'bg-blue-100 text-blue-800' },
    { key: 'kevCriticalDays' as const, label: 'KEV Critical', color: 'bg-purple-100 text-purple-800' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">SLA Policies</h2>
          <p className="text-sm text-gray-500">
            Define per-severity due dates for vulnerability remediation.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Create Policy
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

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 space-y-4"
        >
          <h3 className="text-md font-semibold text-gray-900">
            {editingId ? 'Edit SLA Policy' : 'New SLA Policy'}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="sla-name" className="block text-sm font-medium text-gray-700">
                Policy Name
              </label>
              <input
                id="sla-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Standard Policy"
              />
            </div>

            <div>
              <label htmlFor="sla-desc" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                id="sla-desc"
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Optional description"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Remediation Deadlines (days)
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {severityFields.map((sf) => (
                <div key={sf.key}>
                  <label
                    htmlFor={`sla-${sf.key}`}
                    className={`mb-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${sf.color}`}
                  >
                    {sf.label}
                  </label>
                  <input
                    id={`sla-${sf.key}`}
                    type="number"
                    min={1}
                    required
                    value={form[sf.key]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [sf.key]: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sla-default"
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="sla-default" className="text-sm text-gray-700">
              Set as default policy for new cases
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Policy' : 'Create Policy'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Policies Table */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading SLA policies...</div>
      ) : policies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No SLA policies configured.</p>
          <p className="mt-1 text-xs text-gray-400">
            Create a policy to enforce remediation deadlines.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Policy
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Critical
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  High
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Medium
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Low
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  KEV
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cases
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {policy.name}
                      </span>
                      {policy.isDefault && (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Default
                        </span>
                      )}
                    </div>
                    {policy.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{policy.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded bg-red-50 px-2 py-0.5 text-sm font-medium text-red-700">
                      {policy.criticalDays}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded bg-orange-50 px-2 py-0.5 text-sm font-medium text-orange-700">
                      {policy.highDays}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded bg-yellow-50 px-2 py-0.5 text-sm font-medium text-yellow-700">
                      {policy.mediumDays}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-sm font-medium text-blue-700">
                      {policy.lowDays}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex rounded bg-purple-50 px-2 py-0.5 text-sm font-medium text-purple-700">
                      {policy.kevCriticalDays}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    {policy._count?.vulnerabilityCases ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(policy)}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        Edit
                      </button>
                      {!policy.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleDelete(policy.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
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
