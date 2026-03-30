'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Table, type ColumnDef, type SortState } from '@/components/ui/table';
import { SeverityBadge, Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown, FilterPill, FilterSearch } from '@/components/ui/filters';
import type { Severity } from '@/lib/types';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanFinding {
  id: string;
  title: string;
  severity: Severity;
  verdict: 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'NEEDS_REVIEW';
  verdictReason: string;
  scanner: string;
  packageName?: string;
  packageVersion?: string;
  filePath?: string;
  lineNumber?: number;
  cveIds: string[];
  cweIds: string[];
  cvssScore?: number;
  cvssVector?: string;
  fixedVersion?: string;
  advisoryUrl?: string;
  recommendation?: string;
}

interface ScanResult {
  id: string;
  timestamp: string;
  version: string;
  scannersRun: string[];
  frameworks: string[] | string;
  summary: Record<string, number>;
  totalFindings: number;
  exitCode: number;
  failOnSeverity: string;
  durationMs: number;
  dependencies?: number;
  ecosystems?: string[];
  verdictSummary: Record<string, number>;
  findings: ScanFinding[];
  complianceImpact: {
    totalAffectedControls: number;
    frameworkSummary: {
      framework: string;
      frameworkId: string;
      affectedControls: number;
      controlIds: string[];
    }[];
    entries: {
      framework: string;
      controlId: string;
      controlTitle: string;
      affectedBy: string[];
    }[];
  } | null;
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

interface ApiScanListItem {
  scanId: string;
  repository: string;
  branch: string | null;
  commitSha: string | null;
  prNumber: number | null;
  verdict: string;
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  controlsAffected: number;
  frameworks: string[];
  poamEntriesCreated: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

interface ApiScanDetail {
  id: string;
  format: string;
  repoUrl: string | null;
  commitSha: string | null;
  branch: string | null;
  prNumber: number | null;
  verdict: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  complianceImpact: unknown;
  policyReasons: unknown;
  poamEntriesCreated: number;
  findings: ApiScanFinding[];
  createdAt: string;
}

interface ApiScanFinding {
  title: string;
  severity: string;
  verdict?: string;
  verdictReason?: string;
  scannerType?: string;
  scanner?: string;
  packageName?: string;
  packageVersion?: string;
  filePath?: string;
  lineNumber?: number;
  cveIds?: string[];
  cweIds?: string[];
  cvssScore?: number;
  cvssVector?: string;
  fixedVersion?: string;
  advisoryUrl?: string;
  recommendation?: string;
}

// ---------------------------------------------------------------------------
// Transform API data → component types
// ---------------------------------------------------------------------------

function apiListItemToScanResult(item: ApiScanListItem): ScanResult {
  return {
    id: item.scanId,
    timestamp: item.createdAt,
    version: '0.1.7',
    scannersRun: [],
    frameworks: item.frameworks ?? [],
    summary: {
      CRITICAL: item.critical ?? 0,
      HIGH: item.high ?? 0,
      MEDIUM: item.medium ?? 0,
      LOW: item.low ?? 0,
      INFO: 0,
    },
    totalFindings: item.totalFindings,
    exitCode: item.verdict === 'pass' ? 0 : 1,
    failOnSeverity: 'CRITICAL',
    durationMs: 0,
    verdictSummary: { TRUE_POSITIVE: 0, FALSE_POSITIVE: 0, NEEDS_REVIEW: 0 },
    findings: [],
    complianceImpact: item.controlsAffected > 0
      ? { totalAffectedControls: item.controlsAffected, frameworkSummary: [], entries: [] }
      : null,
  };
}

function apiDetailToScanResult(detail: ApiScanDetail): ScanResult {
  const findings: ScanFinding[] = (detail.findings ?? []).map((f, idx) => ({
    id: `f-${idx}`,
    title: f.title,
    severity: (f.severity ?? 'INFO') as Severity,
    verdict: (f.verdict ?? 'TRUE_POSITIVE') as ScanFinding['verdict'],
    verdictReason: f.verdictReason ?? '',
    scanner: f.scannerType ?? f.scanner ?? 'unknown',
    packageName: f.packageName,
    packageVersion: f.packageVersion,
    filePath: f.filePath,
    lineNumber: f.lineNumber,
    cveIds: f.cveIds ?? [],
    cweIds: f.cweIds ?? [],
    cvssScore: f.cvssScore,
    cvssVector: f.cvssVector,
    fixedVersion: f.fixedVersion,
    advisoryUrl: f.advisoryUrl,
    recommendation: f.recommendation,
  }));

  const verdictSummary = { TRUE_POSITIVE: 0, FALSE_POSITIVE: 0, NEEDS_REVIEW: 0 };
  for (const f of findings) {
    verdictSummary[f.verdict] = (verdictSummary[f.verdict] ?? 0) + 1;
  }

  // Parse compliance impact from stored JSON
  let complianceImpact: ScanResult['complianceImpact'] = null;
  if (detail.complianceImpact && typeof detail.complianceImpact === 'object') {
    const ci = detail.complianceImpact as Record<string, unknown>;
    if (typeof ci.totalAffectedControls === 'number' && ci.totalAffectedControls > 0) {
      complianceImpact = ci as ScanResult['complianceImpact'];
    }
  }

  return {
    id: detail.id,
    timestamp: detail.createdAt,
    version: '0.1.7',
    scannersRun: [detail.format],
    frameworks: [],
    summary: {
      CRITICAL: detail.criticalCount,
      HIGH: detail.highCount,
      MEDIUM: detail.mediumCount,
      LOW: detail.lowCount,
      INFO: detail.infoCount,
    },
    totalFindings: detail.totalFindings,
    exitCode: detail.verdict === 'pass' ? 0 : 1,
    failOnSeverity: 'CRITICAL',
    durationMs: 0,
    verdictSummary,
    findings,
    complianceImpact,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;
const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const VERDICT_COLORS: Record<string, string> = {
  TRUE_POSITIVE: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  NEEDS_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
};

const VERDICT_LABELS: Record<string, string> = {
  TRUE_POSITIVE: 'Actionable',
  FALSE_POSITIVE: 'Dismissed',
  NEEDS_REVIEW: 'Review',
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

const EMPTY_SCAN: ScanResult = {
  id: '',
  timestamp: new Date().toISOString(),
  version: '0.1.7',
  scannersRun: [],
  frameworks: [],
  summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
  totalFindings: 0,
  exitCode: 0,
  failOnSeverity: 'CRITICAL',
  durationMs: 0,
  verdictSummary: { TRUE_POSITIVE: 0, FALSE_POSITIVE: 0, NEEDS_REVIEW: 0 },
  findings: [],
  complianceImpact: null,
};

export default function ScansPage() {
  const [scanList, setScanList] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult>(EMPTY_SCAN);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [scanPage, setScanPage] = useState(1);
  const [scanTotalPages, setScanTotalPages] = useState(1);
  const [findingPage, setFindingPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [scannerFilter, setScannerFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [findingSort, setFindingSort] = useState<SortState>({ key: 'severity', direction: 'asc' });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // --- Fetch scan list from API ---
  const fetchScans = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pipeline/scans?page=${page}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch scans');
      const data = await res.json();
      const scans: ScanResult[] = (data.scans ?? []).map((s: ApiScanListItem) => apiListItemToScanResult(s));
      setScanList(scans);
      setScanTotalPages(data.totalPages ?? 1);
      if (scans.length > 0 && !selectedScan.id) {
        await fetchScanDetail(scans[0].id);
      }
    } catch {
      setScanList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch individual scan detail ---
  const fetchScanDetail = useCallback(async (scanId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/pipeline/results/${scanId}`);
      if (!res.ok) throw new Error('Failed to fetch scan detail');
      const detail: ApiScanDetail = await res.json();
      const scan = apiDetailToScanResult(detail);
      setSelectedScan(scan);

      // Update the list item with enriched data
      setScanList((prev) =>
        prev.map((s) => (s.id === scanId ? { ...s, ...scan } : s)),
      );
    } catch {
      // If detail fetch fails, use list-level data
      const listItem = scanList.find((s) => s.id === scanId);
      if (listItem) setSelectedScan(listItem);
    } finally {
      setLoadingDetail(false);
    }
  }, [scanList]);

  // --- Load on mount ---
  useEffect(() => {
    fetchScans(1);
  }, []);

  // --- Filtered + sorted findings ---
  const filteredFindings = useMemo(() => {
    let results = selectedScan.findings;

    if (severityFilter !== 'ALL') {
      results = results.filter((f) => f.severity === severityFilter);
    }
    if (verdictFilter !== 'ALL') {
      results = results.filter((f) => f.verdict === verdictFilter);
    }
    if (scannerFilter !== 'ALL') {
      results = results.filter((f) => f.scanner === scannerFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.packageName?.toLowerCase().includes(q) ||
          f.cveIds.some((c) => c.toLowerCase().includes(q)) ||
          f.filePath?.toLowerCase().includes(q),
      );
    }

    if (findingSort.direction) {
      results = [...results].sort((a, b) => {
        const dir = findingSort.direction === 'asc' ? 1 : -1;
        switch (findingSort.key) {
          case 'severity':
            return (SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)) * dir;
          case 'cvssScore':
            return ((b.cvssScore ?? 0) - (a.cvssScore ?? 0)) * dir;
          case 'title':
            return a.title.localeCompare(b.title) * dir;
          default:
            return 0;
        }
      });
    }

    return results;
  }, [selectedScan, severityFilter, verdictFilter, scannerFilter, searchQuery, findingSort]);

  const totalFindingPages = Math.max(1, Math.ceil(filteredFindings.length / PAGE_SIZE));
  const paginatedFindings = filteredFindings.slice((findingPage - 1) * PAGE_SIZE, findingPage * PAGE_SIZE);

  // --- Scan history columns ---
  const scanColumns: ColumnDef<ScanResult>[] = [
    {
      key: 'status',
      header: 'Status',
      width: '80px',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
            row.exitCode === 0
              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
              : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
          }`}
        >
          {row.exitCode === 0 ? 'PASS' : 'FAIL'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'scanners',
      header: 'Scanners',
      render: (row) => (
        <div className="flex gap-1">
          {row.scannersRun.map((s) => (
            <Badge key={s} variant="outline">{s}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'findings',
      header: 'Findings',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{row.totalFindings}</span>
          <div className="flex gap-1 text-xs">
            {row.summary.CRITICAL > 0 && <span className="text-red-600 font-medium">{row.summary.CRITICAL}C</span>}
            {row.summary.HIGH > 0 && <span className="text-orange-600 font-medium">{row.summary.HIGH}H</span>}
            {row.summary.MEDIUM > 0 && <span className="text-yellow-600 font-medium">{row.summary.MEDIUM}M</span>}
            {row.summary.LOW > 0 && <span className="text-blue-600 font-medium">{row.summary.LOW}L</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'compliance',
      header: 'Controls Affected',
      render: (row) => (
        <span className={row.complianceImpact ? 'text-yellow-600 font-medium' : 'text-gray-400'}>
          {row.complianceImpact?.totalAffectedControls ?? 0}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{(row.durationMs / 1000).toFixed(1)}s</span>
      ),
    },
  ];

  // --- Findings table columns ---
  const findingColumns: ColumnDef<ScanFinding>[] = [
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      width: '110px',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <SeverityBadge severity={row.severity} />
          {row.cvssScore !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">CVSS {row.cvssScore}</span>
          )}
        </div>
      ),
    },
    {
      key: 'verdict',
      header: 'Verdict',
      width: '100px',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${VERDICT_COLORS[row.verdict]}`}>
          {VERDICT_LABELS[row.verdict]}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Finding',
      sortable: true,
      render: (row) => (
        <div className="max-w-md">
          <p className="font-medium text-gray-900 dark:text-white truncate">{row.title}</p>
          {row.cveIds.length > 0 && (
            <div className="mt-0.5 flex gap-1 flex-wrap">
              {row.cveIds.map((cve) => (
                <span key={cve} className="text-xs font-mono text-primary-600 dark:text-primary-400">{cve}</span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate block max-w-[200px]">
          {row.filePath
            ? `${row.filePath}${row.lineNumber ? `:${row.lineNumber}` : ''}`
            : row.packageName
              ? `${row.packageName}@${row.packageVersion ?? '?'}`
              : '-'}
        </span>
      ),
    },
    {
      key: 'cwe',
      header: 'CWE',
      width: '100px',
      render: (row) => (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {row.cweIds[0] ?? '-'}
        </span>
      ),
    },
    {
      key: 'fix',
      header: 'Fix',
      width: '120px',
      render: (row) =>
        row.fixedVersion ? (
          <span className="text-xs font-mono text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
            {row.fixedVersion}
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
    {
      key: 'scanner',
      header: 'Scanner',
      width: '80px',
      render: (row) => <Badge variant="outline">{row.scanner}</Badge>,
    },
  ];

  const scanSummary = selectedScan.summary;
  const verdictSummary = selectedScan.verdictSummary;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan Results</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            CVE identification, triage recommendations, and compliance impact from pipeline scans
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">v{selectedScan.version}</Badge>
          <span className="text-xs text-gray-400">{selectedScan.dependencies ?? 0} dependencies</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Findings" value={selectedScan.totalFindings} accent="text-gray-900 dark:text-white" />
        <StatCard label="Critical" value={scanSummary.CRITICAL ?? 0} accent={scanSummary.CRITICAL > 0 ? 'text-red-600' : 'text-gray-400'} />
        <StatCard label="High" value={scanSummary.HIGH ?? 0} accent={scanSummary.HIGH > 0 ? 'text-orange-600' : 'text-gray-400'} />
        <StatCard label="Actionable" value={verdictSummary.TRUE_POSITIVE ?? 0} accent="text-red-600" />
        <StatCard label="Auto-Dismissed" value={verdictSummary.FALSE_POSITIVE ?? 0} accent="text-gray-500" />
        <StatCard label="Controls Affected" value={selectedScan.complianceImpact?.totalAffectedControls ?? 0} accent="text-yellow-600" />
      </div>

      {/* Scan History */}
      <Card title="Scan History" description="Select a scan to view detailed findings">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
            <span className="ml-3 text-sm text-gray-500">Loading scans...</span>
          </div>
        ) : (
          <>
            <Table
              columns={scanColumns}
              data={scanList}
              getRowId={(row) => row.id}
              onRowClick={(row) => {
                fetchScanDetail(row.id);
                setFindingPage(1);
                setSeverityFilter('ALL');
                setVerdictFilter('ALL');
                setScannerFilter('ALL');
                setSearchQuery('');
              }}
              emptyMessage="No scan history found. Run a scan with: npx @cveriskpilot/scan --api-key YOUR_KEY"
            />
            {scanTotalPages > 1 && (
              <Pagination
                currentPage={scanPage}
                totalPages={scanTotalPages}
                onPageChange={(p) => { setScanPage(p); fetchScans(p); }}
              />
            )}
          </>
        )}
      </Card>

      {/* Findings Section */}
      <Card
        title={`Findings — ${filteredFindings.length} results`}
        description={
          selectedScan.exitCode === 0
            ? 'PASS — No findings at or above threshold'
            : `FAIL — Findings at or above ${selectedScan.failOnSeverity} severity`
        }
        action={
          <div className="flex items-center gap-2">
            {selectedScan.ecosystems && selectedScan.ecosystems.length > 0 && (
              <span className="text-xs text-gray-400">{selectedScan.ecosystems.join(', ')}</span>
            )}
            <span className="text-xs text-gray-400">{(selectedScan.durationMs / 1000).toFixed(1)}s</span>
          </div>
        }
      >
        {loadingDetail && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 px-4 py-2 text-sm text-blue-700 dark:text-blue-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            Loading scan details...
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FilterSearch
            placeholder="Search findings, CVEs, packages..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <FilterDropdown
            label="Severity"
            options={[
              { value: 'ALL', label: 'All Severities' },
              ...SEVERITY_ORDER.map((s) => ({ value: s, label: s })),
            ]}
            value={severityFilter}
            onChange={(v) => { setSeverityFilter(v); setFindingPage(1); }}
          />
          <FilterDropdown
            label="Verdict"
            options={[
              { value: 'ALL', label: 'All Verdicts' },
              { value: 'TRUE_POSITIVE', label: 'Actionable' },
              { value: 'NEEDS_REVIEW', label: 'Needs Review' },
              { value: 'FALSE_POSITIVE', label: 'Dismissed' },
            ]}
            value={verdictFilter}
            onChange={(v) => { setVerdictFilter(v); setFindingPage(1); }}
          />
          <FilterDropdown
            label="Scanner"
            options={[
              { value: 'ALL', label: 'All Scanners' },
              { value: 'sbom', label: 'SBOM' },
              { value: 'secrets', label: 'Secrets' },
              { value: 'iac', label: 'IaC' },
            ]}
            value={scannerFilter}
            onChange={(v) => { setScannerFilter(v); setFindingPage(1); }}
          />

          {/* Severity pills */}
          <div className="flex gap-1 ml-auto">
            {SEVERITY_ORDER.map((s) => {
              const count = selectedScan.findings.filter((f) => f.severity === s).length;
              if (count === 0) return null;
              return (
                <FilterPill
                  key={s}
                  label={`${s} (${count})`}
                  active={severityFilter === s}
                  onToggle={() => {
                    setSeverityFilter(severityFilter === s ? 'ALL' : s);
                    setFindingPage(1);
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Findings Table */}
        <Table
          columns={findingColumns}
          data={paginatedFindings}
          getRowId={(row) => row.id}
          sortState={findingSort}
          onSort={setFindingSort}
          onRowClick={(row) => setExpandedRow(expandedRow === row.id ? null : row.id)}
          emptyMessage="No findings match your filters"
        />

        {/* Expanded Finding Detail */}
        {expandedRow && (() => {
          const finding = selectedScan.findings.find((f) => f.id === expandedRow);
          if (!finding) return null;
          return (
            <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/20 p-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Left: Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{finding.title}</h4>

                  {finding.cveIds.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">CVE IDs</span>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        {finding.cveIds.map((cve) => (
                          <a
                            key={cve}
                            href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            {cve}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {finding.cvssScore !== undefined && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">CVSS Score</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          finding.cvssScore >= 9 ? 'text-red-600' :
                          finding.cvssScore >= 7 ? 'text-orange-600' :
                          finding.cvssScore >= 4 ? 'text-yellow-600' : 'text-blue-600'
                        }`}>
                          {finding.cvssScore}
                        </span>
                        {finding.cvssVector && (
                          <span className="text-xs font-mono text-gray-400 break-all">{finding.cvssVector}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {finding.cweIds.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">CWE</span>
                      <div className="mt-1 flex gap-1 flex-wrap">
                        {finding.cweIds.map((cwe) => (
                          <Badge key={cwe} variant="outline">{cwe}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {finding.verdictReason && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">Verdict Reason</span>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{finding.verdictReason}</p>
                    </div>
                  )}

                  {finding.advisoryUrl && (
                    <div>
                      <a
                        href={finding.advisoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Advisory
                      </a>
                    </div>
                  )}
                </div>

                {/* Right: Recommendation */}
                <div className="space-y-3">
                  {finding.recommendation && (
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/30 p-4">
                      <div className="flex items-start gap-2">
                        <svg className="mt-0.5 h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">Triage Recommendation</p>
                          <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-400">{finding.recommendation}</p>
                        </div>
                      </div>
                      {finding.fixedVersion && (
                        <div className="mt-3 rounded bg-cyan-100 dark:bg-cyan-900/30 px-3 py-2 font-mono text-sm text-cyan-800 dark:text-cyan-300">
                          {finding.packageName ? `npm install ${finding.packageName}@${finding.fixedVersion}` : `Fix version: ${finding.fixedVersion}`}
                        </div>
                      )}
                    </div>
                  )}

                  {!finding.recommendation && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 p-4">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Upgrade to unlock triage recommendations</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">CVE details, fix versions, and remediation guidance require a paid plan</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Pagination */}
        <div className="mt-4">
          <Pagination currentPage={findingPage} totalPages={totalFindingPages} onPageChange={setFindingPage} />
        </div>
      </Card>

      {/* Compliance Impact */}
      {selectedScan.complianceImpact && selectedScan.complianceImpact.totalAffectedControls > 0 && (
        <Card
          title="Compliance Impact"
          description={`${selectedScan.complianceImpact.totalAffectedControls} controls affected across ${selectedScan.complianceImpact.frameworkSummary.length} frameworks`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {selectedScan.complianceImpact.frameworkSummary.map((fw) => (
              <div
                key={fw.frameworkId}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{fw.framework}</h4>
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {fw.affectedControls}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {fw.controlIds.map((id) => (
                    <span
                      key={id}
                      className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-400"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Severity Distribution Bar */}
      <Card title="Severity Distribution">
        <div className="space-y-3">
          {SEVERITY_ORDER.map((sev) => {
            const count = scanSummary[sev] ?? 0;
            const pct = selectedScan.totalFindings > 0 ? (count / selectedScan.totalFindings) * 100 : 0;
            const colors: Record<string, string> = {
              CRITICAL: 'bg-red-500',
              HIGH: 'bg-orange-500',
              MEDIUM: 'bg-yellow-500',
              LOW: 'bg-blue-500',
              INFO: 'bg-gray-400',
            };
            return (
              <div key={sev} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium text-gray-600 dark:text-gray-400">{sev}</span>
                <div className="flex-1 h-5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colors[sev]} transition-all duration-500`}
                    style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
