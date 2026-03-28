'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Pagination } from '@/components/ui/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SyncJobStatus = 'PENDING' | 'RUNNING' | 'POLLING' | 'DOWNLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type SyncTrigger = 'scheduled' | 'manual' | 'webhook';
type LogLevel = 'info' | 'warn' | 'error';

interface SyncLog {
  id: string;
  level: LogLevel;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface SyncJob {
  id: string;
  connectorId: string;
  status: SyncJobStatus;
  trigger: SyncTrigger;
  findingsReceived: number;
  findingsCreated: number;
  casesCreated: number;
  casesUpdated: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  logs?: SyncLog[];
}

interface SyncHistoryProps {
  connectorId: string;
  organizationId: string;
}

// ---------------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<SyncJobStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  RUNNING: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  POLLING: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  DOWNLOADING: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  FAILED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700',
};

const STATUS_DOT_COLORS: Record<SyncJobStatus, string> = {
  PENDING: 'bg-gray-400',
  RUNNING: 'bg-yellow-500 animate-pulse',
  POLLING: 'bg-yellow-500 animate-pulse',
  DOWNLOADING: 'bg-yellow-500 animate-pulse',
  PROCESSING: 'bg-blue-500 animate-pulse',
  COMPLETED: 'bg-green-500',
  FAILED: 'bg-red-500',
  CANCELLED: 'bg-gray-400',
};

const TRIGGER_LABELS: Record<SyncTrigger, string> = {
  scheduled: 'Scheduled',
  manual: 'Manual',
  webhook: 'Webhook',
};

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  info: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  warn: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const LOG_LEVEL_DOT: Record<LogLevel, string> = {
  info: 'bg-blue-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500',
};

const ACTIVE_STATUSES: SyncJobStatus[] = ['RUNNING', 'POLLING', 'DOWNLOADING', 'PROCESSING'];
const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '-';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h ${remainMin}m`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLogTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function ChevronDownIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ClockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SyncHistory component
// ---------------------------------------------------------------------------

export function SyncHistory({ connectorId, organizationId }: SyncHistoryProps) {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async (page: number) => {
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(connectorId)}/sync-history?page=${page}&pageSize=${PAGE_SIZE}`,
      );
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [connectorId]);

  const fetchJobLogs = useCallback(async (jobId: string) => {
    setLoadingLogs(jobId);
    try {
      const res = await fetch(
        `/api/connectors/${encodeURIComponent(connectorId)}/sync-history/${encodeURIComponent(jobId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, logs: data.logs ?? [] } : j)),
        );
      }
    } catch {
      // silent
    } finally {
      setLoadingLogs(null);
    }
  }, [connectorId]);

  // Auto-refresh when active jobs exist
  useEffect(() => {
    const hasActiveJob = jobs.some((j) => ACTIVE_STATUSES.includes(j.status));

    if (hasActiveJob) {
      autoRefreshRef.current = setInterval(() => {
        fetchJobs(currentPage);
      }, 10_000);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [jobs, currentPage, fetchJobs]);

  useEffect(() => {
    fetchJobs(currentPage);
  }, [currentPage, fetchJobs]);

  const handleRowClick = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      const job = jobs.find((j) => j.id === jobId);
      if (!job?.logs) {
        fetchJobLogs(jobId);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedJobId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <ClockIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        <h4 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">No sync history</h4>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Sync jobs will appear here once the connector runs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Trigger</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Started</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Duration</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Findings</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Cases</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Error</th>
              <th className="w-8 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {jobs.map((job, idx) => {
              const isExpanded = expandedJobId === job.id;
              return (
                <JobRow
                  key={job.id}
                  job={job}
                  idx={idx}
                  isExpanded={isExpanded}
                  loadingLogs={loadingLogs === job.id}
                  onClick={() => handleRowClick(job.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job row with expandable log timeline
// ---------------------------------------------------------------------------

function JobRow({
  job,
  idx,
  isExpanded,
  loadingLogs,
  onClick,
}: {
  job: SyncJob;
  idx: number;
  isExpanded: boolean;
  loadingLogs: boolean;
  onClick: () => void;
}) {
  const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30';

  return (
    <>
      <tr
        className={`${rowBg} cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
        onClick={onClick}
      >
        <td className="whitespace-nowrap px-4 py-3 text-sm">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[job.status]}`} />
            {job.status}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
          {TRIGGER_LABELS[job.trigger as SyncTrigger] ?? job.trigger}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
          {formatTime(job.startedAt ?? job.createdAt)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">
          {formatDuration(job.startedAt, job.completedAt)}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-mono text-gray-700 dark:text-gray-300">
          {job.findingsReceived > 0 ? (
            <span>{job.findingsCreated}/{job.findingsReceived}</span>
          ) : (
            '-'
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-mono text-gray-700 dark:text-gray-300">
          {job.casesCreated > 0 || job.casesUpdated > 0 ? (
            <span>{job.casesCreated}+/{job.casesUpdated}u</span>
          ) : (
            '-'
          )}
        </td>
        <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-600 dark:text-red-400" title={job.errorMessage ?? ''}>
          {job.errorMessage ?? '-'}
        </td>
        <td className="px-2 py-3">
          <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>

      {/* Expanded log timeline */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : !job.logs || job.logs.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">No log entries for this job.</p>
            ) : (
              <div className="relative space-y-2 pl-4">
                {/* Timeline line */}
                <div className="absolute left-[1.1rem] top-2 bottom-2 w-px bg-gray-300 dark:bg-gray-600" />
                {job.logs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-3">
                    {/* Dot */}
                    <div className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${LOG_LEVEL_DOT[log.level]}`} />
                    {/* Content */}
                    <div className={`flex-1 rounded-md border px-3 py-2 text-xs ${LOG_LEVEL_STYLES[log.level]}`}>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium">{log.message}</span>
                        <span className="shrink-0 text-[10px] opacity-70">{formatLogTime(log.createdAt)}</span>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <pre className="mt-1 overflow-x-auto text-[10px] opacity-70">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
