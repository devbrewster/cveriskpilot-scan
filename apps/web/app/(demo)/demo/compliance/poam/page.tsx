'use client';

import { useState, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/* Demo POAM data                                                     */
/* ------------------------------------------------------------------ */

interface DemoPOAMItem {
  id: string;
  weaknessId: string;
  controlFamily: string;
  securityControl: string;
  weaknessDescription: string;
  severity: string;
  responsibleEntity: string;
  scheduledCompletionDate: string;
  status: string;
  cveIds: string[];
}

const DEMO_POAM_ITEMS: DemoPOAMItem[] = [
  {
    id: 'POAM-001',
    weaknessId: 'W-001',
    controlFamily: 'System and Information Integrity',
    securityControl: 'SI-2',
    weaknessDescription: 'XZ Utils supply chain backdoor (CVE-2024-3094) affecting production API servers',
    severity: 'CRITICAL',
    responsibleEntity: 'Platform Team',
    scheduledCompletionDate: '2026-04-10',
    status: 'ONGOING',
    cveIds: ['CVE-2024-3094'],
  },
  {
    id: 'POAM-002',
    weaknessId: 'W-002',
    controlFamily: 'System and Communications Protection',
    securityControl: 'SC-7',
    weaknessDescription: 'Fortinet SSL VPN out-of-bounds write allowing remote code execution',
    severity: 'CRITICAL',
    responsibleEntity: 'Network Team',
    scheduledCompletionDate: '2026-04-05',
    status: 'ONGOING',
    cveIds: ['CVE-2024-21762'],
  },
  {
    id: 'POAM-003',
    weaknessId: 'W-003',
    controlFamily: 'Access Control',
    securityControl: 'AC-6',
    weaknessDescription: 'Confluence broken access control enabling unauthenticated RCE',
    severity: 'CRITICAL',
    responsibleEntity: 'AppSec Team',
    scheduledCompletionDate: '2026-04-15',
    status: 'PENDING',
    cveIds: ['CVE-2023-22515'],
  },
  {
    id: 'POAM-004',
    weaknessId: 'W-004',
    controlFamily: 'System and Information Integrity',
    securityControl: 'SI-5',
    weaknessDescription: 'HTTP/2 Rapid Reset DDoS attack vector across load balancers',
    severity: 'HIGH',
    responsibleEntity: 'Infrastructure Team',
    scheduledCompletionDate: '2026-04-20',
    status: 'ONGOING',
    cveIds: ['CVE-2023-44487'],
  },
  {
    id: 'POAM-005',
    weaknessId: 'W-005',
    controlFamily: 'Configuration Management',
    securityControl: 'CM-6',
    weaknessDescription: 'Docker runc container escape (Leaky Vessels) on Kubernetes nodes',
    severity: 'HIGH',
    responsibleEntity: 'Platform Team',
    scheduledCompletionDate: '2026-04-25',
    status: 'PENDING',
    cveIds: ['CVE-2024-21626'],
  },
  {
    id: 'POAM-006',
    weaknessId: 'W-006',
    controlFamily: 'Identification and Authentication',
    securityControl: 'IA-5',
    weaknessDescription: 'PostgreSQL COPY privilege escalation in database servers',
    severity: 'HIGH',
    responsibleEntity: 'DBA Team',
    scheduledCompletionDate: '2026-05-01',
    status: 'DELAYED',
    cveIds: ['CVE-2019-9193'],
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-blue-100 text-blue-800',
  INFO: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<string, string> = {
  ONGOING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DELAYED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-800',
};

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function DemoPoamPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const controlFamilies = [...new Set(DEMO_POAM_ITEMS.map((i) => i.controlFamily))].sort();
  const [filterControlFamily, setFilterControlFamily] = useState<string>('ALL');

  const filtered = useMemo(() => {
    return DEMO_POAM_ITEMS.filter((item) => {
      if (filterSeverity !== 'ALL' && item.severity !== filterSeverity) return false;
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (filterControlFamily !== 'ALL' && item.controlFamily !== filterControlFamily) return false;
      return true;
    });
  }, [filterSeverity, filterStatus, filterControlFamily]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">POAM Tracking</h1>
        <p className="mt-1 text-sm text-gray-500">
          NIST 800-171 Plan of Action and Milestones generated from vulnerability cases.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated POAM data. Real POAM items are auto-generated from open vulnerability cases.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          {/* Header & Export */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                POAM — Plan of Action and Milestones
              </h2>
              <p className="text-sm text-gray-500">
                {DEMO_POAM_ITEMS.length} item{DEMO_POAM_ITEMS.length !== 1 ? 's' : ''} total.
              </p>
            </div>
            <div className="flex gap-2">
              <button disabled className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed">
                Export CSV
              </button>
              <button disabled className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed">
                Export JSON
              </button>
              <button disabled className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white opacity-50 cursor-not-allowed">
                Export XLSX (FedRAMP)
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterControlFamily}
              onChange={(e) => setFilterControlFamily(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="ALL">All Control Families</option>
              {controlFamilies.map((cf) => (
                <option key={cf} value={cf}>{cf}</option>
              ))}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="ONGOING">ONGOING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DELAYED">DELAYED</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Weakness</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Control</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Severity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Responsible</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Scheduled Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No items match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.weaknessId}</div>
                        <div className="mt-0.5 max-w-xs truncate text-xs text-gray-500">{item.weaknessDescription}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{item.securityControl}</div>
                        <div className="text-xs text-gray-500">{item.controlFamily}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[item.severity] ?? 'bg-gray-100 text-gray-800'}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.responsibleEntity}</td>
                      <td className="px-4 py-3 text-gray-700">{item.scheduledCompletionDate}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-800'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
