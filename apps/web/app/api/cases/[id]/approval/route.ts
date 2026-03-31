import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, APPROVER_ROLES, checkCsrf } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';
import { isValidTransition, transitionRequiresApproval } from '@/lib/workflow';

// ---------------------------------------------------------------------------
// POST /api/cases/[id]/approval — Request or grant approval for a transition
// ---------------------------------------------------------------------------

export async function POST(
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

    const vuln = await prisma.vulnerabilityCase.findFirst({
      where: { id, organizationId: session.organizationId },
      select: {
        id: true,
        status: true,
        requiresApproval: true,
        approvalStatus: true,
      },
    });

    if (!vuln) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, targetStatus, reason } = body as {
      action: 'request' | 'approve' | 'reject';
      targetStatus?: string;
      reason?: string;
    };

    if (!action || !['request', 'approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be request, approve, or reject' },
        { status: 400 },
      );
    }

    // ---- Request approval ----
    if (action === 'request') {
      if (!targetStatus) {
        return NextResponse.json(
          { error: 'targetStatus is required for approval requests' },
          { status: 400 },
        );
      }

      if (!isValidTransition(vuln.status, targetStatus)) {
        return NextResponse.json(
          { error: `Invalid transition: ${vuln.status} → ${targetStatus}` },
          { status: 400 },
        );
      }

      if (!transitionRequiresApproval(vuln.status, targetStatus, vuln.requiresApproval)) {
        return NextResponse.json(
          { error: 'This transition does not require approval' },
          { status: 400 },
        );
      }

      const approval = await prisma.caseApproval.create({
        data: {
          organizationId: session.organizationId,
          vulnerabilityCaseId: id,
          requestedById: session.userId,
          requestedTransition: `${vuln.status}->${targetStatus}`,
          decision: null,
        },
      });

      await prisma.vulnerabilityCase.updateMany({
        where: { id, organizationId: session.organizationId },
        data: { approvalStatus: 'PENDING' },
      });

      await logAudit({
        organizationId: session.organizationId,
        actorId: session.userId,
        action: 'STATE_CHANGE',
        entityType: 'case',
        entityId: id,
        details: { event: 'approval.requested', transition: `${vuln.status}->${targetStatus}` },
      });

      return NextResponse.json({ approval }, { status: 201 });
    }

    // ---- Approve or reject ----
    const roleCheck = requireRole(session.role, APPROVER_ROLES);
    if (roleCheck) return roleCheck;

    // Find pending approval
    const pendingApproval = await prisma.caseApproval.findFirst({
      where: {
        vulnerabilityCaseId: id,
        organizationId: session.organizationId,
        decision: null,
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (!pendingApproval) {
      return NextResponse.json(
        { error: 'No pending approval found for this case' },
        { status: 404 },
      );
    }

    // Prevent self-approval
    if (pendingApproval.requestedById === session.userId) {
      return NextResponse.json(
        { error: 'Cannot approve your own request' },
        { status: 403 },
      );
    }

    const decision = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.caseApproval.update({
      where: { id: pendingApproval.id },
      data: {
        approverId: session.userId,
        decision,
        reason: reason ?? null,
        decidedAt: new Date(),
      },
    });

    await prisma.vulnerabilityCase.updateMany({
      where: { id, organizationId: session.organizationId },
      data: {
        approvalStatus: decision,
        approvedById: decision === 'APPROVED' ? session.userId : null,
        approvedAt: decision === 'APPROVED' ? new Date() : null,
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'STATE_CHANGE',
      entityType: 'case',
      entityId: id,
      details: {
        event: `approval.${action}`,
        transition: pendingApproval.requestedTransition,
        reason,
      },
    });

    return NextResponse.json({ approval: updated });
  } catch (error) {
    console.error('[Case Approval] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/cases/[id]/approval — List approvals for a case
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

    const approvals = await prisma.caseApproval.findMany({
      where: {
        vulnerabilityCaseId: id,
        organizationId: session.organizationId,
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error('[Case Approval] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list approvals' },
      { status: 500 },
    );
  }
}
