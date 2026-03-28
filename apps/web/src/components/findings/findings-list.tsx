'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, type SortState, type ColumnDef } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { FilterPill, FilterDropdown, FilterSearch, FilterToggle, FilterSlider } from '@/components/ui/filters';
import { SeverityBadge, StatusBadge, ScannerBadge } from '@/components/ui/badges';
import { BulkActions } from '@/components/findings/bulk-actions';
import type { ApiFinding, FindingsApiResponse, Severity, CaseStatus, ScannerType } from '@/lib/types';

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
  finding: ApiFinding;
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

function apiFindingToRow(f: ApiFinding): FindingRow {
  return {
    id: f.id,
    finding: f,
    severity: f.vulnerabilityCase?.severity ?? 'INFO',
    cveIds: f.vulnerabilityCase?.cveIds ?? [],
    title: f.vulnerabilityCase?.title ?? 'Uncategorized Finding',
    assetName: f.asset?.name ?? 'Unknown Asset',
    scannerType: f.scannerType,
    scannerName: f.scannerName,
    status: f.vulnerabilityCase?.status ?? 'NEW',
    epssScore: f.vulnerabilityCase?.epssScore ?? null,
    kevListed: f.vulnerabilityCase?.kevListed ?? false,
    discoveredAt: f.discoveredAt,
  };
}

/** Map the client-side sort key to the API sortBy param */
const SORT_KEY_MAP: Record<string, string> = {
  discoveredAt: 'discoveredAt',
  createdAt: 'createdAt',
  scannerType: 'scannerType',
};

export function FindingsList() {
  const router = useRouter();

  // Data state
  const [findings, setFindings] = useState<ApiFinding[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Debounced search value so we don't fire on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Fetch findings from API whenever filters/sort/page change
  useEffect(() => {
    const controller = new AbortController();

    async function fetchFindings() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));

      // Severity — the API takes a single severity; send the first selected
      // If multiple severities are selected, we pass them comma-separated
      // and let client-side handle the rest since the API only supports one.
      // For now, send single severity if exactly one is selected.
      if (selectedSeverities.size === 1) {
        params.set('severity', [...selectedSeverities][0]);
      }

      if (statusFilter) {
        params.set('status', statusFilter);
      }
      if (scannerFilter) {
        params.set('scannerType', scannerFilter);
      }
      if (kevOnly) {
        params.set('kevOnly', 'true');
      }
      if (epssThreshold > 0) {
        // API expects a decimal (0-1), convert from percentage
        params.set('epssMin', String(epssThreshold / 100));
      }
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      // Sort
      const apiSortBy = SORT_KEY_MAP[sortState.key] ?? 'createdAt';
      params.set('sortBy', apiSortBy);
      if (sortState.direction) {
        params.set('sortOrder', sortState.direction);
      }

      try {
        const res = await fetch(`/api/findings?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data: FindingsApiResponse = await res.json();
        setFindings(data.findings);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message ?? 'Failed to load findings');
      } finally {
        setLoading(false);
      }
    }

    fetchFindings();
    return () => controller.abort();
  }, [currentPage, selectedSeverities, statusFilter, scannerFilter, kevOnly, epssThreshold, debouncedSearch, sortState]);

  const toggleSeverity = useCallback((s: Severity) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
    setCurrentPage(1);
  }, []);

  // Convert API findings to table rows
  // If multiple severities are selected (API only supports one), filter client-side
  const rows = useMemo(() => {
    let mapped = findings.map(apiFindingToRow);

    // Client-side multi-severity filter (when more than 1 selected, API gets no severity param)
    if (selectedSeverities.size > 1) {
      mapped = mapped.filter((r) => selectedSeverities.has(r.severity));
    }

    return mapped;
  }, [findings, selectedSeverities]);

  const pageRows = rows;

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
      // TODO: call bulk-update API
      setSelectedIds(new Set());
    },
    [],
  );

  return (
    <div className="space-y-4">
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

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load findings: {error}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? (
            <span className="text-gray-400">Loading findings...</span>
          ) : (
            <>
              Showing <span className="font-medium text-gray-700">{total}</span> finding
              {total !== 1 ? 's' : ''}
              {selectedIds.size > 0 && (
                <span className="ml-2 text-primary-600">({selectedIds.size} selected)</span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Table */}
      {loading && findings.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white dark:bg-gray-900 py-16">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
            <p className="text-sm text-gray-500">Loading findings...</p>
          </div>
        </div>
      ) : (
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
      )}

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
