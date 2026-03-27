'use client';

import type { UploadJob, UploadJobStatus, ParserFormat } from '@/lib/mock-data';

const statusColors: Record<UploadJobStatus, string> = {
  QUEUED: 'bg-gray-100 text-gray-700 border-gray-200',
  PARSING: 'bg-blue-100 text-blue-700 border-blue-200',
  ENRICHING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  BUILDING_CASES: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
};

const formatColors: Record<ParserFormat, string> = {
  NESSUS: 'bg-indigo-100 text-indigo-700',
  SARIF: 'bg-violet-100 text-violet-700',
  CSV: 'bg-gray-100 text-gray-700',
  JSON_FORMAT: 'bg-slate-100 text-slate-700',
  CYCLONEDX: 'bg-cyan-100 text-cyan-700',
  OSV: 'bg-teal-100 text-teal-700',
  SPDX: 'bg-emerald-100 text-emerald-700',
  CSAF: 'bg-sky-100 text-sky-700',
  QUALYS: 'bg-amber-100 text-amber-700',
  OPENVAS: 'bg-lime-100 text-lime-700',
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface RecentScansProps {
  jobs: UploadJob[];
}

export function RecentScans({ jobs }: RecentScansProps) {
  const recent = jobs.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        No recent scans. Upload a scan file to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-3 pr-4">Filename</th>
            <th className="pb-3 pr-4">Format</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4 text-right">Findings</th>
            <th className="pb-3 text-right">Uploaded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {recent.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="py-3 pr-4">
                <a
                  href={`/upload/${job.id}`}
                  className="max-w-[280px] truncate font-medium text-gray-900 hover:text-blue-700"
                  title={job.filename}
                >
                  {job.filename}
                </a>
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${formatColors[job.parserFormat]}`}
                >
                  {job.parserFormat}
                </span>
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[job.status]}`}
                >
                  {job.status === 'BUILDING_CASES' ? 'Building' : job.status.charAt(0) + job.status.slice(1).toLowerCase()}
                </span>
              </td>
              <td className="py-3 pr-4 text-right font-mono text-xs text-gray-700">
                {job.status === 'COMPLETED' ? job.findingsCreated : job.totalFindings || '-'}
              </td>
              <td className="py-3 text-right text-xs text-gray-500">{relativeTime(job.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
