'use client';

import type { Severity, CaseStatus, ScannerType } from '@/lib/types';

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

export function SeverityBadge({ severity, size = 'sm' }: { severity: Severity; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${severityStyles[severity]} ${sizeClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${severityDots[severity]}`} />
      {severity}
    </span>
  );
}

const statusStyles: Record<CaseStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  TRIAGE: 'bg-purple-100 text-purple-800',
  IN_REMEDIATION: 'bg-blue-100 text-blue-800',
  FIXED_PENDING_VERIFICATION: 'bg-cyan-100 text-cyan-800',
  VERIFIED_CLOSED: 'bg-green-100 text-green-800',
  REOPENED: 'bg-red-100 text-red-800',
  ACCEPTED_RISK: 'bg-amber-100 text-amber-800',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-500',
  DUPLICATE: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<CaseStatus, string> = {
  NEW: 'New',
  TRIAGE: 'Triage',
  IN_REMEDIATION: 'In Remediation',
  FIXED_PENDING_VERIFICATION: 'Fixed - Pending Verification',
  VERIFIED_CLOSED: 'Verified & Closed',
  REOPENED: 'Reopened',
  ACCEPTED_RISK: 'Accepted Risk',
  FALSE_POSITIVE: 'False Positive',
  NOT_APPLICABLE: 'Not Applicable',
  DUPLICATE: 'Duplicate',
};

export function StatusBadge({ status, size = 'sm' }: { status: CaseStatus; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-md font-medium ${statusStyles[status]} ${sizeClass}`}>
      {statusLabels[status]}
    </span>
  );
}

export function getStatusLabel(status: CaseStatus): string {
  return statusLabels[status];
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

export function ScannerBadge({ scannerType }: { scannerType: ScannerType }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${scannerStyles[scannerType]}`}>
      {scannerType}
    </span>
  );
}

export function KevBadge({ listed, dueDate }: { listed: boolean; dueDate?: string | null }) {
  if (!listed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Not KEV-listed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      KEV-listed
      {dueDate && <span className="ml-1">| Due: {new Date(dueDate).toLocaleDateString()}</span>}
    </span>
  );
}
