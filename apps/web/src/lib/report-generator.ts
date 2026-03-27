/**
 * Server-side report generation for CVERiskPilot.
 * Generates findings, executive summary, and SLA compliance data.
 */

import type { PrismaClient } from '@cveriskpilot/domain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FindingsReportRow {
  findingId: string;
  scannerType: string;
  scannerName: string;
  assetName: string;
  assetType: string;
  environment: string;
  criticality: string;
  caseTitle: string;
  severity: string;
  status: string;
  cveIds: string;
  cvssScore: string;
  epssScore: string;
  kevListed: string;
  discoveredAt: string;
  createdAt: string;
}

export interface ExecutiveSummaryData {
  organizationName: string;
  clientName: string | null;
  reportDate: string;
  dateRange: { from: string; to: string };
  totalCases: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  kevCount: number;
  avgEpssScore: number;
  meanTimeToRemediateDays: number | null;
  openCount: number;
  closedCount: number;
  topCriticalCases: {
    id: string;
    title: string;
    cveIds: string[];
    cvssScore: number | null;
    epssScore: number | null;
    kevListed: boolean;
    status: string;
  }[];
  kevExposure: {
    id: string;
    title: string;
    cveIds: string[];
    kevDueDate: string | null;
    status: string;
  }[];
}

export interface SlaComplianceRow {
  caseId: string;
  title: string;
  severity: string;
  status: string;
  cveIds: string[];
  dueAt: string | null;
  createdAt: string;
  isOverdue: boolean;
  daysRemaining: number | null;
  slaPolicyName: string | null;
}

export interface SlaReportData {
  totalCases: number;
  compliantCount: number;
  overdueCount: number;
  complianceRate: number;
  rows: SlaComplianceRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OPEN_STATUSES = ['NEW', 'TRIAGE', 'IN_REMEDIATION', 'REOPENED'];
const CLOSED_STATUSES = ['VERIFIED_CLOSED', 'FIXED_PENDING_VERIFICATION'];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Findings Report (CSV data)
// ---------------------------------------------------------------------------

export async function generateFindingsReport(
  db: PrismaClient,
  orgId: string,
  clientId: string | null,
  dateRange?: DateRange,
): Promise<string> {
  const where: Record<string, unknown> = { organizationId: orgId };
  if (clientId) where.clientId = clientId;
  if (dateRange) {
    where.createdAt = { gte: dateRange.from, lte: dateRange.to };
  }

  const findings = await (db.finding as any).findMany({
    where,
    include: {
      asset: { select: { name: true, type: true, environment: true, criticality: true } },
      vulnerabilityCase: {
        select: {
          title: true,
          severity: true,
          status: true,
          cveIds: true,
          cvssScore: true,
          epssScore: true,
          kevListed: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' as const },
    take: 50000,
  });

  const headers = [
    'Finding ID',
    'Scanner Type',
    'Scanner Name',
    'Asset Name',
    'Asset Type',
    'Environment',
    'Criticality',
    'Case Title',
    'Severity',
    'Status',
    'CVE IDs',
    'CVSS Score',
    'EPSS Score',
    'KEV Listed',
    'Discovered At',
    'Created At',
  ];

  const rows = findings.map((f: any) => [
    f.id,
    f.scannerType,
    f.scannerName,
    f.asset?.name ?? '',
    f.asset?.type ?? '',
    f.asset?.environment ?? '',
    f.asset?.criticality ?? '',
    f.vulnerabilityCase?.title ?? '',
    f.vulnerabilityCase?.severity ?? '',
    f.vulnerabilityCase?.status ?? '',
    (f.vulnerabilityCase?.cveIds ?? []).join('; '),
    f.vulnerabilityCase?.cvssScore?.toString() ?? '',
    f.vulnerabilityCase?.epssScore?.toString() ?? '',
    f.vulnerabilityCase?.kevListed ? 'Yes' : 'No',
    f.discoveredAt?.toISOString() ?? '',
    f.createdAt?.toISOString() ?? '',
  ]);

  return [
    headers.map(escapeCSV).join(','),
    ...rows.map((row: string[]) => row.map(escapeCSV).join(',')),
  ].join('\r\n');
}

// ---------------------------------------------------------------------------
// Executive Report (summary data)
// ---------------------------------------------------------------------------

export async function generateExecutiveReport(
  db: PrismaClient,
  orgId: string,
  clientId: string | null,
  dateRange?: DateRange,
): Promise<ExecutiveSummaryData> {
  const where: Record<string, unknown> = { organizationId: orgId };
  if (clientId) where.clientId = clientId;
  if (dateRange) {
    where.createdAt = { gte: dateRange.from, lte: dateRange.to };
  }

  const cases = await (db.vulnerabilityCase as any).findMany({
    where,
    include: {
      client: { select: { name: true } },
      slaPolicy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' as const },
    take: 10000,
  });

  const org = await (db.organization as any).findUnique({ where: { id: orgId } });
  let clientName: string | null = null;
  if (clientId) {
    const client = await (db.client as any).findUnique({ where: { id: clientId } });
    clientName = client?.name ?? null;
  }

  const criticalCount = cases.filter((c: any) => c.severity === 'CRITICAL').length;
  const highCount = cases.filter((c: any) => c.severity === 'HIGH').length;
  const mediumCount = cases.filter((c: any) => c.severity === 'MEDIUM').length;
  const lowCount = cases.filter((c: any) => c.severity === 'LOW').length;
  const infoCount = cases.filter((c: any) => c.severity === 'INFO').length;
  const kevCases = cases.filter((c: any) => c.kevListed);

  const epssScores = cases
    .map((c: any) => c.epssScore)
    .filter((s: number | null): s is number => s !== null && s !== undefined);
  const avgEpss = epssScores.length > 0
    ? epssScores.reduce((a: number, b: number) => a + b, 0) / epssScores.length
    : 0;

  const openCases = cases.filter((c: any) => OPEN_STATUSES.includes(c.status));
  const closedCases = cases.filter((c: any) => CLOSED_STATUSES.includes(c.status));

  // Mean time to remediate for closed cases
  let meanTTR: number | null = null;
  const closedWithDates = closedCases.filter(
    (c: any) => c.createdAt && c.updatedAt,
  );
  if (closedWithDates.length > 0) {
    const totalDays = closedWithDates.reduce((sum: number, c: any) => {
      const days =
        (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    meanTTR = Math.round((totalDays / closedWithDates.length) * 10) / 10;
  }

  const topCritical = cases
    .filter((c: any) => c.severity === 'CRITICAL' || c.severity === 'HIGH')
    .sort((a: any, b: any) => (b.cvssScore ?? 0) - (a.cvssScore ?? 0))
    .slice(0, 10)
    .map((c: any) => ({
      id: c.id,
      title: c.title,
      cveIds: c.cveIds,
      cvssScore: c.cvssScore,
      epssScore: c.epssScore,
      kevListed: c.kevListed,
      status: c.status,
    }));

  const kevExposure = kevCases.map((c: any) => ({
    id: c.id,
    title: c.title,
    cveIds: c.cveIds,
    kevDueDate: c.kevDueDate?.toISOString()?.slice(0, 10) ?? null,
    status: c.status,
  }));

  const now = new Date();
  return {
    organizationName: org?.name ?? 'Unknown',
    clientName,
    reportDate: now.toISOString().slice(0, 10),
    dateRange: {
      from: dateRange?.from.toISOString().slice(0, 10) ?? 'All time',
      to: dateRange?.to.toISOString().slice(0, 10) ?? now.toISOString().slice(0, 10),
    },
    totalCases: cases.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    infoCount,
    kevCount: kevCases.length,
    avgEpssScore: avgEpss,
    meanTimeToRemediateDays: meanTTR,
    openCount: openCases.length,
    closedCount: closedCases.length,
    topCriticalCases: topCritical,
    kevExposure,
  };
}

// ---------------------------------------------------------------------------
// SLA Compliance Report
// ---------------------------------------------------------------------------

export async function generateSlaReport(
  db: PrismaClient,
  orgId: string,
  clientId: string | null,
): Promise<SlaReportData> {
  const where: Record<string, unknown> = { organizationId: orgId };
  if (clientId) where.clientId = clientId;
  // Only include cases that have an SLA or a due date
  where.OR = [
    { slaPolicyId: { not: null } },
    { dueAt: { not: null } },
  ];

  const cases = await (db.vulnerabilityCase as any).findMany({
    where,
    include: {
      slaPolicy: { select: { name: true } },
    },
    orderBy: { dueAt: 'asc' as const },
    take: 10000,
  });

  const now = new Date();
  const rows: SlaComplianceRow[] = cases.map((c: any) => {
    const dueAt = c.dueAt ? new Date(c.dueAt) : null;
    const isClosed = CLOSED_STATUSES.includes(c.status);
    const isOverdue = dueAt ? (!isClosed && dueAt < now) : false;
    const daysRemaining = dueAt
      ? Math.ceil((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      caseId: c.id,
      title: c.title,
      severity: c.severity,
      status: c.status,
      cveIds: c.cveIds,
      dueAt: dueAt?.toISOString().slice(0, 10) ?? null,
      createdAt: c.createdAt.toISOString().slice(0, 10),
      isOverdue,
      daysRemaining,
      slaPolicyName: c.slaPolicy?.name ?? null,
    };
  });

  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const compliantCount = rows.length - overdueCount;
  const complianceRate = rows.length > 0 ? Math.round((compliantCount / rows.length) * 100) : 100;

  return {
    totalCases: rows.length,
    compliantCount,
    overdueCount,
    complianceRate,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Format SLA report as CSV
// ---------------------------------------------------------------------------

export function slaReportToCSV(data: SlaReportData): string {
  const headers = [
    'Case ID',
    'Title',
    'Severity',
    'Status',
    'CVE IDs',
    'Due Date',
    'Created At',
    'Overdue',
    'Days Remaining',
    'SLA Policy',
  ];

  const rows = data.rows.map((r) => [
    r.caseId,
    r.title,
    r.severity,
    r.status,
    r.cveIds.join('; '),
    r.dueAt ?? '',
    r.createdAt,
    r.isOverdue ? 'Yes' : 'No',
    r.daysRemaining?.toString() ?? '',
    r.slaPolicyName ?? '',
  ]);

  return [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\r\n');
}
