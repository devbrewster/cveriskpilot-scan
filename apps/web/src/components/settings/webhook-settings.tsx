'use client';

import { useState, useEffect, useCallback } from 'react';

const WEBHOOK_EVENTS = [
  { value: 'scan.completed', label: 'Scan Completed', group: 'Scans' },
  { value: 'scan.failed', label: 'Scan Failed', group: 'Scans' },
  { value: 'case.created', label: 'Case Created', group: 'Cases' },
  { value: 'case.status_changed', label: 'Case Status Changed', group: 'Cases' },
  { value: 'case.assigned', label: 'Case Assigned', group: 'Cases' },
  { value: 'finding.created', label: 'Finding Created', group: 'Findings' },
  { value: 'finding.critical', label: 'Critical Finding', group: 'Findings' },
  { value: 'sla.breach', label: 'SLA Breach', group: 'SLA' },
  { value: 'sla.approaching', label: 'SLA Approaching', group: 'SLA' },
  { value: 'report.generated', label: 'Report Generated', group: 'Reports' },
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]['value'];

interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret?: string;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: 'success' | 'failed' | null;
  createdAt: string;
}

interface WebhookSettingsProps {
  organizationId: string;
}

interface WebhookFormState {
  url: string;
  events: WebhookEvent[];
  active: boolean;
  autoGenerateSecret: boolean;
  secret: string;
}

const defaultFormState: WebhookFormState = {
  url: '',
  events: [],
  active: true,
  autoGenerateSecret: true,
  secret: '',
};

export function WebhookSettings({ organizationId }: WebhookSettingsProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookFormState>(defaultFormState);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/webhooks?organizationId=${organizationId}`);
      if (!res.ok) throw new Error('Failed to load webhooks');
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const resetForm = () => {
    setForm(defaultFormState);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (webhook: WebhookEndpoint) => {
    setForm({
      url: webhook.url,
      events: [...webhook.events],
      active: webhook.active,
      autoGenerateSecret: false,
      secret: '',
    });
    setEditingId(webhook.id);
    setShowForm(true);
    setTestResult(null);
  };

  const handleToggleEvent = (event: WebhookEvent) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSelectAllEvents = () => {
    const allEvents = WEBHOOK_EVENTS.map((e) => e.value);
    const allSelected = form.events.length === allEvents.length;
    setForm((prev) => ({
      ...prev,
      events: allSelected ? [] : [...allEvents],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        organizationId,
        url: form.url,
        events: form.events,
        active: form.active,
        autoGenerateSecret: form.autoGenerateSecret,
      };
      if (!form.autoGenerateSecret && form.secret) {
        payload.secret = form.secret;
      }

      const isEdit = editingId !== null;
      const url = isEdit ? `/api/webhooks/${editingId}` : '/api/webhooks';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Failed to ${isEdit ? 'update' : 'create'} webhook`);
      }

      resetForm();
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm(`Delete webhook for ${url}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to delete webhook');
      }
      if (editingId === id) resetForm();
      await fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setTestResult({ id, success: false, message: data.error ?? 'Test failed' });
      } else {
        setTestResult({ id, success: true, message: data.message ?? 'Ping sent successfully' });
      }
    } catch (err) {
      setTestResult({
        id,
        success: false,
        message: err instanceof Error ? err.message : 'Test request failed',
      });
    } finally {
      setTesting(null);
    }
  };

  const truncateUrl = (url: string, maxLen = 50) => {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen) + '...';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const eventGroups = WEBHOOK_EVENTS.reduce(
    (acc, event) => {
      if (!acc[event.group]) acc[event.group] = [];
      acc[event.group].push(event);
      return acc;
    },
    {} as Record<string, typeof WEBHOOK_EVENTS[number][]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Webhook Endpoints</h2>
          <p className="text-sm text-gray-500">
            Receive real-time notifications when events occur in your organization.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
              setTestResult(null);
            }}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Add Webhook
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

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white p-6 space-y-5"
        >
          <h3 className="text-md font-semibold text-gray-900">
            {editingId ? 'Edit Webhook' : 'New Webhook Endpoint'}
          </h3>

          {/* URL */}
          <div>
            <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700">
              Payload URL
            </label>
            <input
              id="webhook-url"
              type="url"
              required
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="https://example.com/webhooks/cveriskpilot"
            />
          </div>

          {/* Secret */}
          {!editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Signing Secret</label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.autoGenerateSecret}
                    onChange={() => setForm((prev) => ({ ...prev, autoGenerateSecret: true, secret: '' }))}
                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Auto-generate secret (recommended)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!form.autoGenerateSecret}
                    onChange={() => setForm((prev) => ({ ...prev, autoGenerateSecret: false }))}
                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Provide my own secret</span>
                </label>
                {!form.autoGenerateSecret && (
                  <input
                    type="text"
                    value={form.secret}
                    onChange={(e) => setForm((prev) => ({ ...prev, secret: e.target.value }))}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="whsec_..."
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Used for HMAC-SHA256 signature verification of payloads.
              </p>
            </div>
          )}

          {/* Events */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Events</label>
              <button
                type="button"
                onClick={handleSelectAllEvents}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                {form.events.length === WEBHOOK_EVENTS.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.entries(eventGroups).map(([group, events]) => (
                <div key={group}>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {events.map((event) => (
                      <label key={event.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.events.includes(event.value)}
                          onChange={() => handleToggleEvent(event.value)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {form.events.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">Select at least one event.</p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Active</p>
              <p className="text-xs text-gray-500">Inactive webhooks will not receive deliveries.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                form.active ? 'bg-primary-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={form.active}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  form.active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Form actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || form.events.length === 0}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? editingId
                  ? 'Updating...'
                  : 'Creating...'
                : editingId
                  ? 'Update Webhook'
                  : 'Create Webhook'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Webhook List */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading webhooks...</div>
      ) : webhooks.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No webhook endpoints configured.</p>
          <p className="mt-1 text-xs text-gray-400">
            Add a webhook to receive real-time event notifications via HTTP POST.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                        webhook.active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <code className="text-sm font-mono text-gray-900 truncate" title={webhook.url}>
                      {truncateUrl(webhook.url)}
                    </code>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        webhook.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {webhook.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Subscribed events */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {/* Last delivery */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>Last delivery: {formatDate(webhook.lastDeliveryAt)}</span>
                    {webhook.lastDeliveryStatus && (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          webhook.lastDeliveryStatus === 'success'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            webhook.lastDeliveryStatus === 'success'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        />
                        {webhook.lastDeliveryStatus === 'success' ? 'Delivered' : 'Failed'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTest(webhook.id)}
                    disabled={testing === webhook.id || !webhook.active}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing === webhook.id ? 'Sending...' : 'Test'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(webhook)}
                    className="text-sm text-primary-600 hover:text-primary-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(webhook.id, webhook.url)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Test result */}
              {testResult && testResult.id === webhook.id && (
                <div
                  className={`rounded-md p-2 text-xs ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delivery history note */}
      {webhooks.length > 0 && (
        <p className="text-xs text-gray-400">
          View full delivery history and debug failed deliveries in the{' '}
          <a
            href="/settings?tab=webhook-deliveries"
            className="text-primary-600 hover:text-primary-800 underline"
          >
            delivery log
          </a>
          .
        </p>
      )}
    </div>
  );
}
