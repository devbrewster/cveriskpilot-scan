import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

/** Map an AuditLog entry to a dashboard activity event type. */
function classifyActivityType(
  action: string,
  entityType: string,
): 'scan' | 'case' | 'remediation' | 'alert' | 'kev' | 'policy' {
  const combined = `${action} ${entityType}`.toLowerCase();
  if (/scan|upload/.test(combined)) return 'scan';
  if (/case|triage/.test(combined)) return 'case';
  if (/remediat/.test(combined)) return 'remediation';
  if (/alert|breach/.test(combined)) return 'alert';
  if (/kev/.test(combined)) return 'kev';
  if (/policy|sla/.test(combined)) return 'policy';
  return 'case';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = session.organizationId;
    const clientId = searchParams.get('clientId');

    // MTTR date range: default 90 days, customizable via ?mttrDays=N
    const mttrDaysParam = parseInt(searchParams.get('mttrDays') ?? '90', 10);
    const mttrWindow = Math.max(1, Number.isFinite(mttrDaysParam) ? mttrDaysParam : 90);
    const mttrSince = new Date(Date.now() - mttrWindow * 86_400_000);

    // Build filter: org-scoped, optionally narrowed to a single client
    const baseFilter: Record<string, string> = { organizationId };
    if (clientId) baseFilter.clientId = clientId;
    const orgFilter = baseFilter;

    // Org-only filter for models without clientId (e.g. AuditLog)
    const orgOnlyFilter: Record<string, string> = { organizationId };

    // Run all queries in parallel
    const [
      severityCounts,
      kevCount,
      epssTop10,
      recentScans,
      totalFindings,
      totalCases,
      nearestKevDueRecord,
      resolvedCases,
      recentAuditLogs,
    ] = await Promise.all([
      // Count vulnerability cases grouped by severity
      prisma.vulnerabilityCase.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: orgFilter,
      }),

      // Count KEV-listed cases
      prisma.vulnerabilityCase.count({
        where: { ...orgFilter, kevListed: true },
      }),

      // Top 10 cases by EPSS score
      prisma.vulnerabilityCase.findMany({
        where: {
          ...orgFilter,
          epssScore: { not: null },
        },
        orderBy: { epssScore: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          cveIds: true,
          severity: true,
          epssScore: true,
          epssPercentile: true,
          kevListed: true,
          status: true,
        },
      }),

      // Recent 5 upload jobs
      prisma.uploadJob.findMany({
        where: orgFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          artifact: {
            select: {
              filename: true,
              parserFormat: true,
            },
          },
        },
      }),

      // Total findings count
      prisma.finding.count({ where: orgFilter }),

      // Total cases count
      prisma.vulnerabilityCase.count({ where: orgFilter }),

      // Nearest future KEV due date
      prisma.vulnerabilityCase.findFirst({
        where: {
          ...orgFilter,
          kevListed: true,
          kevDueDate: { not: null, gte: new Date() },
        },
        orderBy: { kevDueDate: 'asc' },
        select: { kevDueDate: true },
      }),

      // Resolved cases for MTTR calculation (VERIFIED_CLOSED, within date window)
      prisma.vulnerabilityCase.findMany({
        where: {
          ...orgFilter,
          status: 'VERIFIED_CLOSED',
          createdAt: { gte: mttrSince },
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Recent 10 audit log entries
      prisma.auditLog.findMany({
        where: orgOnlyFilter,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    // Transform severity counts into a keyed object
    const severityMap: Record<string, number> = {};
    for (const row of severityCounts) {
      severityMap[row.severity] = row._count.id;
    }

    // Compute nearestKevDueDate
    const nearestKevDueDate = nearestKevDueRecord?.kevDueDate?.toISOString() ?? null;

    // Compute MTTR (Mean Time to Remediate) in days
    let mttrDays: number | null = null;
    if (resolvedCases.length > 0) {
      const totalMs = resolvedCases.reduce((sum, c) => {
        return sum + (c.updatedAt.getTime() - c.createdAt.getTime());
      }, 0);
      const avgMs = totalMs / resolvedCases.length;
      mttrDays = Math.round((avgMs / (1000 * 60 * 60 * 24)) * 10) / 10;
    }

    // Map audit logs to activity events
    const recentActivity = recentAuditLogs.map((log) => {
      const details = log.details as Record<string, unknown> | null;
      return {
        id: log.id,
        type: classifyActivityType(log.action, log.entityType),
        title: `${log.action} ${log.entityType}`,
        description: typeof details?.description === 'string'
          ? details.description
          : undefined,
        timestamp: log.createdAt.toISOString(),
      };
    });

    // No compliance model in schema — return empty array
    const complianceScores: {
      framework: string;
      score: number;
      controlsTotal: number;
      controlsMet: number;
    }[] = [];

    return NextResponse.json({
      severityCounts: severityMap,
      kevCount,
      epssTop10,
      recentScans,
      totalFindings,
      totalCases,
      nearestKevDueDate,
      mttrDays,
      recentActivity,
      complianceScores,
    });
  } catch (error) {
    console.error('[API] GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 },
    );
  }
}
