'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportJobStatus {
  jobId: string;
  type: string;
  format: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  filename: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
}

const EXPORT_TYPES = [
  { value: 'findings', label: 'Findings', description: 'All vulnerability findings with scanner and asset details' },
  { value: 'cases', label: 'Cases', description: 'Vulnerability cases with severity, status, and SLA data' },
  { value: 'assets', label: 'Assets', description: 'Asset inventory with criticality and environment info' },
];

const FORMATS = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values, Excel-compatible' },
  { value: 'json', label: 'JSON', description: 'Structured JSON for integrations' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BulkExport() {
  const [exportType, setExportType] = useState('findings');
  const [format, setFormat] = useState('csv');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientId, setClientId] = useState('');
  const [activeJob, setActiveJob] = useState<ExportJobStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------------------
  // Polling
  // -----------------------------------------------------------------------

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/export/bulk/${jobId}`);
      if (!res.ok) throw new Error('Failed to check status');
      const data: ExportJobStatus = await res.json();
      setActiveJob(data);

      if (data.status === 'completed' || data.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {
      // Silently retry on poll failure
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Start Export
  // -----------------------------------------------------------------------

  async function handleStartExport() {
    setStarting(true);
    setError(null);
    setActiveJob(null);

    const filters: Record<string, string> = {};
    if (severityFilter) filters.severity = severityFilter;
    if (statusFilter) filters.status = statusFilter;

    try {
      const res = await fetch('/api/export/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          format,
          filters,
          clientId: clientId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start export');
      }

      const data = await res.json();
      setActiveJob({
        jobId: data.jobId,
        type: exportType,
        format,
        status: 'queued',
        progress: 0,
        totalRecords: 0,
        processedRecords: 0,
        filename: null,
        error: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        downloadUrl: null,
      });

      // Start polling
      pollRef.current = setInterval(() => pollJobStatus(data.jobId), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start export');
    } finally {
      setStarting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Download
  // -----------------------------------------------------------------------

  function handleDownload() {
    if (!activeJob?.downloadUrl) return;
    window.open(activeJob.downloadUrl, '_blank');
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-gray-900">Bulk Export</h3>
        <p className="text-sm text-gray-500">
          Export large datasets asynchronously. Start an export and download when ready.
        </p>
      </div>

      {/* Export Configuration */}
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Export Type</label>
            <div className="mt-2 space-y-2">
              {EXPORT_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    exportType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={type.value}
                    checked={exportType === type.value}
                    onChange={(e) => setExportType(e.target.value)}
                    className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Format</label>
            <div className="mt-2 space-y-2">
              {FORMATS.map((f) => (
                <label
                  key={f.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    format === f.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f.value}
                    checked={format === f.value}
                    onChange={(e) => setFormat(e.target.value)}
                    className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{f.label}</div>
                    <div className="text-xs text-gray-500">{f.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Filters (optional)</label>
              <p className="mt-1 text-xs text-gray-500">Narrow down the exported data</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            {exportType === 'cases' && (
              <div>
                <label className="block text-xs font-medium text-gray-600">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All statuses</option>
                  <option value="NEW">New</option>
                  <option value="TRIAGE">Triage</option>
                  <option value="IN_REMEDIATION">In Remediation</option>
                  <option value="VERIFIED_CLOSED">Verified Closed</option>
                  <option value="ACCEPTED_RISK">Accepted Risk</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Optional - scope to client"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleStartExport}
            disabled={starting || (activeJob?.status === 'processing') || (activeJob?.status === 'queued')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {starting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Start Export
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Job Progress */}
      {activeJob && (
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Export Progress</h4>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              activeJob.status === 'completed' ? 'bg-green-100 text-green-700' :
              activeJob.status === 'failed' ? 'bg-red-100 text-red-700' :
              activeJob.status === 'processing' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {activeJob.status === 'completed' ? 'Completed' :
               activeJob.status === 'failed' ? 'Failed' :
               activeJob.status === 'processing' ? 'Processing' :
               'Queued'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{activeJob.processedRecords} of {activeJob.totalRecords || '?'} records</span>
              <span>{activeJob.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeJob.status === 'failed' ? 'bg-red-500' :
                  activeJob.status === 'completed' ? 'bg-green-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${activeJob.progress}%` }}
              />
            </div>
          </div>

          {/* Details */}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
            <span>Job ID: {activeJob.jobId}</span>
            <span>Type: {activeJob.type}</span>
            <span>Format: {activeJob.format.toUpperCase()}</span>
            {activeJob.filename && <span>File: {activeJob.filename}</span>}
          </div>

          {/* Error */}
          {activeJob.status === 'failed' && activeJob.error && (
            <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {activeJob.error}
            </div>
          )}

          {/* Download */}
          {activeJob.status === 'completed' && activeJob.downloadUrl && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download {activeJob.filename}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
