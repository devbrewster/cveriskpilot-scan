'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Table, type SortState, type ColumnDef } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown, FilterSearch } from '@/components/ui/filters';
import { SeverityBadge, StatusBadge } from '@/components/ui/badges';
import { demoCases } from '@/lib/demo-data';
import type { Severity, CaseStatus } from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DemoCaseRow {
  id: string;
  title: string;
  severity: Severity;
  cvssScore: number;
  epssScore: number;
  epssPercentile?: number;
  kevListed: boolean;
  status: CaseStatus;
  cveIds: string[];
  findingCount: number;
  assignedTo: { name: string | null; email: string } | null;
  dueAt: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 25;

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'INFO', label: 'Info' },
];

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

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

/* ------------------------------------------------------------------ */
/* Normalise demo data into the row shape                              */
/* ------------------------------------------------------------------ */

const allCases: DemoCaseRow[] = demoCases.map((c) => {
  const dueAt = new Date(new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: c.id,
    title: c.title,
    severity: c.severity,
    cvssScore: c.cvssScore,
    epssScore: c.epssScore,
    kevListed: c.kevListed,
    status: c.status,
    cveIds: [c.cveId],
    findingCount: c.findingCount,
    assignedTo:
      c.assignedTo && c.assignedTo !== 'Unassigned'
        ? { name: c.assignedTo, email: '' }
        : null,
    dueAt,
    createdAt: c.createdAt,
  };
});

/* ------------------------------------------------------------------ */
/* Sort helper                                                         */
/* ------------------------------------------------------------------ */

function sortRows(rows: DemoCaseRow[], sort: SortState): DemoCaseRow[] {
  if (!sort.direction) return rows;

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sort.key) {
      case 'severity':
        cmp = (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5);
        break;
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      case 'findingCount':
        cmp = a.findingCount - b.findingCount;
        break;
      case 'epssScore':
        cmp = (a.epssScore ?? 0) - (b.epssScore ?? 0);
        break;
      case 'dueAt':
        cmp = new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime();
        break;
      default:
        cmp = 0;
    }
    return cmp;
  });

  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DemoCasesPage() {
  const router = useRouter();

  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState<SortState>({ key: 'dueAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  /* Filter + sort + paginate */
  const filtered = useMemo(() => {
    return allCases.filter((c) => {
      if (severityFilter && c.severity !== severityFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.cveIds.some((cve) => cve.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [severityFilter, statusFilter, searchText]);

  const sorted = useMemo(() => sortRows(filtered, sortState), [filtered, sortState]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  );

  /* Column definitions — 1:1 match with CasesList */
  const columns: ColumnDef<DemoCaseRow>[] = useMemo(
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
    (row: DemoCaseRow) => {
      router.push(`/demo/cases/${row.id}`);
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-350 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vulnerability Cases</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage vulnerability cases across your organization.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated vulnerability cases. Cases are automatically built from deduplicated findings.
        </p>
      </div>

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
          <span className="font-medium text-gray-700">{filtered.length}</span> case
          {filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Table */}
        <Table
          columns={columns}
          data={pageData}
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
      </div>
    </div>
  );
}
