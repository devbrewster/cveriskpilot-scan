'use client';

import { useState, useMemo } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@/components/ui/card';
import { Table, type ColumnDef, type SortState } from '@/components/ui/table';
import { SeverityBadge, Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { FilterDropdown, FilterPill, FilterSearch } from '@/components/ui/filters';
import type { Severity } from '@/lib/types';

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
// Mock Data (matches real paid-tier scan output)
// ---------------------------------------------------------------------------

const MOCK_SCANS: ScanResult[] = [
  {
    id: 'scan-001',
    timestamp: '2026-03-30T00:58:04.896Z',
    version: '0.1.7',
    scannersRun: ['sbom', 'secrets', 'iac'],
    frameworks: ['nist-800-53', 'cmmc-level2', 'soc2-type2', 'fedramp-moderate'],
    summary: { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4, INFO: 1 },
    totalFindings: 11,
    exitCode: 1,
    failOnSeverity: 'CRITICAL',
    durationMs: 32452,
    dependencies: 881,
    ecosystems: ['npm'],
    verdictSummary: { TRUE_POSITIVE: 7, FALSE_POSITIVE: 2, NEEDS_REVIEW: 2 },
    findings: [
      {
        id: 'f-001',
        title: 'SQL Injection in query builder',
        severity: 'CRITICAL',
        verdict: 'TRUE_POSITIVE',
        verdictReason: '',
        scanner: 'sbom',
        packageName: 'legacy-orm',
        packageVersion: '2.1.0',
        cveIds: ['CVE-2026-1234'],
        cweIds: ['CWE-89'],
        cvssScore: 9.8,
        cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        fixedVersion: '2.3.0',
        advisoryUrl: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
        recommendation: 'Upgrade legacy-orm to >=2.3.0 to fix CVE-2026-1234',
      },
      {
        id: 'f-002',
        title: 'Prototype Pollution in lodash',
        severity: 'HIGH',
        verdict: 'TRUE_POSITIVE',
        verdictReason: '',
        scanner: 'sbom',
        packageName: 'lodash',
        packageVersion: '4.17.19',
        cveIds: ['CVE-2021-23337'],
        cweIds: ['CWE-77'],
        cvssScore: 7.2,
        fixedVersion: '4.17.21',
        advisoryUrl: 'https://github.com/advisories/GHSA-35jh-r3h4-6jhm',
        recommendation: 'Upgrade lodash to >=4.17.21 to fix CVE-2021-23337',
      },
      {
        id: 'f-003',
        title: 'Reflected XSS in search handler',
        severity: 'HIGH',
        verdict: 'NEEDS_REVIEW',
        verdictReason: 'Input sanitization detected but may be incomplete',
        scanner: 'iac',
        filePath: 'src/api/search.ts',
        lineNumber: 18,
        cveIds: [],
        cweIds: ['CWE-79'],
        cvssScore: 6.1,
        recommendation: 'Review input sanitization in search handler for completeness',
      },
      {
        id: 'f-004',
        title: 'Weak crypto algorithm (MD5)',
        severity: 'MEDIUM',
        verdict: 'TRUE_POSITIVE',
        verdictReason: '',
        scanner: 'secrets',
        filePath: 'src/utils/hash.ts',
        lineNumber: 7,
        cveIds: [],
        cweIds: ['CWE-327'],
        recommendation: 'Replace MD5 with SHA-256 or stronger hashing algorithm',
      },
      {
        id: 'f-005',
        title: 'Entity Expansion Limits Bypassed in fast-xml-parser',
        severity: 'MEDIUM',
        verdict: 'TRUE_POSITIVE',
        verdictReason: '',
        scanner: 'sbom',
        packageName: 'fast-xml-parser',
        packageVersion: '5.5.9',
        cveIds: [],
        cweIds: ['CWE-1284'],
        cvssScore: 5.9,
        cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:H',
        advisoryUrl: 'https://github.com/advisories/GHSA-jp2q-39xq-3w4g',
        recommendation: 'No fix available for this vulnerability in fast-xml-parser. Monitor for upstream patches.',
      },
      {
        id: 'f-006',
        title: 'CSRF vulnerability in axios',
        severity: 'MEDIUM',
        verdict: 'FALSE_POSITIVE',
        verdictReason: 'Application uses custom CSRF token header, not cookies',
        scanner: 'sbom',
        packageName: 'axios',
        packageVersion: '1.5.1',
        cveIds: ['CVE-2023-45857'],
        cweIds: ['CWE-352'],
        cvssScore: 6.5,
        fixedVersion: '1.6.0',
        advisoryUrl: 'https://github.com/advisories/GHSA-68xg-gqqm-vgj8',
        recommendation: 'Upgrade axios to >=1.6.0 to fix CVE-2023-45857',
      },
      {
        id: 'f-007',
        title: '@tootallnate/once vulnerable to Incorrect Control Flow Scoping',
        severity: 'LOW',
        verdict: 'TRUE_POSITIVE',
        verdictReason: '',
        scanner: 'sbom',
        packageName: '@tootallnate/once',
        packageVersion: '2.0.0',
        cveIds: ['CVE-2026-3449'],
        cweIds: ['CWE-705'],
        cvssScore: 3.3,
        cvssVector: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L',
        fixedVersion: '3.0.1',
        advisoryUrl: 'https://github.com/advisories/GHSA-vpq2-c234-7xj6',
        recommendation: 'Upgrade @tootallnate/once to >=3.0.1 to fix CVE-2026-3449 (major version change — review for breaking changes)',
      },
      {
        id: 'f-008',
        title: 'Next.js Unbounded Memory Consumption via PPR Resume Endpoint',
        severity: 'LOW',
        verdict: 'TRUE_POSITIVE',
        verdictReason: '',
        scanner: 'sbom',
        packageName: 'next',
        packageVersion: '15.5.14',
        cveIds: ['CVE-2025-59472'],
        cweIds: ['CWE-400', 'CWE-770'],
        fixedVersion: '15.6.0-canary.61',
        advisoryUrl: 'https://github.com/advisories/GHSA-5f7q-jpqc-wp7h',
        recommendation: 'Upgrade next to >=15.6.0-canary.61 to fix CVE-2025-59472',
      },
      {
        id: 'f-009',
        title: 'Insecure TLS configuration in Terraform',
        severity: 'LOW',
        verdict: 'NEEDS_REVIEW',
        verdictReason: 'TLS 1.2 may be acceptable depending on policy',
        scanner: 'iac',
        filePath: 'deploy/terraform/main.tf',
        lineNumber: 142,
        cveIds: [],
        cweIds: ['CWE-326'],
        recommendation: 'Enforce TLS 1.3 minimum in load balancer SSL policy',
      },
      {
        id: 'f-010',
        title: 'Hardcoded test credential in fixture file',
        severity: 'LOW',
        verdict: 'FALSE_POSITIVE',
        verdictReason: 'Located in test fixture directory, not production code',
        scanner: 'secrets',
        filePath: 'e2e/helpers/fixtures.ts',
        lineNumber: 22,
        cveIds: [],
        cweIds: ['CWE-798'],
        recommendation: 'Verify credential is test-only and not used in production',
      },
      {
        id: 'f-011',
        title: 'Informational: package.json exposes internal paths',
        severity: 'INFO',
        verdict: 'TRUE_POSITIVE',
        verdictReason: '',
        scanner: 'iac',
        filePath: 'package.json',
        cveIds: [],
        cweIds: ['CWE-200'],
        recommendation: 'Review package.json exports field to limit exposed internals',
      },
    ],
    complianceImpact: {
      totalAffectedControls: 12,
      frameworkSummary: [
        { framework: 'NIST 800-53', frameworkId: 'nist-800-53', affectedControls: 4, controlIds: ['SI-10', 'SC-5', 'CM-7', 'SC-12'] },
        { framework: 'CMMC Level 2', frameworkId: 'cmmc-level2', affectedControls: 3, controlIds: ['SI.L2-3.14.1', 'SC.L2-3.13.1', 'CM.L2-3.4.2'] },
        { framework: 'SOC 2 Type II', frameworkId: 'soc2-type2', affectedControls: 2, controlIds: ['CC6.1', 'CC6.8'] },
        { framework: 'FedRAMP Moderate', frameworkId: 'fedramp-moderate', affectedControls: 3, controlIds: ['SI-10', 'SC-7', 'CM-6'] },
      ],
      entries: [],
    },
  },
  {
    id: 'scan-002',
    timestamp: '2026-03-29T18:20:00.000Z',
    version: '0.1.7',
    scannersRun: ['sbom'],
    frameworks: ['soc2-type2', 'owasp-asvs'],
    summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 0 },
    totalFindings: 3,
    exitCode: 0,
    failOnSeverity: 'CRITICAL',
    durationMs: 25000,
    dependencies: 881,
    ecosystems: ['npm'],
    verdictSummary: { TRUE_POSITIVE: 3, FALSE_POSITIVE: 0, NEEDS_REVIEW: 0 },
    findings: [],
    complianceImpact: null,
  },
  {
    id: 'scan-003',
    timestamp: '2026-03-28T10:00:00.000Z',
    version: '0.1.7',
    scannersRun: ['sbom', 'secrets'],
    frameworks: 'all',
    summary: { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 0 },
    totalFindings: 6,
    exitCode: 1,
    failOnSeverity: 'HIGH',
    durationMs: 41200,
    dependencies: 875,
    ecosystems: ['npm'],
    verdictSummary: { TRUE_POSITIVE: 4, FALSE_POSITIVE: 1, NEEDS_REVIEW: 1 },
    findings: [],
    complianceImpact: {
      totalAffectedControls: 5,
      frameworkSummary: [
        { framework: 'NIST 800-53', frameworkId: 'nist-800-53', affectedControls: 3, controlIds: ['SI-10', 'SC-5', 'CM-7'] },
        { framework: 'SOC 2 Type II', frameworkId: 'soc2-type2', affectedControls: 2, controlIds: ['CC6.1', 'CC6.8'] },
      ],
      entries: [],
    },
  },
];

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

export default function ScansPage() {
  const [selectedScan, setSelectedScan] = useState<ScanResult>(MOCK_SCANS[0]);
  const [findingPage, setFindingPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [scannerFilter, setScannerFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [findingSort, setFindingSort] = useState<SortState>({ key: 'severity', direction: 'asc' });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
      {/* Demo Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <span className="font-semibold">Demo Mode</span> — Viewing sample scan data. CVE identification and triage recommendations are a paid add-on.
        </p>
      </div>

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
        <Table
          columns={scanColumns}
          data={MOCK_SCANS}
          getRowId={(row) => row.id}
          onRowClick={(row) => {
            setSelectedScan(row);
            setFindingPage(1);
            setSeverityFilter('ALL');
            setVerdictFilter('ALL');
            setScannerFilter('ALL');
            setSearchQuery('');
          }}
          emptyMessage="No scan history found"
        />
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
