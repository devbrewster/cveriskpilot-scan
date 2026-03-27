'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Table, type SortState, type ColumnDef } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { FilterPill, FilterDropdown, FilterSearch, FilterToggle, FilterSlider } from '@/components/ui/filters';
import { SeverityBadge, StatusBadge, ScannerBadge } from '@/components/ui/badges';
import { BulkActions } from '@/components/findings/bulk-actions';
import {
  mockFindings,
  type Finding,
  type Severity,
  type CaseStatus,
  type ScannerType,
  getCaseForFinding,
  getAssetById,
} from '@/lib/mock-findings';

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

interface FindingRow {
  id: string;
  finding: Finding;
  severity: Severity;
  cveIds: string[];
  title: string;
  assetName: string;
  scannerType: ScannerType;
  scannerName: string;
  status: CaseStatus;
  epssScore: number | null;
  epssPercentile: number | null;
  kevListed: boolean;
  discoveredAt: string;
}

function buildRows(): FindingRow[] {
  return mockFindings.map((f) => {
    const vulnCase = getCaseForFinding(f);
    const asset = getAssetById(f.assetId);
    return {
      id: f.id,
      finding: f,
      severity: vulnCase?.severity ?? 'INFO',
      cveIds: vulnCase?.cveIds ?? [],
      title: vulnCase?.title ?? 'Uncategorized Finding',
      assetName: asset?.name ?? 'Unknown Asset',
      scannerType: f.scannerType,
      scannerName: f.scannerName,
      status: vulnCase?.status ?? 'NEW',
      epssScore: vulnCase?.epssScore ?? null,
      epssPercentile: vulnCase?.epssPercentile ?? null,
      kevListed: vulnCase?.kevListed ?? false,
      discoveredAt: f.discoveredAt,
    };
  });
}

export function FindingsList() {
  const router = useRouter();
  const allRows = useMemo(buildRows, []);

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

  // Filtered + sorted data
  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (selectedSeverities.size > 0) {
      rows = rows.filter((r) => selectedSeverities.has(r.severity));
    }
    if (statusFilter) {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (scannerFilter) {
      rows = rows.filter((r) => r.scannerType === scannerFilter);
    }
    if (kevOnly) {
      rows = rows.filter((r) => r.kevListed);
    }
    if (epssThreshold > 0) {
      rows = rows.filter((r) => r.epssScore !== null && r.epssScore * 100 >= epssThreshold);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.cveIds.some((cve) => cve.toLowerCase().includes(q)) ||
          r.assetName.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortState.direction) {
      const dir = sortState.direction === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const key = sortState.key as keyof FindingRow;
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

    return rows;
  }, [allRows, selectedSeverities, statusFilter, scannerFilter, kevOnly, epssThreshold, searchText, sortState]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
      router.push(`/findings/${row.id}`);
    },
    [router],
  );

  const handleBulkStatusChange = useCallback(
    (_status: CaseStatus) => {
      // In a real app, this would call an API
      setSelectedIds(new Set());
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
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
          Showing <span className="font-medium text-gray-700">{filteredRows.length}</span> finding
          {filteredRows.length !== 1 ? 's' : ''}
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
  );
}
