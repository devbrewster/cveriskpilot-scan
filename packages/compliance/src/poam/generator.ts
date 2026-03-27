/**
 * POAM Generator — converts VulnerabilityCase data to NIST 800-171 POAM items
 */

import type { POAMItem, POAMStatus, POAMMilestone } from './types';

// ---------------------------------------------------------------------------
// CWE to NIST 800-171 Control Family mapping (representative subset)
// ---------------------------------------------------------------------------

const CWE_TO_NIST_CONTROL: Record<string, { family: string; control: string }> = {
  // Access Control
  'CWE-284': { family: '3.1 Access Control', control: '3.1.1' },
  'CWE-287': { family: '3.1 Access Control', control: '3.1.1' },
  'CWE-306': { family: '3.1 Access Control', control: '3.1.1' },
  'CWE-862': { family: '3.1 Access Control', control: '3.1.2' },
  'CWE-863': { family: '3.1 Access Control', control: '3.1.2' },
  'CWE-269': { family: '3.1 Access Control', control: '3.1.5' },
  'CWE-732': { family: '3.1 Access Control', control: '3.1.5' },
  // Awareness and Training
  'CWE-1059': { family: '3.2 Awareness and Training', control: '3.2.1' },
  // Audit and Accountability
  'CWE-778': { family: '3.3 Audit and Accountability', control: '3.3.1' },
  'CWE-779': { family: '3.3 Audit and Accountability', control: '3.3.1' },
  // Configuration Management
  'CWE-16': { family: '3.4 Configuration Management', control: '3.4.1' },
  'CWE-1188': { family: '3.4 Configuration Management', control: '3.4.2' },
  // Identification and Authentication
  'CWE-521': { family: '3.5 Identification and Authentication', control: '3.5.7' },
  'CWE-522': { family: '3.5 Identification and Authentication', control: '3.5.10' },
  'CWE-798': { family: '3.5 Identification and Authentication', control: '3.5.10' },
  // Incident Response
  'CWE-390': { family: '3.6 Incident Response', control: '3.6.1' },
  // Media Protection
  'CWE-312': { family: '3.8 Media Protection', control: '3.8.1' },
  'CWE-313': { family: '3.8 Media Protection', control: '3.8.1' },
  // System and Communications Protection
  'CWE-319': { family: '3.13 System and Communications Protection', control: '3.13.1' },
  'CWE-326': { family: '3.13 System and Communications Protection', control: '3.13.11' },
  'CWE-327': { family: '3.13 System and Communications Protection', control: '3.13.11' },
  'CWE-295': { family: '3.13 System and Communications Protection', control: '3.13.8' },
  // System and Information Integrity
  'CWE-20': { family: '3.14 System and Information Integrity', control: '3.14.1' },
  'CWE-79': { family: '3.14 System and Information Integrity', control: '3.14.2' },
  'CWE-89': { family: '3.14 System and Information Integrity', control: '3.14.2' },
  'CWE-94': { family: '3.14 System and Information Integrity', control: '3.14.2' },
  'CWE-78': { family: '3.14 System and Information Integrity', control: '3.14.2' },
  'CWE-119': { family: '3.14 System and Information Integrity', control: '3.14.1' },
  'CWE-120': { family: '3.14 System and Information Integrity', control: '3.14.1' },
  'CWE-190': { family: '3.14 System and Information Integrity', control: '3.14.1' },
  'CWE-416': { family: '3.14 System and Information Integrity', control: '3.14.1' },
  'CWE-502': { family: '3.14 System and Information Integrity', control: '3.14.2' },
};

const DEFAULT_CONTROL = {
  family: '3.11 Risk Assessment',
  control: '3.11.2',
};

// ---------------------------------------------------------------------------
// Case status to POAM status mapping
// ---------------------------------------------------------------------------

function mapCaseStatusToPoamStatus(caseStatus: string): POAMStatus {
  switch (caseStatus) {
    case 'NEW':
    case 'TRIAGE':
      return 'PENDING';
    case 'IN_REMEDIATION':
      return 'ONGOING';
    case 'FIXED_PENDING_VERIFICATION':
      return 'ONGOING';
    case 'VERIFIED_CLOSED':
      return 'COMPLETED';
    case 'REOPENED':
      return 'DELAYED';
    case 'ACCEPTED_RISK':
    case 'FALSE_POSITIVE':
    case 'NOT_APPLICABLE':
    case 'DUPLICATE':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

// ---------------------------------------------------------------------------
// Resolve NIST control from CWE IDs
// ---------------------------------------------------------------------------

function resolveNistControl(cweIds: string[]): { family: string; control: string } {
  for (const cwe of cweIds) {
    const mapping = CWE_TO_NIST_CONTROL[cwe];
    if (mapping) return mapping;
  }
  return DEFAULT_CONTROL;
}

// ---------------------------------------------------------------------------
// Generate milestones based on case data
// ---------------------------------------------------------------------------

function generateMilestones(
  caseData: VulnerabilityCaseInput,
): POAMMilestone[] {
  const milestones: POAMMilestone[] = [];

  milestones.push({
    id: `${caseData.id}-m1`,
    description: 'Triage and assessment',
    scheduledDate: new Date(
      new Date(caseData.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    status:
      caseData.status === 'NEW' ? 'PENDING' : 'COMPLETED',
  });

  milestones.push({
    id: `${caseData.id}-m2`,
    description: 'Remediation implementation',
    scheduledDate: caseData.dueAt ?? new Date(
      new Date(caseData.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    status:
      ['VERIFIED_CLOSED', 'FIXED_PENDING_VERIFICATION'].includes(caseData.status)
        ? 'COMPLETED'
        : caseData.status === 'IN_REMEDIATION'
          ? 'IN_PROGRESS'
          : 'PENDING',
  });

  milestones.push({
    id: `${caseData.id}-m3`,
    description: 'Verification and closure',
    scheduledDate: caseData.dueAt ?? new Date(
      new Date(caseData.createdAt).getTime() + 35 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    status:
      caseData.status === 'VERIFIED_CLOSED' ? 'COMPLETED' : 'PENDING',
  });

  return milestones;
}

// ---------------------------------------------------------------------------
// Input type (subset of VulnerabilityCase)
// ---------------------------------------------------------------------------

export interface VulnerabilityCaseInput {
  id: string;
  title: string;
  description?: string | null;
  cveIds: string[];
  cweIds: string[];
  severity: string;
  cvssScore?: number | null;
  status: string;
  assignedToId?: string | null;
  assignedTo?: { name: string; email: string } | null;
  dueAt?: string | null;
  firstSeenAt: string;
  createdAt: string;
  findingCount: number;
  remediationNotes?: string | null;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generatePOAM(
  cases: VulnerabilityCaseInput[],
  orgName: string,
): POAMItem[] {
  return cases.map((c) => {
    const nistControl = resolveNistControl(c.cweIds);
    const responsible =
      c.assignedTo?.name ?? c.assignedTo?.email ?? c.assignedToId ?? orgName;

    return {
      id: c.id,
      weaknessId: c.cveIds[0] ?? c.cweIds[0] ?? c.id,
      controlFamily: nistControl.family,
      securityControl: nistControl.control,
      weaknessDescription: c.description ?? c.title,
      severity: c.severity as POAMItem['severity'],
      responsibleEntity: responsible,
      milestones: generateMilestones(c),
      scheduledCompletionDate:
        c.dueAt ??
        new Date(
          new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      status: mapCaseStatusToPoamStatus(c.status),
      resources: `${c.findingCount} finding(s) associated`,
      comments: c.remediationNotes ?? '',
      cveIds: c.cveIds,
      cweIds: c.cweIds,
      sourceOfWeakness: 'Vulnerability Scan',
      originalDetectionDate: c.firstSeenAt,
    };
  });
}

// ---------------------------------------------------------------------------
// CSV Export — NIST 800-171 POAM format
// ---------------------------------------------------------------------------

function escapeCSV(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportPOAMCsv(items: POAMItem[]): string {
  const headers = [
    'POAM ID',
    'Weakness ID',
    'Weakness Description',
    'Source of Weakness',
    'Security Control',
    'Control Family',
    'Severity',
    'CVE IDs',
    'CWE IDs',
    'Responsible Entity',
    'Scheduled Completion Date',
    'Status',
    'Milestones',
    'Resources',
    'Original Detection Date',
    'Comments',
  ];

  const rows = items.map((item) => [
    escapeCSV(item.id),
    escapeCSV(item.weaknessId),
    escapeCSV(item.weaknessDescription),
    escapeCSV(item.sourceOfWeakness),
    escapeCSV(item.securityControl),
    escapeCSV(item.controlFamily),
    escapeCSV(item.severity),
    escapeCSV(item.cveIds.join('; ')),
    escapeCSV(item.cweIds.join('; ')),
    escapeCSV(item.responsibleEntity),
    escapeCSV(item.scheduledCompletionDate.slice(0, 10)),
    escapeCSV(item.status),
    escapeCSV(
      item.milestones
        .map(
          (m) =>
            `${m.description} (${m.status}, due ${m.scheduledDate.slice(0, 10)})`,
        )
        .join('; '),
    ),
    escapeCSV(item.resources),
    escapeCSV(item.originalDetectionDate.slice(0, 10)),
    escapeCSV(item.comments),
  ]);

  return [
    headers.map((h) => escapeCSV(h)).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');
}

// ---------------------------------------------------------------------------
// JSON Export — structured
// ---------------------------------------------------------------------------

export function exportPOAMJson(items: POAMItem[]): string {
  return JSON.stringify(
    {
      poamVersion: '1.0',
      framework: 'NIST 800-171',
      generatedAt: new Date().toISOString(),
      totalItems: items.length,
      items,
    },
    null,
    2,
  );
}
