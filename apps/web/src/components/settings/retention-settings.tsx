'use client';

import { useState, useEffect } from 'react';

interface RetentionPolicy {
  findingsDays: number;
  artifactsDays: number;
  auditLogsDays: number;
  reportsDays: number;
  updatedAt?: string;
}

const DEFAULT_POLICY: RetentionPolicy = {
  findingsDays: 365,
  artifactsDays: 180,
  auditLogsDays: 2555,
  reportsDays: 365,
};

const FIELDS: {
  key: keyof RetentionPolicy;
  label: string;
  description: string;
  min: number;
  defaultValue: number;
}[] = [
  {
    key: 'findingsDays',
    label: 'Findings',
    description: 'Vulnerability findings from scan imports',
    min: 30,
    defaultValue: 365,
  },
  {
    key: 'artifactsDays',
    label: 'Scan Artifacts',
    description: 'Uploaded scan files stored in cloud storage',
    min: 30,
    defaultValue: 180,
  },
  {
    key: 'auditLogsDays',
    label: 'Audit Logs',
    description: 'Tamper-evident audit trail (minimum 1 year for compliance)',
    min: 365,
    defaultValue: 2555,
  },
  {
    key: 'reportsDays',
    label: 'Reports',
    description: 'Generated compliance and executive reports',
    min: 30,
    defaultValue: 365,
  },
];

export function RetentionSettings({
  organizationId,
}: {
  organizationId: string;
}) {
  const [policy, setPolicy] = useState<RetentionPolicy>(DEFAULT_POLICY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/settings/retention?organizationId=${organizationId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setPolicy(data.policy);
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [organizationId]);

  const handleChange = (key: keyof RetentionPolicy, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setPolicy((prev) => ({ ...prev, [key]: num }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/settings/retention?organizationId=${organizationId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            findingsDays: policy.findingsDays,
            artifactsDays: policy.artifactsDays,
            auditLogsDays: policy.auditLogsDays,
            reportsDays: policy.reportsDays,
          }),
        },
      );
      if (res.ok) {
        setMessage({ type: 'success', text: 'Retention policy updated successfully.' });
      } else {
        const data = await res.json();
        setMessage({
          type: 'error',
          text: data.errors?.join(', ') ?? 'Failed to update retention policy.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPolicy(DEFAULT_POLICY);
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-32 rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Data Retention Policy
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure how long different types of data are retained before cleanup.
          Minimum values are enforced for compliance.
        </p>
      </div>

      <div className="space-y-4">
        {FIELDS.map((field) => (
          <div
            key={field.key}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex-1">
              <label
                htmlFor={field.key}
                className="block text-sm font-medium text-gray-900"
              >
                {field.label}
              </label>
              <p className="text-xs text-gray-500">{field.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={field.key}
                type="number"
                min={field.min}
                value={policy[field.key] as number}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
            <div className="w-full text-right text-xs text-gray-400">
              ~{Math.round((policy[field.key] as number) / 365 * 10) / 10} year{(policy[field.key] as number) >= 730 ? 's' : ''}
              {' | '}
              Default: {field.defaultValue} days
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Retention Policy'}
        </button>
        <button
          onClick={handleReset}
          className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
