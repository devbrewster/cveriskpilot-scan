'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Table, type SortState, type ColumnDef } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown, FilterSearch } from '@/components/ui/filters';
import { SeverityBadge, StatusBadge } from '@/components/ui/badges';
import {
  mockCases,
  mockUsers,
  type VulnerabilityCase,
} from '@/lib/mock-findings';

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

export function CasesList() {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState<SortState>({ key: 'lastSeenAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCases = useMemo(() => {
    let cases = [...mockCases];

    if (statusFilter) {
      cases = cases.filter((c) => c.status === statusFilter);
    }
    if (severityFilter) {
      cases = cases.filter((c) => c.severity === severityFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.cveIds.some((cve) => cve.toLowerCase().includes(q)),
      );
    }

    if (sortState.direction) {
      const dir = sortState.direction === 'asc' ? 1 : -1;
      cases.sort((a, b) => {
        const key = sortState.key as keyof VulnerabilityCase;
        const aVal = a[key];
        const bVal = b[key];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * dir;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * dir;
        }
        return 0;
      });
    }

    return cases;
  }, [statusFilter, severityFilter, searchText, sortState]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const pageCases = filteredCases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
          row.assignedToId ? (
            <span className="text-sm text-gray-700">{mockUsers[row.assignedToId] ?? 'Unknown'}</span>
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
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
        <span className="font-medium text-gray-700">{filteredCases.length}</span> case
        {filteredCases.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <Table
        columns={columns}
        data={pageCases}
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
  );
}
