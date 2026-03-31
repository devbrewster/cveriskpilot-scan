import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// GET /api/exceptions/[id] — Get exception details
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    const exception = await prisma.riskException.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
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
    });

    if (!exception) {
      return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
    }

    // Compute derived status
    const now = new Date();
    const evidence = exception.evidence as Record<string, unknown> | null;
    let derivedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' = 'PENDING';

    if (evidence?.rejected) {
      derivedStatus = 'REJECTED';
    } else if (exception.approvedById) {
      if (exception.expiresAt && new Date(exception.expiresAt) < now) {
        derivedStatus = 'EXPIRED';
      } else {
        derivedStatus = 'APPROVED';
      }
    }

    return NextResponse.json({ ...exception, derivedStatus });
  } catch (error) {
    console.error('[API] GET /api/exceptions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load exception' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/exceptions/[id] — Approve or reject an exception
// Only ORG_OWNER and SECURITY_ADMIN roles should call this
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    const body = await request.json();

    const { action, durationDays } = body as {
      action?: 'approve' | 'reject';
      durationDays?: number;
    };

    // Use the authenticated user as the approver instead of accepting from body
    const approvedById = session.userId;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 },
      );
    }

    // Verify the approver has the right permission
    const permError = requirePerm(session.role, 'exceptions:approve');
    if (permError) return permError;

    const existing = await prisma.riskException.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        vulnerabilityCase: {
          select: { id: true, status: true, organizationId: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
    }

    if (action === 'approve') {
      const expiresAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await prisma.$transaction(async (tx: any) => {
        const updated = await tx.riskException.update({
          where: { id },
          data: {
            approvedById,
            expiresAt,
            evidence: {
              ...(existing.evidence as Record<string, unknown> ?? {}),
              rejected: false,
              approvedAt: new Date().toISOString(),
            },
          },
          include: {
            vulnerabilityCase: {
              select: { id: true, title: true, severity: true, status: true },
            },
            decidedBy: {
              select: { id: true, name: true, email: true },
            },
            approvedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // Update case status to ACCEPTED_RISK (or FALSE_POSITIVE / NOT_APPLICABLE based on type)
        const caseStatusMap: Record<string, string> = {
          ACCEPTED_RISK: 'ACCEPTED_RISK',
          FALSE_POSITIVE: 'FALSE_POSITIVE',
          NOT_APPLICABLE: 'NOT_APPLICABLE',
        };
        const newStatus = caseStatusMap[existing.type] ?? 'ACCEPTED_RISK';

        const previousStatus = existing.vulnerabilityCase.status;

        await tx.vulnerabilityCase.update({
          where: { id: existing.vulnerabilityCaseId },
          data: { status: newStatus },
        });

        // Record workflow lineage
        await tx.workflowLineage.create({
          data: {
            organizationId: session.organizationId,
            vulnerabilityCaseId: existing.vulnerabilityCaseId,
            fromStatus: previousStatus,
            toStatus: newStatus,
            changedById: approvedById,
            reason: `Risk exception approved: ${existing.reason}`,
            metadata: { exceptionId: id },
          },
        });

        return updated;
      });

      logAudit({
        organizationId: session.organizationId,
        actorId: session.userId,
        action: 'RISK_EXCEPTION',
        entityType: 'RiskException',
        entityId: id,
        details: { decision: 'APPROVED', durationDays, caseId: existing.vulnerabilityCaseId },
      });

      return NextResponse.json({ ...result, derivedStatus: 'APPROVED' });
    } else {
      // Reject — re-verify org ownership on the update path (defense in depth)
      const updated = await prisma.riskException.update({
        where: { id, organizationId: session.organizationId },
        data: {
          evidence: {
            ...(existing.evidence as Record<string, unknown> ?? {}),
            rejected: true,
            rejectedAt: new Date().toISOString(),
            rejectedById: approvedById,
          },
        },
        include: {
          vulnerabilityCase: {
            select: { id: true, title: true, severity: true, status: true },
          },
          decidedBy: {
            select: { id: true, name: true, email: true },
          },
          approvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      logAudit({
        organizationId: session.organizationId,
        actorId: session.userId,
        action: 'RISK_EXCEPTION',
        entityType: 'RiskException',
        entityId: id,
        details: { decision: 'REJECTED', caseId: existing.vulnerabilityCaseId },
      });

      return NextResponse.json({ ...updated, derivedStatus: 'REJECTED' });
    }
  } catch (error) {
    console.error('[API] PUT /api/exceptions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update exception' },
      { status: 500 },
    );
  }
}
