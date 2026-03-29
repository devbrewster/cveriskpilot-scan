import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Closed statuses — cases in these statuses are not checked for SLA breach
// ---------------------------------------------------------------------------

const CLOSED_STATUSES = [
  'VERIFIED_CLOSED',
  'ACCEPTED_RISK',
  'FALSE_POSITIVE',
  'NOT_APPLICABLE',
  'DUPLICATE',
] as const;

// ---------------------------------------------------------------------------
// POST /api/sla/check — Run SLA breach check for an organization
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { organizationId } = session;

    const now = new Date();
    const approachingThreshold = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    );

    // Find all open cases with a dueAt date
    const cases = await prisma.vulnerabilityCase.findMany({
      where: {
        organizationId,
        dueAt: { not: null },
        status: { notIn: [...CLOSED_STATUSES] },
      },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        dueAt: true,
        cveIds: true,
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { dueAt: 'asc' },
    });

    const breached: Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      dueAt: Date;
      daysOverdue: number;
      cveIds: string[];
      assignedTo: { id: string; name: string; email: string } | null;
    }> = [];

    const approaching: Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      dueAt: Date;
      daysRemaining: number;
      cveIds: string[];
      assignedTo: { id: string; name: string; email: string } | null;
    }> = [];

    for (const c of cases) {
      if (!c.dueAt) continue;

      const dueAt = new Date(c.dueAt);

      if (dueAt < now) {
        const diffMs = now.getTime() - dueAt.getTime();
        const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        breached.push({
          ...c,
          dueAt,
          daysOverdue,
        });
      } else if (dueAt <= approachingThreshold) {
        const diffMs = dueAt.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        approaching.push({
          ...c,
          dueAt,
          daysRemaining,
        });
      }
    }

    // Summary by severity
    const breachBySeverity: Record<string, number> = {};
    for (const b of breached) {
      breachBySeverity[b.severity] = (breachBySeverity[b.severity] ?? 0) + 1;
    }

    const approachingBySeverity: Record<string, number> = {};
    for (const a of approaching) {
      approachingBySeverity[a.severity] =
        (approachingBySeverity[a.severity] ?? 0) + 1;
    }

    return NextResponse.json({
      checkedAt: now.toISOString(),
      totalBreached: breached.length,
      totalApproaching: approaching.length,
      breachBySeverity,
      approachingBySeverity,
      breached,
      approaching,
    });
  } catch (error) {
    console.error('[API] POST /api/sla/check error:', error);
    return NextResponse.json(
      { error: 'Failed to check SLA breaches' },
      { status: 500 },
    );
  }
}
