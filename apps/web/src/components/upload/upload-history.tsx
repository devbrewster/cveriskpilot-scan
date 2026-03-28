'use client';

import { useEffect, useState, useCallback } from 'react';
import type { UploadJob, UploadJobStatus } from '@/lib/types';
import { formatRelativeTime, formatNumber } from '@/lib/format';

/* ------------------------------------------------------------------ */
/* Status & Format Badge Colors                                       */
/* ------------------------------------------------------------------ */

const statusBadgeColors: Record<UploadJobStatus, string> = {
  QUEUED: 'bg-gray-100 text-gray-700 border-gray-200',
  PARSING: 'bg-blue-100 text-blue-800 border-blue-200',
  ENRICHING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BUILDING_CASES: 'bg-purple-100 text-purple-800 border-purple-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels: Record<UploadJobStatus, string> = {
  QUEUED: 'Queued',
  PARSING: 'Parsing',
  ENRICHING: 'Enriching',
  BUILDING_CASES: 'Building Cases',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const formatBadgeColors: Record<string, string> = {
  NESSUS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SARIF: 'bg-sky-50 text-sky-700 border-sky-200',
  CSV: 'bg-gray-50 text-gray-700 border-gray-200',
  JSON_FORMAT: 'bg-amber-50 text-amber-700 border-amber-200',
  CYCLONEDX: 'bg-violet-50 text-violet-700 border-violet-200',
  OSV: 'bg-rose-50 text-rose-700 border-rose-200',
  SPDX: 'bg-teal-50 text-teal-700 border-teal-200',
  CSAF: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  QUALYS: 'bg-blue-50 text-blue-700 border-blue-200',
  OPENVAS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function UploadHistory() {
  const [uploads, setUploads] = useState<UploadJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUploads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/uploads?limit=50');
      if (!res.ok) {
        throw new Error(`Failed to fetch uploads (${res.status})`);
      }
      const data = await res.json();
      setUploads(data.uploads ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upload history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload History</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <button
            onClick={fetchUploads}
            className="ml-2 font-medium underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Filename
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Format
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Findings
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Cases Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Uploaded At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  Loading upload history...
                </td>
              </tr>
            )}
            {!loading && uploads.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No uploads yet. Upload a scan file to get started.
                </td>
              </tr>
            )}
            {!loading && uploads.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {job.filename}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      formatBadgeColors[job.parserFormat] ?? 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {job.parserFormat}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      statusBadgeColors[job.status]
                    }`}
                  >
                    {statusLabels[job.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-700">
                  {job.findingsCreated > 0 ? formatNumber(job.findingsCreated) : '\u2014'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-700">
                  {job.casesCreated > 0 ? formatNumber(job.casesCreated) : '\u2014'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                  {formatRelativeTime(new Date(job.createdAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
