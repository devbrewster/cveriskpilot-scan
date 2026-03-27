'use client';

import type { Severity, CaseStatus } from '@/lib/mock-data';

const severityColors: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-800 border-blue-200',
  INFO: 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusColors: Record<CaseStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-200',
  TRIAGE: 'bg-purple-100 text-purple-800 border-purple-200',
  IN_REMEDIATION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  FIXED_PENDING_VERIFICATION: 'bg-teal-100 text-teal-800 border-teal-200',
  VERIFIED_CLOSED: 'bg-green-100 text-green-800 border-green-200',
  REOPENED: 'bg-red-100 text-red-800 border-red-200',
  ACCEPTED_RISK: 'bg-amber-100 text-amber-800 border-amber-200',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-600 border-gray-200',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-500 border-gray-200',
  DUPLICATE: 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusLabels: Record<CaseStatus, string> = {
  NEW: 'New',
  TRIAGE: 'Triage',
  IN_REMEDIATION: 'In Remediation',
  FIXED_PENDING_VERIFICATION: 'Fix Pending',
  VERIFIED_CLOSED: 'Closed',
  REOPENED: 'Reopened',
  ACCEPTED_RISK: 'Accepted Risk',
  FALSE_POSITIVE: 'False Positive',
  NOT_APPLICABLE: 'N/A',
  DUPLICATE: 'Duplicate',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border';
  const variantClass =
    variant === 'outline'
      ? 'bg-transparent border-gray-300 text-gray-700'
      : 'bg-gray-100 text-gray-700 border-gray-200';
  return <span className={`${base} ${variantClass} ${className}`}>{children}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${severityColors[severity]}`}
    >
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusColors[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
