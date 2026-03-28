import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';
import { isValidTransition, getValidNextStatuses } from '@/lib/workflow';

// ---------------------------------------------------------------------------
// GET /api/cases/[id] — Single case with full details
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
            vulnerabilityCaseId: id,
            fromStatus: current.status,
            toStatus: status,
            reason: reason ?? null,
          },
        });
      }

      return updated;
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
