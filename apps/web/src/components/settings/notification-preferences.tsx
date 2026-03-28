'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotificationPreferencesProps {
  organizationId: string;
}

interface EventType {
  key: string;
  label: string;
  description: string;
}

interface Preferences {
  [eventKey: string]: {
    email: boolean;
    in_app: boolean;
  };
}

const EVENT_TYPES: EventType[] = [
  { key: 'scan_completed', label: 'Scan Completed', description: 'A vulnerability scan has finished processing.' },
  { key: 'scan_failed', label: 'Scan Failed', description: 'A vulnerability scan encountered an error.' },
  { key: 'sla_approaching', label: 'SLA Breach Approaching', description: 'A remediation deadline is approaching.' },
  { key: 'sla_breached', label: 'SLA Breach Occurred', description: 'A remediation deadline has been missed.' },
  { key: 'case_assigned', label: 'Case Assigned to You', description: 'A vulnerability case has been assigned to you.' },
  { key: 'case_status_changed', label: 'Case Status Changed', description: 'A case you are watching changed status.' },
  { key: 'critical_finding', label: 'New Critical/High Finding', description: 'A new critical or high severity finding was detected.' },
  { key: 'kev_alert', label: 'KEV Alert', description: 'A finding matches the CISA Known Exploited Vulnerabilities catalog.' },
  { key: 'report_generated', label: 'Report Generated', description: 'A scheduled or on-demand report is ready.' },
];

const CHANNELS = ['email', 'in_app'] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'Email',
  in_app: 'In-App',
};

function buildDefaultPreferences(): Preferences {
  const prefs: Preferences = {};
  for (const evt of EVENT_TYPES) {
    prefs[evt.key] = { email: true, in_app: true };
  }
  return prefs;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        checked ? 'bg-primary-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function NotificationPreferences({ organizationId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<Preferences>(buildDefaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/settings/notifications?organizationId=${organizationId}`);
      if (!res.ok) throw new Error('Failed to load notification preferences');
      const data = await res.json();
      if (data.preferences) {
        setPreferences((prev) => ({ ...prev, ...data.preferences }));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = (eventKey: string, channel: Channel, value: boolean) => {
    setSuccess(false);
    setPreferences((prev) => ({
      ...prev,
      [eventKey]: {
        ...prev[eventKey],
        [channel]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, preferences }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save preferences');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        <p className="text-sm text-gray-500">
          Choose which events trigger notifications and how you receive them.
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
          <p className="text-sm text-green-700">Notification preferences saved.</p>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">
          Loading notification preferences...
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Event
                  </th>
                  {CHANNELS.map((ch) => (
                    <th
                      key={ch}
                      className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {CHANNEL_LABELS[ch]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {EVENT_TYPES.map((evt) => (
                  <tr key={evt.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{evt.label}</span>
                      <p className="mt-0.5 text-xs text-gray-500">{evt.description}</p>
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch} className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Toggle
                            checked={preferences[evt.key]?.[ch] ?? false}
                            onChange={(val) => handleToggle(evt.key, ch, val)}
                            label={`${evt.label} ${CHANNEL_LABELS[ch]}`}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
