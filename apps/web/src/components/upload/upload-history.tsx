'use client';

import type { UploadJob, UploadJobStatus } from '@/lib/mock-data';
import { mockUploadJobs } from '@/lib/mock-data';
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
/* Extended mock data for history                                     */
/* ------------------------------------------------------------------ */

const extendedMockUploads: UploadJob[] = [
  ...mockUploadJobs,
  {
    id: 'job-006',
    filename: 'snyk-dependencies.json',
    parserFormat: 'JSON_FORMAT',
    status: 'COMPLETED',
    totalFindings: 67,
    findingsCreated: 52,
    casesCreated: 5,
    createdAt: '2026-03-24T09:00:00Z',
    completedAt: '2026-03-24T09:03:00Z',
    errorMessage: null,
  },
  {
    id: 'job-007',
    filename: 'trivy-scan-results.cdx.json',
    parserFormat: 'CYCLONEDX',
    status: 'COMPLETED',
    totalFindings: 215,
    findingsCreated: 198,
    casesCreated: 11,
    createdAt: '2026-03-23T14:20:00Z',
    completedAt: '2026-03-23T14:26:00Z',
    errorMessage: null,
  },
  {
    id: 'job-008',
    filename: 'nessus-dev-scan.nessus',
    parserFormat: 'NESSUS',
    status: 'BUILDING_CASES',
    totalFindings: 128,
    findingsCreated: 128,
    casesCreated: 0,
    createdAt: '2026-03-26T17:10:00Z',
    completedAt: null,
    errorMessage: null,
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function UploadHistory() {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload History</h2>
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
            {extendedMockUploads.map((job) => (
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
