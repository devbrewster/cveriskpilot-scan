import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/admin/funnel — Conversion funnel summary for ops dashboard
//
// Returns cohort-based funnel data: signups, uploaded, triaged, paid
// grouped by date for the requested period (7, 30, or 90 days).
//
// Protected: platform:admin permission required.
// ---------------------------------------------------------------------------

const VALID_PERIODS = new Set([7, 30, 90]);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'platform:admin');
    if (permError) return permError;

    // Parse period from query param (default 30 days)
    const url = new URL(request.url);
    const periodParam = parseInt(url.searchParams.get('period') ?? '30', 10);
    const period = VALID_PERIODS.has(periodParam) ? periodParam : 30;

    const since = new Date();
    since.setDate(since.getDate() - period);
    since.setHours(0, 0, 0, 0);

    // Fetch all orgs created in the period with relevant aggregations
    const orgs = await prisma.organization.findMany({
      where: {
        createdAt: { gte: since },
        deletedAt: null,
      },
      select: {
        id: true,
        tier: true,
        createdAt: true,
        _count: {
          select: {
            uploadJobs: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // For triage detection: orgs that have at least one finding with enrichment data
    // (epssScore set indicates enrichment/triage has run)
    const orgsWithTriage = new Set<string>();
    if (orgs.length > 0) {
      const orgIds = orgs.map((o) => o.id);
      const triaged = await prisma.vulnerabilityCase.groupBy({
        by: ['organizationId'],
        where: {
          organizationId: { in: orgIds },
          epssScore: { not: null },
        },
        _count: { id: true },
      });
      for (const t of triaged) {
        orgsWithTriage.add(t.organizationId);
      }
    }

    // Paid tiers
    const PAID_TIERS = new Set(['FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP']);

    // Group by date
    const cohortMap = new Map<
      string,
      { signups: number; uploaded: number; triaged: number; paid: number }
    >();

    for (const org of orgs) {
      const dateKey = org.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const cohort = cohortMap.get(dateKey) ?? {
        signups: 0,
        uploaded: 0,
        triaged: 0,
        paid: 0,
      };

      cohort.signups += 1;
      if (org._count.uploadJobs > 0) cohort.uploaded += 1;
      if (orgsWithTriage.has(org.id)) cohort.triaged += 1;
      if (PAID_TIERS.has(org.tier)) cohort.paid += 1;

      cohortMap.set(dateKey, cohort);
    }

    // Convert to sorted array
    const cohorts = Array.from(cohortMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // Compute totals
    const totals = cohorts.reduce(
      (acc, c) => ({
        signups: acc.signups + c.signups,
        uploaded: acc.uploaded + c.uploaded,
        triaged: acc.triaged + c.triaged,
        paid: acc.paid + c.paid,
      }),
      { signups: 0, uploaded: 0, triaged: 0, paid: 0 },
    );

    return NextResponse.json({
      period,
      since: since.toISOString(),
      totals,
      cohorts,
    });
  } catch (error) {
    console.error('[API] GET /api/admin/funnel error:', error);
    return NextResponse.json(
      { error: 'Failed to compute funnel data' },
      { status: 500 },
    );
  }
}
