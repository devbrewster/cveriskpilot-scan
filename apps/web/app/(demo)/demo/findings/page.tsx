'use client';

import { useState, useMemo } from 'react';
import { demoFindings } from '@/lib/demo-data';
import type { Severity, CaseStatus, ScannerType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Badge components (match real findings-list styling from badges.tsx)
// ---------------------------------------------------------------------------

const severityStyles: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 ring-red-600/20',
  HIGH: 'bg-orange-100 text-orange-800 ring-orange-600/20',
  MEDIUM: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
  LOW: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  INFO: 'bg-gray-100 text-gray-700 ring-gray-600/20',
};

const severityDots: Record<Severity, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
  INFO: 'bg-gray-400',
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${severityStyles[severity]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${severityDots[severity]}`} />
      {severity}
    </span>
  );
}

const statusStyles: Record<CaseStatus, string> = {
  NEW: 'bg-red-100 text-red-800',
  TRIAGE: 'bg-purple-100 text-purple-800',
  IN_REMEDIATION: 'bg-yellow-100 text-yellow-800',
  FIXED_PENDING_VERIFICATION: 'bg-cyan-100 text-cyan-800',
  VERIFIED_CLOSED: 'bg-green-100 text-green-800',
  REOPENED: 'bg-red-100 text-red-800',
  ACCEPTED_RISK: 'bg-blue-100 text-blue-800',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-500',
  DUPLICATE: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<CaseStatus, string> = {
  NEW: 'New',
  TRIAGE: 'Triage',
  IN_REMEDIATION: 'In Remediation',
  FIXED_PENDING_VERIFICATION: 'Fixed - Pending',
  VERIFIED_CLOSED: 'Verified & Closed',
  REOPENED: 'Reopened',
  ACCEPTED_RISK: 'Accepted Risk',
  FALSE_POSITIVE: 'False Positive',
  NOT_APPLICABLE: 'Not Applicable',
  DUPLICATE: 'Duplicate',
};

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function KevBadge({ listed }: { listed: boolean }) {
  if (listed) {
    return (
      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
        Yes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      No
    </span>
  );
}

const scannerStyles: Record<ScannerType, string> = {
  SCA: 'bg-emerald-50 text-emerald-700',
  SAST: 'bg-violet-50 text-violet-700',
  DAST: 'bg-rose-50 text-rose-700',
  IAC: 'bg-teal-50 text-teal-700',
  CONTAINER: 'bg-sky-50 text-sky-700',
  VM: 'bg-indigo-50 text-indigo-700',
  BUG_BOUNTY: 'bg-pink-50 text-pink-700',
};

function ScannerBadge({ scannerType }: { scannerType: ScannerType }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${scannerStyles[scannerType]}`}>
      {scannerType}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const SEVERITY_OPTIONS: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'TRIAGE', label: 'Triage' },
  { value: 'IN_REMEDIATION', label: 'In Remediation' },
  { value: 'FIXED_PENDING_VERIFICATION', label: 'Fixed - Pending' },
  { value: 'VERIFIED_CLOSED', label: 'Verified & Closed' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'ACCEPTED_RISK', label: 'Accepted Risk' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DemoFindingsPage() {
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    return demoFindings.filter((f) => {
      if (severityFilter && f.severity !== severityFilter) return false;
      if (statusFilter && f.status !== statusFilter) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const matchesCve = f.cveId.toLowerCase().includes(q);
        const matchesTitle = f.title.toLowerCase().includes(q);
        const matchesAsset = f.assetName.toLowerCase().includes(q);
        if (!matchesCve && !matchesTitle && !matchesAsset) return false;
      }
      return true;
    });
  }, [severityFilter, statusFilter, searchText]);

  return (
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
            Showing simulated vulnerability findings. Upload your own scans to see real data.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search CVE, title, asset..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Severity dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Result count */}
          <p className="ml-auto text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{filtered.length}</span> finding
            {filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Findings table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                CVE ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Severity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                CVSS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                EPSS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                KEV
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Scanner
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Asset
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Discovered
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  No findings match the current filters. Try adjusting your search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                      {f.cveId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{f.title}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-xs">{f.cvssScore.toFixed(1)}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-xs">{(f.epssScore * 100).toFixed(1)}%</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <KevBadge listed={f.kevListed} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ScannerBadge scannerType={f.scannerType} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{f.assetName}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-gray-500">
                      {new Date(f.discoveredAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (static) */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Page <span className="font-medium text-gray-700">1</span> of{' '}
          <span className="font-medium text-gray-700">1</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-400 shadow-sm"
          >
            Previous
          </button>
          <button
            type="button"
            disabled
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-400 shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
