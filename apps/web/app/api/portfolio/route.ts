import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { organizationId } = session;

    // Get all active clients for the org
    const clients = await prisma.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    });

    // For each client, compute aggregated metrics
    const portfolio = await Promise.all(
      clients.map(async (client: any) => {
        const [
          totalFindings,
          totalCases,
          severityCounts,
          statusCounts,
          slaBreaches,
        ] = await Promise.all([
          prisma.finding.count({
            where: { clientId: client.id, organizationId },
          }),
          prisma.vulnerabilityCase.count({
            where: { clientId: client.id, organizationId },
          }),
          prisma.vulnerabilityCase.groupBy({
            by: ['severity'],
            where: { clientId: client.id, organizationId },
            _count: { id: true },
          }),
          prisma.vulnerabilityCase.groupBy({
            by: ['status'],
            where: { clientId: client.id, organizationId },
            _count: { id: true },
          }),
          // SLA breaches: cases past due date that aren't closed
          prisma.vulnerabilityCase.count({
            where: {
              clientId: client.id,
              organizationId,
              dueAt: { lt: new Date() },
              status: {
                notIn: [
                  'VERIFIED_CLOSED',
                  'FALSE_POSITIVE',
                  'NOT_APPLICABLE',
                  'DUPLICATE',
                  'ACCEPTED_RISK',
                ],
              },
            },
          }),
        ]);

        // Build severity map
        const severityMap: Record<string, number> = {};
        for (const row of severityCounts) {
          severityMap[row.severity] = row._count.id;
        }

        // Count open cases (not in terminal states)
        const terminalStatuses = [
          'VERIFIED_CLOSED',
          'FALSE_POSITIVE',
          'NOT_APPLICABLE',
          'DUPLICATE',
          'ACCEPTED_RISK',
        ];
        let openCases = 0;
        for (const row of statusCounts) {
          if (!terminalStatuses.includes(row.status)) {
            openCases += row._count.id;
          }
        }

        // Compute risk score
        let riskScore = 0;
        riskScore += (severityMap['CRITICAL'] || 0) * 10;
        riskScore += (severityMap['HIGH'] || 0) * 5;
        riskScore += (severityMap['MEDIUM'] || 0) * 2;
        riskScore += (severityMap['LOW'] || 0) * 1;

        return {
          clientId: client.id,
          clientName: client.name,
          clientSlug: client.slug,
          totalFindings,
          totalCases,
          criticalCount: severityMap['CRITICAL'] || 0,
          highCount: severityMap['HIGH'] || 0,
          mediumCount: severityMap['MEDIUM'] || 0,
          lowCount: severityMap['LOW'] || 0,
          openCases,
          slaBreaches,
          riskScore,
          // Trend: would require historical data; placeholder
          trend: 'stable' as 'improving' | 'worsening' | 'stable',
        };
      }),
    );

    // Org-wide totals
    const totals = {
      totalClients: portfolio.length,
      totalFindings: portfolio.reduce((s: any, c: any) => s + c.totalFindings, 0),
      totalCases: portfolio.reduce((s: any, c: any) => s + c.totalCases, 0),
      totalCritical: portfolio.reduce((s: any, c: any) => s + c.criticalCount, 0),
      totalHigh: portfolio.reduce((s: any, c: any) => s + c.highCount, 0),
      totalOpenCases: portfolio.reduce((s: any, c: any) => s + c.openCases, 0),
      totalSlaBreaches: portfolio.reduce((s: any, c: any) => s + c.slaBreaches, 0),
    };

    return NextResponse.json({ portfolio, totals });
  } catch (error) {
    console.error('[API] GET /api/portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to load portfolio data' },
      { status: 500 },
    );
  }
}
