'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { demoFindings } from '@/lib/demo-data';
import { Table, type SortState, type ColumnDef } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import {
  FilterPill,
  FilterDropdown,
  FilterSearch,
  FilterToggle,
  FilterSlider,
} from '@/components/ui/filters';
import { SeverityBadge, StatusBadge, ScannerBadge } from '@/components/ui/badges';
import { BulkActions } from '@/components/findings/bulk-actions';
import type { Severity, CaseStatus, ScannerType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Filter options (same as FindingsList)
// ---------------------------------------------------------------------------

const SEVERITY_OPTIONS: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'TRIAGE', label: 'Triage' },
  { value: 'IN_REMEDIATION', label: 'In Remediation' },
  { value: 'FIXED_PENDING_VERIFICATION', label: 'Fixed - Pending Verification' },
  { value: 'VERIFIED_CLOSED', label: 'Verified & Closed' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'ACCEPTED_RISK', label: 'Accepted Risk' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
];

const SCANNER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Scanners' },
  { value: 'SCA', label: 'SCA' },
  { value: 'SAST', label: 'SAST' },
  { value: 'DAST', label: 'DAST' },
  { value: 'IAC', label: 'IaC' },
  { value: 'CONTAINER', label: 'Container' },
  { value: 'VM', label: 'VM' },
  { value: 'BUG_BOUNTY', label: 'Bug Bounty' },
];

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// FindingRow — same shape as the real FindingsList uses
// ---------------------------------------------------------------------------

interface FindingRow {
  id: string;
  severity: Severity;
  cveIds: string[];
  title: string;
  assetName: string;
  scannerType: ScannerType;
  scannerName: string;
  status: CaseStatus;
  epssScore: number | null;
  kevListed: boolean;
  discoveredAt: string;
}

// Map demo data to FindingRow
const allRows: FindingRow[] = demoFindings.map((f) => ({
  id: f.id,
  severity: f.severity,
  cveIds: f.cveId ? [f.cveId] : [],
  title: f.title,
  assetName: f.assetName,
  scannerType: f.scannerType,
  scannerName: f.scannerType, // demo data doesn't have scannerName, use type
  status: f.status,
  epssScore: f.epssScore ?? null,
  kevListed: f.kevListed,
  discoveredAt: f.discoveredAt,
}));

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DemoFindingsPage() {
  const router = useRouter();

  // Filter state
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set());
  const [statusFilter, setStatusFilter] = useState('');
  const [scannerFilter, setScannerFilter] = useState('');
  const [kevOnly, setKevOnly] = useState(false);
  const [epssThreshold, setEpssThreshold] = useState(0);
  const [searchText, setSearchText] = useState('');

  // Sort & pagination
  const [sortState, setSortState] = useState<SortState>({ key: 'discoveredAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSeverity = useCallback((s: Severity) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
    setCurrentPage(1);
  }, []);

  // Client-side filtering
  const filtered = useMemo(() => {
    let rows = allRows;

    // Severity
    if (selectedSeverities.size > 0) {
      rows = rows.filter((r) => selectedSeverities.has(r.severity));
    }

    // Status
    if (statusFilter) {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    // Scanner
    if (scannerFilter) {
      rows = rows.filter((r) => r.scannerType === scannerFilter);
    }

    // KEV only
    if (kevOnly) {
      rows = rows.filter((r) => r.kevListed);
    }

    // EPSS threshold
    if (epssThreshold > 0) {
      rows = rows.filter((r) => r.epssScore !== null && r.epssScore * 100 >= epssThreshold);
    }

    // Search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      rows = rows.filter((r) => {
        const matchesCve = r.cveIds.some((c) => c.toLowerCase().includes(q));
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesAsset = r.assetName.toLowerCase().includes(q);
        return matchesCve || matchesTitle || matchesAsset;
      });
    }

    return rows;
  }, [selectedSeverities, statusFilter, scannerFilter, kevOnly, epssThreshold, searchText]);

  // Client-side sorting
  const sorted = useMemo(() => {
    if (!sortState.direction) return filtered;
    const { key, direction } = sortState;
    return [...filtered].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[key];
      const bVal = (b as unknown as Record<string, unknown>)[key];

      let cmp = 0;
      if (aVal == null && bVal == null) cmp = 0;
      else if (aVal == null) cmp = -1;
      else if (bVal == null) cmp = 1;
      else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else if (typeof aVal === 'string' && typeof bVal === 'string') cmp = aVal.localeCompare(bVal);
      else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') cmp = Number(aVal) - Number(bVal);

      return direction === 'desc' ? -cmp : cmp;
    });
  }, [filtered, sortState]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, currentPage]);

  // Column definitions — exact same 8 columns as FindingsList
  const columns: ColumnDef<FindingRow>[] = useMemo(
    () => [
      {
        key: 'severity',
        header: 'Severity',
        sortable: true,
        width: '110px',
        render: (row) => <SeverityBadge severity={row.severity} />,
      },
      {
        key: 'cveIds',
        header: 'CVE IDs',
        width: '160px',
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
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (row) => <span className="font-medium text-gray-900">{row.title}</span>,
      },
      {
        key: 'assetName',
        header: 'Asset',
        sortable: true,
        render: (row) => <span className="text-gray-600">{row.assetName}</span>,
      },
      {
        key: 'scannerType',
        header: 'Scanner',
        sortable: true,
        width: '100px',
        render: (row) => <ScannerBadge scannerType={row.scannerType} />,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        width: '180px',
        render: (row) => <StatusBadge status={row.status} />,
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
        key: 'discoveredAt',
        header: 'Discovered',
        sortable: true,
        width: '120px',
        render: (row) => (
          <span className="text-gray-500">{new Date(row.discoveredAt).toLocaleDateString()}</span>
        ),
      },
    ],
    [],
  );

  const handleRowClick = useCallback(
    (row: FindingRow) => {
      router.push(`/demo/findings/${row.id}`);
    },
    [router],
  );

  const handleBulkStatusChange = useCallback(
    (_status: CaseStatus) => {
      // Demo: just clear selection
      setSelectedIds(new Set());
    },
    [],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Findings</h1>
        <p className="mt-1 text-sm text-gray-500">
          View, filter, and manage vulnerability findings from all scanners.
        </p>
      </div>

      <div className="space-y-4">
        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 flex-shrink-0 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-blue-700">
              Showing simulated findings. Upload your own scans to see real data.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-900 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="w-64">
              <FilterSearch
                value={searchText}
                onChange={(v) => {
                  setSearchText(v);
                  setCurrentPage(1);
                }}
                placeholder="Search CVE, title, asset..."
              />
            </div>

            {/* Severity pills */}
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs font-medium text-gray-500">Severity:</span>
              {SEVERITY_OPTIONS.map((s) => (
                <FilterPill
                  key={s}
                  label={s}
                  active={selectedSeverities.has(s)}
                  onToggle={() => toggleSeverity(s)}
                  onRemove={() => toggleSeverity(s)}
                />
              ))}
            </div>

            {/* Status dropdown */}
            <FilterDropdown
              label="Status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            />

            {/* Scanner dropdown */}
            <FilterDropdown
              label="Scanner"
              options={SCANNER_OPTIONS}
              value={scannerFilter}
              onChange={(v) => {
                setScannerFilter(v);
                setCurrentPage(1);
              }}
            />

            {/* KEV toggle */}
            <FilterToggle
              label="KEV Only"
              checked={kevOnly}
              onChange={(v) => {
                setKevOnly(v);
                setCurrentPage(1);
              }}
            />

            {/* EPSS threshold */}
            <FilterSlider
              label="EPSS >="
              value={epssThreshold}
              onChange={(v) => {
                setEpssThreshold(v);
                setCurrentPage(1);
              }}
              min={0}
              max={100}
              step={5}
            />
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{sorted.length}</span> finding
            {sorted.length !== 1 ? 's' : ''}
            {selectedIds.size > 0 && (
              <span className="ml-2 text-primary-600">({selectedIds.size} selected)</span>
            )}
          </p>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={pageRows}
          onSort={setSortState}
          sortState={sortState}
          onRowClick={handleRowClick}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowId={(row) => row.id}
          emptyMessage="No findings match the current filters. Try adjusting your search criteria."
        />

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <BulkActions
            selectedCount={selectedIds.size}
            onStatusChange={handleBulkStatusChange}
            onClear={() => setSelectedIds(new Set())}
          />
        )}
      </div>
    </div>
  );
}
