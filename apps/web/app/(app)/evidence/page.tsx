'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EvidenceStatus = 'CURRENT' | 'STALE' | 'MISSING' | 'EXPIRED';
type EvidenceSource =
  | 'AUTO_SCAN'
  | 'AUTO_ASSESSMENT'
  | 'MANUAL_UPLOAD'
  | 'MANUAL_ENTRY'
  | 'API_CONNECTOR'
  | 'CLI_SCAN';

interface EvidenceRecord {
  id: string;
  frameworkId: string;
  controlId: string;
  controlTitle: string;
  title: string;
  description: string | null;
  status: EvidenceStatus;
  source: EvidenceSource;
  collectorName: string | null;
  sourceSystem: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  freshnessDays: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface EvidenceStats {
  current: number;
  stale: number;
  missing: number;
  expired: number;
  total: number;
}

interface EvidenceResponse {
  records: EvidenceRecord[];
  total: number;
  page: number;
  limit: number;
  stats: EvidenceStats;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<EvidenceStatus, string> = {
  CURRENT:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  STALE:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  MISSING:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  EXPIRED:
    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  CURRENT: 'Current',
  STALE: 'Stale',
  MISSING: 'Missing',
  EXPIRED: 'Expired',
};

const SOURCE_LABELS: Record<EvidenceSource, string> = {
  AUTO_SCAN: 'Auto Scan',
  AUTO_ASSESSMENT: 'Auto Assessment',
  MANUAL_UPLOAD: 'Manual Upload',
  MANUAL_ENTRY: 'Manual Entry',
  API_CONNECTOR: 'API Connector',
  CLI_SCAN: 'CLI Scan',
};

const SOURCE_ICONS: Record<EvidenceSource, string> = {
  AUTO_SCAN: 'M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z',
  AUTO_ASSESSMENT: 'M10.5 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-3 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  MANUAL_UPLOAD: 'M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z',
  MANUAL_ENTRY: 'M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z',
  API_CONNECTOR: 'M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z',
  CLI_SCAN: 'M8 9a1 1 0 000 2H9V9H8zM2 4.75C2 3.784 2.784 3 3.75 3h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0116.25 17H3.75A1.75 1.75 0 012 15.25V4.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V4.75a.25.25 0 00-.25-.25H3.75z',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  'nist-800-53': 'NIST 800-53',
  'cmmc-level2': 'CMMC L2',
  'soc2-type2': 'SOC 2',
  'fedramp-moderate': 'FedRAMP',
  'owasp-asvs': 'ASVS',
  'nist-ssdf': 'SSDF',
  gdpr: 'GDPR',
  hipaa: 'HIPAA',
  'pci-dss': 'PCI-DSS',
  'iso-27001': 'ISO 27001',
  'nist-csf': 'NIST CSF',
  'eu-cra': 'EU CRA',
  nis2: 'NIS2',
};

const FRAMEWORK_OPTIONS = Object.entries(FRAMEWORK_LABELS);
const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start rounded-lg border p-4 transition-all ${
        active
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-600 ring-1 ring-blue-500'
          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <span className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {count}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [frameworkFilter, setFrameworkFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (frameworkFilter) params.set('frameworkId', frameworkFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (sourceFilter) params.set('source', sourceFilter);

    try {
      const res = await fetch(`/api/compliance/evidence?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [page, frameworkFilter, statusFilter, sourceFilter]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  useEffect(() => {
    setPage(1);
  }, [frameworkFilter, statusFilter, sourceFilter]);

  const stats = data?.stats ?? { current: 0, stale: 0, missing: 0, expired: 0, total: 0 };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Compliance Evidence
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Evidence records with provenance tracking across all compliance frameworks
          </p>
        </div>
        <Link
          href="/evidence/new"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Add Evidence
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Current"
          count={stats.current}
          color="bg-green-500"
          active={statusFilter === 'CURRENT'}
          onClick={() => setStatusFilter(statusFilter === 'CURRENT' ? '' : 'CURRENT')}
        />
        <StatCard
          label="Stale"
          count={stats.stale}
          color="bg-yellow-500"
          active={statusFilter === 'STALE'}
          onClick={() => setStatusFilter(statusFilter === 'STALE' ? '' : 'STALE')}
        />
        <StatCard
          label="Missing"
          count={stats.missing}
          color="bg-red-500"
          active={statusFilter === 'MISSING'}
          onClick={() => setStatusFilter(statusFilter === 'MISSING' ? '' : 'MISSING')}
        />
        <StatCard
          label="Expired"
          count={stats.expired}
          color="bg-gray-400"
          active={statusFilter === 'EXPIRED'}
          onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? '' : 'EXPIRED')}
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            Framework
          </label>
          <select
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All frameworks</option>
            {FRAMEWORK_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            Source
          </label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All sources</option>
            {(Object.keys(SOURCE_LABELS) as EvidenceSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {(frameworkFilter || statusFilter || sourceFilter) && (
          <button
            onClick={() => {
              setFrameworkFilter('');
              setStatusFilter('');
              setSourceFilter('');
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Control
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Evidence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Last Verified
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Freshness
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Collected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <svg
                        className="h-5 w-5 animate-spin text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Loading evidence records...
                    </div>
                  </td>
                </tr>
              ) : !data || data.records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
                        <svg
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {frameworkFilter || statusFilter || sourceFilter
                          ? 'No matching evidence'
                          : 'No evidence collected yet'}
                      </h3>
                      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                        {frameworkFilter || statusFilter || sourceFilter
                          ? 'Try adjusting your filters to find what you are looking for.'
                          : 'Evidence records are created automatically from scans and assessments, or you can add them manually.'}
                      </p>
                      {!frameworkFilter && !statusFilter && !sourceFilter && (
                        <Link
                          href="/evidence/new"
                          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                        >
                          Add your first evidence
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.records.map((record) => {
                  const age = daysSince(record.verifiedAt);
                  const freshnessPercent =
                    age !== null
                      ? Math.max(0, Math.min(100, 100 - (age / record.freshnessDays) * 100))
                      : 0;
                  const freshnessColor =
                    freshnessPercent > 60
                      ? 'bg-green-500'
                      : freshnessPercent > 30
                        ? 'bg-yellow-500'
                        : 'bg-red-500';

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/evidence/${record.id}`} className="block">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {record.controlId}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {FRAMEWORK_LABELS[record.frameworkId] ?? record.frameworkId}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                            {record.controlTitle}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/evidence/${record.id}`} className="block">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[280px]">
                            {record.title}
                          </p>
                          {record.description && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                              {record.description}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[record.status]}`}
                        >
                          {STATUS_LABELS[record.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="h-3.5 w-3.5 text-gray-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d={SOURCE_ICONS[record.source]}
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {SOURCE_LABELS[record.source]}
                          </span>
                        </div>
                        {record.sourceSystem && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            via {record.sourceSystem}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(record.verifiedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className={`h-1.5 rounded-full ${freshnessColor} transition-all`}
                              style={{ width: `${freshnessPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {age !== null ? `${age}d / ${record.freshnessDays}d` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(record.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing{' '}
              <span className="font-medium">
                {(page - 1) * PAGE_SIZE + 1}
              </span>
              {' '}-{' '}
              <span className="font-medium">
                {Math.min(page * PAGE_SIZE, data.total)}
              </span>{' '}
              of <span className="font-medium">{data.total}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
