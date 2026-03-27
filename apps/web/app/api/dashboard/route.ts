import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const clientId = searchParams.get('clientId');

    // Build filter: org-scoped, optionally narrowed to a single client
    const baseFilter: Record<string, string> = {};
    if (organizationId) baseFilter.organizationId = organizationId;
    if (clientId) baseFilter.clientId = clientId;
    const orgFilter = baseFilter;

    // Run all queries in parallel
    const [
      severityCounts,
      kevCount,
      epssTop10,
      recentScans,
      totalFindings,
      totalCases,
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
    ]);

    // Transform severity counts into a keyed object
    const severityMap: Record<string, number> = {};
    for (const row of severityCounts) {
      severityMap[row.severity] = row._count.id;
    }

    return NextResponse.json({
      severityCounts: severityMap,
      kevCount,
      epssTop10,
      recentScans,
      totalFindings,
      totalCases,
    });
  } catch (error) {
    console.error('[API] GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 },
    );
  }
}
