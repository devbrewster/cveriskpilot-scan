import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm } from '@cveriskpilot/auth';

/**
 * GET /api/dashboard/trends — Return time-series trend data for dashboard widgets.
 * Query params: ?period=30d&framework=nist-800-53
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'cases:read');
    if (permError) return permError;

    const { searchParams } = new URL(request.url);
    const periodDays = parseInt(searchParams.get('period')?.replace('d', '') ?? '30', 10);
    const framework = searchParams.get('framework');
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Fetch data in parallel
    const [trends, complianceHistory, casesOverTime] = await Promise.all([
      // Finding trends (new CVEs, EPSS jumps, etc.)
      prisma.findingTrend.findMany({
        where: {
          organizationId: session.organizationId,
          detectedAt: { gte: since },
        },
        orderBy: { detectedAt: 'asc' },
        select: {
          metric: true,
          cveId: true,
          previousValue: true,
          currentValue: true,
          delta: true,
          severity: true,
          detectedAt: true,
        },
      }),

      // Compliance score history
      prisma.complianceSnapshot.findMany({
        where: {
          organizationId: session.organizationId,
          snapshotAt: { gte: since },
          ...(framework && { framework }),
        },
        orderBy: { snapshotAt: 'asc' },
        select: {
          framework: true,
          score: true,
          controlsTotal: true,
          controlsMet: true,
          snapshotAt: true,
        },
      }),

      // Cases created over time (group by day)
      prisma.vulnerabilityCase.findMany({
        where: {
          organizationId: session.organizationId,
          createdAt: { gte: since },
        },
        select: {
          severity: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Aggregate trends by metric
    const trendsByMetric: Record<string, number> = {};
    for (const t of trends) {
      trendsByMetric[t.metric] = (trendsByMetric[t.metric] ?? 0) + 1;
    }

    // Aggregate cases by day for time-series
    const casesByDay = new Map<string, { total: number; critical: number; high: number; medium: number; low: number }>();
    for (const c of casesOverTime) {
      const day = c.createdAt.toISOString().slice(0, 10);
      const entry = casesByDay.get(day) ?? { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
      entry.total++;
      const sev = c.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
      if (sev in entry) entry[sev]++;
      casesByDay.set(day, entry);
    }

    // Group compliance snapshots by framework for time-series
    const complianceByFramework = new Map<string, Array<{ score: number; date: string; controlsMet: number; controlsTotal: number }>>();
    for (const snap of complianceHistory) {
      const arr = complianceByFramework.get(snap.framework) ?? [];
      arr.push({
        score: snap.score,
        date: snap.snapshotAt.toISOString().slice(0, 10),
        controlsMet: snap.controlsMet,
        controlsTotal: snap.controlsTotal,
      });
      complianceByFramework.set(snap.framework, arr);
    }

    return NextResponse.json({
      period: `${periodDays}d`,
      trendSummary: trendsByMetric,
      trendEvents: trends.map((t) => ({
        ...t,
        detectedAt: t.detectedAt.toISOString(),
      })),
      casesTimeSeries: Array.from(casesByDay.entries()).map(([date, counts]) => ({
        date,
        ...counts,
      })),
      complianceTimeSeries: Object.fromEntries(complianceByFramework),
      totalTrendEvents: trends.length,
      newCasesInPeriod: casesOverTime.length,
    });
  } catch (error) {
    console.error('[API] GET /api/dashboard/trends error:', error);
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
  }
}
