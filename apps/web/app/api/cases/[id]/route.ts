import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, WRITE_ROLES } from '@cveriskpilot/auth';
import { isValidTransition, getValidNextStatuses } from '@/lib/workflow';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// GET /api/cases/[id] — Single case with full details
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

    const vuln = await prisma.vulnerabilityCase.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        findings: {
          include: {
            asset: {
              select: { id: true, name: true, type: true, environment: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        workflowLineages: {
          include: {
            changedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { findings: true } },
      },
    });

    if (!vuln) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify the case belongs to the user's organization
    if (vuln.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...vuln,
      validNextStatuses: getValidNextStatuses(vuln.status),
    });
  } catch (error) {
    console.error('[API] GET /api/cases/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load case' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/cases/[id] — Update case fields
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, WRITE_ROLES);
    if (roleError) return roleError;

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    const body = await request.json();
    const { status, assignedToId, remediationNotes, reason } = body;

    // Fetch current case
    const current = await prisma.vulnerabilityCase.findUnique({
      where: { id },
      select: { id: true, status: true, organizationId: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify the case belongs to the user's organization
    if (current.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Validate status transition if status is being changed
    if (status && status !== current.status) {
      if (!isValidTransition(current.status, status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${current.status} to ${status}`,
            validTransitions: getValidNextStatuses(current.status),
          },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (remediationNotes !== undefined) updateData.remediationNotes = remediationNotes;

    // Use a transaction to update the case and create workflow lineage atomically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.vulnerabilityCase.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          _count: { select: { findings: true } },
        },
      });

      // Create WorkflowLineage record if status changed
      if (status && status !== current.status) {
        await tx.workflowLineage.create({
          data: {
            organizationId: session.organizationId,
            vulnerabilityCaseId: id,
            fromStatus: current.status,
            toStatus: status,
            reason: reason ?? null,
          },
        });
      }

      return updated;
    });

    // Audit log for case updates
    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: status && status !== current.status ? 'STATE_CHANGE' : 'UPDATE',
      entityType: 'VulnerabilityCase',
      entityId: id,
      details: {
        ...(status && status !== current.status ? { fromStatus: current.status, toStatus: status } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
        ...(reason ? { reason } : {}),
      },
    });

    return NextResponse.json({
      ...result,
      validNextStatuses: getValidNextStatuses(result.status),
    });
  } catch (error) {
    console.error('[API] PATCH /api/cases/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 },
    );
  }
}
