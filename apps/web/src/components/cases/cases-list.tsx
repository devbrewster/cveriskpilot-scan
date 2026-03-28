'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, type SortState, type ColumnDef } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown, FilterSearch } from '@/components/ui/filters';
import { SeverityBadge, StatusBadge } from '@/components/ui/badges';
import type { VulnerabilityCase, ApiCase } from '@/lib/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'TRIAGE', label: 'Triage' },
  { value: 'IN_REMEDIATION', label: 'In Remediation' },
  { value: 'FIXED_PENDING_VERIFICATION', label: 'Fixed - Pending Verification' },
  { value: 'VERIFIED_CLOSED', label: 'Verified & Closed' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'ACCEPTED_RISK', label: 'Accepted Risk' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'INFO', label: 'Info' },
];

const PAGE_SIZE = 25;

/** Map sort keys used in the UI to the API's allowed sortBy values */
const SORT_KEY_MAP: Record<string, string> = {
  lastSeenAt: 'lastSeenAt',
  firstSeenAt: 'firstSeenAt',
  severity: 'severity',
  status: 'status',
  title: 'createdAt', // API does not support title sort; fall back
  findingCount: 'findingCount',
  epssScore: 'epssScore',
  dueAt: 'dueAt',
};

/** Normalise an API case row into the flat VulnerabilityCase shape used by the table */
function normaliseCase(raw: ApiCase): VulnerabilityCase {
  return {
    id: raw.id,
    title: raw.title,
    cveIds: raw.cveIds,
    severity: raw.severity,
    cvssScore: raw.cvssScore,
    epssScore: raw.epssScore,
    epssPercentile: raw.epssPercentile,
    kevListed: raw.kevListed,
    kevDueDate: raw.kevDueDate,
    status: raw.status,
    findingCount: raw._count?.findings ?? raw.findingCount ?? 0,
    assignedToId: raw.assignedToId,
    assignedTo: raw.assignedTo,
    dueAt: raw.dueAt,
    firstSeenAt: raw.firstSeenAt,
    lastSeenAt: raw.lastSeenAt,
  };
}

export function CasesList() {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState<SortState>({ key: 'lastSeenAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Data fetching state
  const [cases, setCases] = useState<VulnerabilityCase[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced search — avoid hammering the API on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Fetch cases from the API whenever filters, sort, or page change
  useEffect(() => {
    let cancelled = false;

    async function fetchCases() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));

      if (severityFilter) params.set('severity', severityFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const apiSortBy = SORT_KEY_MAP[sortState.key] ?? 'createdAt';
      params.set('sortBy', apiSortBy);
      params.set('sortOrder', sortState.direction || 'desc');

      try {
        const res = await fetch(`/api/cases?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Failed to load cases (${res.status})`);
        }
        const data = await res.json();
        if (cancelled) return;

        const normalised = (data.cases ?? []).map(normaliseCase);
        setCases(normalised);
        setTotal(data.total ?? normalised.length);
        setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.total ?? normalised.length) / PAGE_SIZE)));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setCases([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchCases();
    return () => { cancelled = true; };
  }, [currentPage, severityFilter, statusFilter, debouncedSearch, sortState]);

  const columns: ColumnDef<VulnerabilityCase>[] = useMemo(
    () => [
      {
        key: 'severity',
        header: 'Severity',
        sortable: true,
        width: '110px',
        render: (row) => <SeverityBadge severity={row.severity} />,
      },
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (row) => <span className="font-medium text-gray-900">{row.title}</span>,
      },
      {
        key: 'cveIds',
        header: 'CVE IDs',
        width: '180px',
        render: (row) =>
          row.cveIds.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {row.cveIds.map((cve) => (
                <span key={cve} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-700">
                  {cve}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-gray-400">--</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '200px',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'findingCount',
        header: 'Findings',
        sortable: true,
        width: '90px',
        render: (row) => (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {row.findingCount}
          </span>
        ),
      },
      {
        key: 'epssScore',
        header: 'EPSS',
        sortable: true,
        width: '80px',
        render: (row) =>
          row.epssScore !== null ? (
            <span className="font-mono text-xs">{(row.epssScore * 100).toFixed(1)}%</span>
          ) : (
            <span className="text-gray-400">--</span>
          ),
      },
      {
        key: 'assignedToId',
        header: 'Assigned To',
        width: '130px',
        render: (row) =>
          row.assignedTo ? (
            <span className="text-sm text-gray-700">{row.assignedTo.name ?? row.assignedTo.email}</span>
          ) : (
            <span className="text-gray-400">Unassigned</span>
          ),
      },
      {
        key: 'dueAt',
        header: 'Due Date',
        sortable: true,
        width: '110px',
        render: (row) => {
          if (!row.dueAt) return <span className="text-gray-400">--</span>;
          const due = new Date(row.dueAt);
          const now = new Date();
          const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const colorClass =
            diffDays < 0
              ? 'text-red-600 font-semibold'
              : diffDays <= 7
                ? 'text-yellow-600'
                : 'text-gray-500';
          return <span className={`text-sm ${colorClass}`}>{due.toLocaleDateString()}</span>;
        },
      },
    ],
    [],
  );

  const handleRowClick = useCallback(
    (row: VulnerabilityCase) => {
      router.push(`/cases/${row.id}`);
    },
    [router],
  );

  // --- Error state ---
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">Failed to load cases</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCurrentPage(1);
            }}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <FilterSearch
              value={searchText}
              onChange={(v) => {
                setSearchText(v);
                setCurrentPage(1);
              }}
              placeholder="Search CVE, title..."
            />
          </div>
          <FilterDropdown
            label="Severity"
            options={SEVERITY_OPTIONS}
            value={severityFilter}
            onChange={(v) => {
              setSeverityFilter(v);
              setCurrentPage(1);
            }}
          />
          <FilterDropdown
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">{total}</span> case
        {total !== 1 ? 's' : ''}
      </p>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white dark:bg-gray-900 py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <p className="text-sm text-gray-500">Loading cases...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Table */}
          <Table
            columns={columns}
            data={cases}
            onSort={setSortState}
            sortState={sortState}
            onRowClick={handleRowClick}
            getRowId={(row) => row.id}
            emptyMessage="No vulnerability cases match the current filters."
          />

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </>
      )}
    </div>
  );
}
