'use client';

import { useState, useMemo } from 'react';
import { compareScanResults, exportDiffToCSV } from '@/lib/export/scan-diff';
import { downloadCSV } from '@/lib/export/csv-export';
import { useToast } from '@/components/ui/toast';
import { SeverityBadge } from '@/components/ui/badge';
import type { Severity } from '@/lib/mock-data';

// Mock scan data: two scans with overlapping findings
const MOCK_SCANS: Record<string, { label: string; date: string; findings: Record<string, unknown>[] }> = {
  'scan-a': {
    label: 'Nessus Prod Scan - Mar 20',
    date: '2026-03-20',
    findings: [
      { id: 'f1', cveIds: ['CVE-2021-44228'], title: 'Log4Shell RCE', severity: 'CRITICAL', cvssScore: 10.0, assetName: 'api-gateway-prod', discoveredAt: '2026-03-20T08:00:00Z' },
      { id: 'f2', cveIds: ['CVE-2022-22965'], title: 'Spring4Shell RCE', severity: 'CRITICAL', cvssScore: 9.8, assetName: 'api-gateway-prod', discoveredAt: '2026-03-20T08:05:00Z' },
      { id: 'f3', cveIds: ['CVE-2022-3602'], title: 'OpenSSL Buffer Overflow', severity: 'HIGH', cvssScore: 7.5, assetName: 'cdn-edge-us-east', discoveredAt: '2026-03-20T08:10:00Z' },
      { id: 'f4', cveIds: ['CVE-2020-11022'], title: 'jQuery XSS', severity: 'MEDIUM', cvssScore: 6.1, assetName: 'web-frontend-staging', discoveredAt: '2026-03-20T08:15:00Z' },
      { id: 'f5', cveIds: ['CVE-2023-21931'], title: 'Java RMI Deserialization', severity: 'CRITICAL', cvssScore: 9.1, assetName: 'payment-service-prod', discoveredAt: '2026-03-20T08:20:00Z' },
      { id: 'f6', cveIds: [], title: 'Weak TLS Configuration', severity: 'MEDIUM', cvssScore: 5.3, assetName: 'api-gateway-prod', discoveredAt: '2026-03-20T08:25:00Z' },
      { id: 'f7', cveIds: [], title: 'Debug Endpoint Exposed', severity: 'LOW', cvssScore: 3.7, assetName: 'auth-service-dev', discoveredAt: '2026-03-20T08:30:00Z' },
    ],
  },
  'scan-b': {
    label: 'Nessus Prod Scan - Mar 26',
    date: '2026-03-26',
    findings: [
      { id: 'f10', cveIds: ['CVE-2021-44228'], title: 'Log4Shell RCE', severity: 'CRITICAL', cvssScore: 10.0, assetName: 'api-gateway-prod', discoveredAt: '2026-03-26T14:00:00Z' },
      { id: 'f11', cveIds: ['CVE-2022-22965'], title: 'Spring4Shell RCE', severity: 'CRITICAL', cvssScore: 9.8, assetName: 'api-gateway-prod', discoveredAt: '2026-03-26T14:05:00Z' },
      { id: 'f12', cveIds: ['CVE-2022-3602'], title: 'OpenSSL Buffer Overflow', severity: 'HIGH', cvssScore: 7.5, assetName: 'cdn-edge-us-east', discoveredAt: '2026-03-26T14:10:00Z' },
      { id: 'f13', cveIds: ['CVE-2025-66789'], title: 'Auth Bypass in Admin Panel', severity: 'CRITICAL', cvssScore: 9.8, assetName: 'api-gateway-prod', discoveredAt: '2026-03-26T14:15:00Z' },
      { id: 'f14', cveIds: ['CVE-2025-77890'], title: 'XXE Injection', severity: 'HIGH', cvssScore: 7.0, assetName: 'payment-service-prod', discoveredAt: '2026-03-26T14:20:00Z' },
      { id: 'f15', cveIds: [], title: 'Container Running as Root', severity: 'MEDIUM', cvssScore: 5.5, assetName: 'k8s-worker-node-03', discoveredAt: '2026-03-26T14:25:00Z' },
      { id: 'f16', cveIds: ['CVE-2020-11022'], title: 'jQuery XSS', severity: 'MEDIUM', cvssScore: 6.1, assetName: 'web-frontend-staging', discoveredAt: '2026-03-26T14:30:00Z' },
    ],
  },
  'scan-c': {
    label: 'SARIF SAST Results - Mar 26',
    date: '2026-03-26',
    findings: [
      { id: 'f20', cveIds: [], title: 'SQL Injection in Login', severity: 'HIGH', cvssScore: 8.6, assetName: 'api-gateway-prod', discoveredAt: '2026-03-26T10:00:00Z' },
      { id: 'f21', cveIds: [], title: 'Hardcoded Secret in Config', severity: 'HIGH', cvssScore: 7.5, assetName: 'auth-service-dev', discoveredAt: '2026-03-26T10:05:00Z' },
      { id: 'f22', cveIds: [], title: 'Path Traversal in Upload', severity: 'MEDIUM', cvssScore: 6.5, assetName: 'web-frontend-staging', discoveredAt: '2026-03-26T10:10:00Z' },
    ],
  },
};

const SCAN_IDS = Object.keys(MOCK_SCANS);

function DiffBadge({ status }: { status: 'NEW' | 'RESOLVED' | 'UNCHANGED' }) {
  const styles = {
    NEW: 'bg-green-100 text-green-800 border-green-200',
    RESOLVED: 'bg-blue-100 text-blue-800 border-blue-200',
    UNCHANGED: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
}

interface FindingTableProps {
  findings: Record<string, unknown>[];
  status: 'NEW' | 'RESOLVED' | 'UNCHANGED';
  defaultExpanded?: boolean;
}

function FindingTable({ findings, status, defaultExpanded = true }: FindingTableProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (findings.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <DiffBadge status={status} />
          <h3 className="text-sm font-semibold text-gray-900">
            {status === 'NEW' ? 'New Findings' : status === 'RESOLVED' ? 'Resolved Findings' : 'Unchanged Findings'}
          </h3>
          <span className="text-sm text-gray-500">({findings.length})</span>
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">CVE ID</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Asset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {findings.map((f, i) => {
                const cveIds = (f.cveIds as string[]) ?? [];
                return (
                  <tr key={`${status}-${i}`} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-gray-700">
                      {cveIds.length > 0 ? cveIds.join(', ') : 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-gray-900">{String(f.title ?? '')}</td>
                    <td className="px-6 py-3">
                      <SeverityBadge severity={(f.severity as Severity) ?? 'INFO'} />
                    </td>
                    <td className="px-6 py-3 text-gray-600">{String(f.assetName ?? '')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ScanCompare() {
  const [scanAId, setScanAId] = useState<string>('');
  const [scanBId, setScanBId] = useState<string>('');
  const { addToast } = useToast();

  const diff = useMemo(() => {
    if (!scanAId || !scanBId) return null;
    return compareScanResults(
      MOCK_SCANS[scanAId].findings,
      MOCK_SCANS[scanBId].findings,
    );
  }, [scanAId, scanBId]);

  function handleExportDiff() {
    if (!diff) return;
    try {
      const csv = exportDiffToCSV(diff);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `cveriskpilot-scan-diff-${date}.csv`);
      addToast('success', 'Scan comparison exported to CSV');
    } catch {
      addToast('error', 'Failed to export comparison');
    }
  }

  return (
    <div className="space-y-6">
      {/* Scan Selectors */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">Select Scans to Compare</h3>
          <p className="mt-1 text-sm text-gray-500">Choose two scans to view their differences</p>
        </div>
        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="flex-1">
            <label htmlFor="scan-a" className="block text-sm font-medium text-gray-700">
              Scan A (Baseline)
            </label>
            <select
              id="scan-a"
              value={scanAId}
              onChange={(e) => setScanAId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a scan...</option>
              {SCAN_IDS.map((id) => (
                <option key={id} value={id} disabled={id === scanBId}>
                  {MOCK_SCANS[id].label} ({MOCK_SCANS[id].findings.length} findings)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center text-gray-400">
            <svg className="h-6 w-6 rotate-90 sm:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          <div className="flex-1">
            <label htmlFor="scan-b" className="block text-sm font-medium text-gray-700">
              Scan B (Current)
            </label>
            <select
              id="scan-b"
              value={scanBId}
              onChange={(e) => setScanBId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a scan...</option>
              {SCAN_IDS.map((id) => (
                <option key={id} value={id} disabled={id === scanAId}>
                  {MOCK_SCANS[id].label} ({MOCK_SCANS[id].findings.length} findings)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!diff && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-600">No scans selected</p>
          <p className="mt-1 text-sm text-gray-400">Select two scans above to compare their results</p>
        </div>
      )}

      {/* Comparison Results */}
      {diff && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{diff.summary.totalA}</div>
              <div className="mt-1 text-xs text-gray-500">Scan A Findings</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{diff.summary.totalB}</div>
              <div className="mt-1 text-xs text-gray-500">Scan B Findings</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-700">{diff.summary.new}</div>
              <div className="mt-1 text-xs text-green-600">New</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-700">{diff.summary.resolved}</div>
              <div className="mt-1 text-xs text-blue-600">Resolved</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center shadow-sm col-span-2 sm:col-span-1">
              <div className="text-2xl font-bold text-gray-700">{diff.summary.unchanged}</div>
              <div className="mt-1 text-xs text-gray-500">Unchanged</div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExportDiff}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Diff CSV
            </button>
          </div>

          {/* Finding Tables */}
          <FindingTable findings={diff.newFindings} status="NEW" />
          <FindingTable findings={diff.resolvedFindings} status="RESOLVED" />
          <FindingTable findings={diff.unchangedFindings} status="UNCHANGED" defaultExpanded={false} />
        </>
      )}
    </div>
  );
}
