import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// PUT /api/cases/[id]/assign — assign or unassign a case
// ---------------------------------------------------------------------------

export async function PUT(
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
    const { assignedToId } = body as {
      assignedToId: string | null;
    };

    // Verify the case exists and belongs to the user's organization
    const existing = await prisma.vulnerabilityCase.findUnique({
      where: { id },
      select: { id: true, title: true, organizationId: true, assignedToId: true },
    });

    if (!existing || existing.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // If assigning (not unassigning), verify the target user exists
    if (assignedToId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, organizationId: true },
      });

      if (!targetUser || targetUser.organizationId !== existing.organizationId) {
        return NextResponse.json({ error: 'User not found in this organization' }, { status: 404 });
      }
    }

    // Get assigner's name for notifications
    let assignerName = 'Someone';
    const assigner = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    if (assigner) assignerName = assigner.name;

    // Update the case and create notification in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.$transaction(async (tx: any) => {
      const result = await tx.vulnerabilityCase.update({
        where: { id },
        data: { assignedToId },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create notification for the newly assigned user
      if (assignedToId && assignedToId !== existing.assignedToId) {
        await tx.notification.create({
          data: {
            userId: assignedToId,
            type: 'assignment',
            title: 'Case assigned to you',
            message: `${assignerName} assigned "${existing.title}" to you.`,
            relatedEntityType: 'VulnerabilityCase',
            relatedEntityId: id,
          },
        });
      }

      return result;
    });

    // Audit log for assignment change
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorId: session.userId,
        action: 'UPDATE',
        entityType: 'VulnerabilityCase',
        entityId: id,
        details: {
          field: 'assignedToId',
          from: existing.assignedToId,
          to: assignedToId,
        },
        hash: `assign-case-${id}-${Date.now()}`,
      },
    });

    // Fire-and-forget email to the assigned user
    if (assignedToId && assignedToId !== existing.assignedToId) {
      Promise.resolve().then(async () => {
        try {
          const { sendEmail, caseAssignedTemplate } = await import(
            '@cveriskpilot/notifications'
          );
          const assignee = await prisma.user.findUnique({
            where: { id: assignedToId },
            select: { email: true },
          });
          if (!assignee) return;

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const caseUrl = `${baseUrl}/cases/${id}`;
          const html = caseAssignedTemplate(existing.title, assignerName, caseUrl);
          await sendEmail({
            to: assignee.email,
            subject: `Case assigned: ${existing.title}`,
            html,
          });
        } catch (emailErr) {
          console.error('[assign] Email notification failed:', emailErr);
        }
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API] PUT /api/cases/[id]/assign error:', error);
    return NextResponse.json({ error: 'Failed to assign case' }, { status: 500 });
  }
}
