'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportSchedule {
  id: string;
  name: string;
  organizationId: string;
  clientId: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  reportType: 'executive' | 'findings' | 'sla';
  format: 'pdf' | 'csv';
  recipients: string[];
  dayOfWeek: number | null;
  hourUtc: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleFormData {
  name: string;
  clientId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  reportType: 'executive' | 'findings' | 'sla';
  format: 'pdf' | 'csv';
  recipients: string;
  dayOfWeek: number;
  hourUtc: number;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const REPORT_TYPES = [
  { value: 'executive', label: 'Executive Summary' },
  { value: 'findings', label: 'Findings Report' },
  { value: 'sla', label: 'SLA Compliance' },
];
const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DEFAULT_FORM: ScheduleFormData = {
  name: '',
  clientId: '',
  frequency: 'weekly',
  reportType: 'executive',
  format: 'csv',
  recipients: '',
  dayOfWeek: 1,
  hourUtc: 8,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleManager() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/schedules');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSchedules(data.schedules ?? []);
    } catch {
      setError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // -----------------------------------------------------------------------
  // Create / Edit
  // -----------------------------------------------------------------------

  function openCreateForm() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function openEditForm(schedule: ReportSchedule) {
    setForm({
      name: schedule.name,
      clientId: schedule.clientId ?? '',
      frequency: schedule.frequency,
      reportType: schedule.reportType,
      format: schedule.format,
      recipients: schedule.recipients.join(', '),
      dayOfWeek: schedule.dayOfWeek ?? 1,
      hourUtc: schedule.hourUtc,
    });
    setEditingId(schedule.id);
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.recipients.trim()) {
      setError('At least one recipient email is required');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      clientId: form.clientId || null,
      frequency: form.frequency,
      reportType: form.reportType,
      format: form.format,
      recipients: form.recipients.split(',').map((e) => e.trim()).filter(Boolean),
      dayOfWeek: form.frequency === 'weekly' ? form.dayOfWeek : null,
      hourUtc: form.hourUtc,
    };

    try {
      const url = editingId
        ? `/api/reports/schedules/${editingId}`
        : '/api/reports/schedules';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setShowForm(false);
      setEditingId(null);
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  async function handleDelete(id: string) {
    if (!confirm('Delete this scheduled report?')) return;

    try {
      const res = await fetch(`/api/reports/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchSchedules();
    } catch {
      setError('Failed to delete schedule');
    }
  }

  // -----------------------------------------------------------------------
  // Run Now
  // -----------------------------------------------------------------------

  async function handleRunNow(schedule: ReportSchedule) {
    setRunningId(schedule.id);
    setError(null);

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: schedule.organizationId,
          clientId: schedule.clientId,
          reportType: schedule.reportType,
          format: schedule.format,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate report');

      // If CSV, trigger download
      const contentType = res.headers.get('Content-Type') ?? '';
      if (contentType.includes('text/csv')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${schedule.reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        // For JSON reports, download as file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${schedule.reportType}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Failed to run report');
    } finally {
      setRunningId(null);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  function formatNextRun(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Scheduled Reports</h3>
          <p className="text-sm text-gray-500">
            Automate recurring reports delivered to your team via email
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Schedule
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">
            {editingId ? 'Edit Schedule' : 'Create Schedule'}
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Weekly Executive Summary"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Report Type</label>
              <select
                value={form.reportType}
                onChange={(e) => setForm({ ...form, reportType: e.target.value as any })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {REPORT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as any })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Day of Week (weekly only) */}
            {form.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Day of Week</label>
                <select
                  value={form.dayOfWeek}
                  onChange={(e) => setForm({ ...form, dayOfWeek: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DAYS_OF_WEEK.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Hour UTC */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Hour (UTC)</label>
              <select
                value={form.hourUtc}
                onChange={(e) => setForm({ ...form, hourUtc: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>

            {/* Client ID (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Client ID (optional)</label>
              <input
                type="text"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                placeholder="Leave empty for org-wide"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Recipients */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Recipients</label>
              <input
                type="text"
                value={form.recipients}
                onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                placeholder="user@example.com, team@example.com"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated email addresses</p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Update Schedule' : 'Create Schedule'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-lg border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Schedule List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
          Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-900">No scheduled reports</p>
          <p className="mt-1 text-sm text-gray-500">Create your first scheduled report to automate delivery.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white dark:bg-gray-900 px-5 py-4 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{schedule.name}</h4>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    schedule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {schedule.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="capitalize">{schedule.frequency} - {schedule.reportType} ({schedule.format.toUpperCase()})</span>
                  <span>Next: {formatNextRun(schedule.nextRunAt)}</span>
                  {schedule.lastRunAt && (
                    <span>Last: {new Date(schedule.lastRunAt).toLocaleDateString()}</span>
                  )}
                  <span>{schedule.recipients.length} recipient(s)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="ml-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRunNow(schedule)}
                  disabled={runningId === schedule.id}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="Run now"
                >
                  {runningId === schedule.id ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                    </svg>
                  )}
                  Run
                </button>
                <button
                  type="button"
                  onClick={() => openEditForm(schedule)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white dark:bg-gray-900 p-1.5 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  title="Edit"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(schedule.id)}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white dark:bg-gray-900 p-1.5 text-gray-500 shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
