import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, isFounderEmail } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// GET /api/ops/overview — platform-wide stats from database
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const session = auth;

  if (!session.email?.endsWith('@cveriskpilot.com') && !isFounderEmail(session.email ?? '')) {
    return NextResponse.json({ error: 'Internal staff only' }, { status: 403 });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalOrgs, activeUsers30d, totalScans, openCases] = await Promise.all([
      prisma.organization.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: {
          lastLoginAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
      }),
      prisma.uploadJob.count(),
      prisma.vulnerabilityCase.count({
        where: {
          status: { in: ['NEW', 'TRIAGE', 'IN_REMEDIATION', 'REOPENED'] },
        },
      }),
    ]);

    // Compute average MTTR (mean time to remediate) for cases closed in the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const closedCases = await prisma.vulnerabilityCase.findMany({
      where: {
        status: 'VERIFIED_CLOSED',
        updatedAt: { gte: ninetyDaysAgo },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let avgMttrDays = 0;
    if (closedCases.length > 0) {
      const totalDays = closedCases.reduce((sum, c) => {
        const days = (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgMttrDays = Math.round((totalDays / closedCases.length) * 10) / 10;
    }

    // MRR estimate: count orgs by tier and multiply by approximate tier prices
    const tierCounts = await prisma.organization.groupBy({
      by: ['tier'],
      _count: true,
      where: { deletedAt: null },
    });

    const tierPrices: Record<string, number> = {
      FREE: 0,
      FOUNDERS_BETA: 0,
      PRO: 99,
      ENTERPRISE: 2499,
      MSSP: 4999,
    };

    const mrr = tierCounts.reduce((sum, t) => {
      return sum + (tierPrices[t.tier] ?? 0) * t._count;
    }, 0);

    return NextResponse.json({
      totalOrgs,
      activeUsers30d,
      mrr,
      totalScans,
      openCases,
      avgMttrDays,
    });
  } catch (error) {
    console.error('[API] GET /api/ops/overview error:', error);
    return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 });
  }
}
