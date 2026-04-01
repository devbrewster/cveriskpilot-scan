import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { validateTransition, getValidNextStatuses } from '@/lib/workflow';
import { logAudit } from '@/lib/audit';
import { mapCweToAllFrameworks } from '@cveriskpilot/compliance';

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

    const vuln = await prisma.vulnerabilityCase.findFirst({
      where: { id, organizationId: session.organizationId },
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

    // Compute compliance impact from CWE IDs
    let complianceImpact = null;
    if (vuln.cweIds.length > 0) {
      const controlMap = new Map<string, { framework: string; controlId: string; controlTitle: string; cweIds: string[] }>();
      for (const cwe of vuln.cweIds) {
        const mappings = mapCweToAllFrameworks(cwe);
        for (const mapping of mappings) {
          for (const ctrl of mapping.mappedControls) {
            const key = `${ctrl.frameworkId}:${ctrl.controlId}`;
            const existing = controlMap.get(key);
            if (existing) {
              if (!existing.cweIds.includes(cwe)) existing.cweIds.push(cwe);
            } else {
              controlMap.set(key, { framework: ctrl.frameworkName, controlId: ctrl.controlId, controlTitle: ctrl.controlTitle, cweIds: [cwe] });
            }
          }
        }
      }
      const controls = Array.from(controlMap.values());
      const frameworkCounts = new Map<string, { name: string; count: number; controlIds: string[] }>();
      for (const ctrl of controls) {
        const existing = frameworkCounts.get(ctrl.framework);
        if (existing) { existing.count++; existing.controlIds.push(ctrl.controlId); }
        else { frameworkCounts.set(ctrl.framework, { name: ctrl.framework, count: 1, controlIds: [ctrl.controlId] }); }
      }
      complianceImpact = {
        totalAffectedControls: controls.length,
        frameworks: Array.from(frameworkCounts.values()),
        controls,
      };
    }

    return NextResponse.json({
      ...vuln,
      complianceImpact,
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

    const permError = requirePerm(session.role, 'cases:update');
    if (permError) return permError;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const { id } = await params;

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid ID parameter' }, { status: 400 });
    }

    const body = await request.json();
    const { status, assignedToId, remediationNotes, reason } = body;

    // Fetch current case
    const current = await prisma.vulnerabilityCase.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true, status: true, organizationId: true, requiresApproval: true, approvalStatus: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Validate status transition (including approval gates) if status is being changed
    if (status && status !== current.status) {
      const validation = validateTransition(current.status, status, {
        requiresApproval: current.requiresApproval,
        approvalStatus: current.approvalStatus,
      });

      if (!validation.valid) {
        if (validation.needsApproval) {
          return NextResponse.json(
            {
              error: validation.error,
              needsApproval: true,
              approvalEndpoint: `/api/cases/${id}/approval`,
            },
            { status: 403 },
          );
        }
        return NextResponse.json(
          {
            error: validation.error,
            validTransitions: getValidNextStatuses(current.status),
          },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      // Reset approval status after a successful transition
      if (status !== current.status) {
        updateData.approvalStatus = null;
      }
    }
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
