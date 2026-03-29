import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, requireRole, WRITE_ROLES } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/exceptions — List risk exceptions for an organization
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED, EXPIRED
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)));

    // Always scope to the authenticated user's organization
    const organizationId = session.organizationId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      vulnerabilityCase: {
        organizationId,
      },
    };

    const now = new Date();

    if (status === 'PENDING') {
      where.approvedById = null;
    } else if (status === 'APPROVED') {
      where.approvedById = { not: null };
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: now } },
      ];
    } else if (status === 'REJECTED') {
      // Rejected exceptions have type set but approvedById is a specific sentinel
      // In this schema, we track rejection by checking if evidence contains rejected flag
      where.evidence = { path: ['rejected'], equals: true };
    } else if (status === 'EXPIRED') {
      where.approvedById = { not: null };
      where.expiresAt = { lt: now };
    }

    const [exceptions, total] = await Promise.all([
      prisma.riskException.findMany({
        where,
        include: {
          vulnerabilityCase: {
            select: {
              id: true,
              title: true,
              severity: true,
              status: true,
              cveIds: true,
              organizationId: true,
            },
          },
          decidedBy: {
            select: { id: true, name: true, email: true },
          },
          approvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.riskException.count({ where }),
    ]);

    // Compute derived status for each exception
    const enriched = exceptions.map((ex: any) => {
      let derivedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' = 'PENDING';
      const evidence = ex.evidence as Record<string, unknown> | null;

      if (evidence?.rejected) {
        derivedStatus = 'REJECTED';
      } else if (ex.approvedById) {
        if (ex.expiresAt && new Date(ex.expiresAt) < now) {
          derivedStatus = 'EXPIRED';
        } else {
          derivedStatus = 'APPROVED';
        }
      }

      return { ...ex, derivedStatus };
    });

    return NextResponse.json({
      exceptions: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[API] GET /api/exceptions error:', error);
    return NextResponse.json(
      { error: 'Failed to load exceptions' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/exceptions — Request a new risk exception for a case
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleError = requireRole(session.role, WRITE_ROLES);
    if (roleError) return roleError;

    const body = await request.json();

    const {
      vulnerabilityCaseId,
      type,
      reason,
      requestedDays,
      vexRationale,
    } = body as {
      vulnerabilityCaseId?: string;
      type?: string;
      reason?: string;
      requestedDays?: number;
      vexRationale?: string;
    };

    if (!vulnerabilityCaseId) {
      return NextResponse.json(
        { error: 'vulnerabilityCaseId is required' },
        { status: 400 },
      );
    }

    if (!type || !['ACCEPTED_RISK', 'FALSE_POSITIVE', 'NOT_APPLICABLE'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: ACCEPTED_RISK, FALSE_POSITIVE, NOT_APPLICABLE' },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 },
      );
    }

    // Verify the case exists and belongs to the user's organization
    const vulnCase = await prisma.vulnerabilityCase.findUnique({
      where: { id: vulnerabilityCaseId },
    });

    if (!vulnCase || vulnCase.organizationId !== session.organizationId) {
      return NextResponse.json(
        { error: 'Vulnerability case not found' },
        { status: 404 },
      );
    }

    const exception = await prisma.riskException.create({
      data: {
        vulnerabilityCaseId,
        type: type as 'ACCEPTED_RISK' | 'FALSE_POSITIVE' | 'NOT_APPLICABLE',
        decidedById: session.userId,
        reason,
        vexRationale: vexRationale ?? null,
        evidence: { requestedDays: requestedDays ?? null, rejected: false },
      },
      include: {
        vulnerabilityCase: {
          select: { id: true, title: true, severity: true, status: true },
        },
        decidedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ exception, derivedStatus: 'PENDING' }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/exceptions error:', error);
    return NextResponse.json(
      { error: 'Failed to create exception' },
      { status: 500 },
    );
  }
}
