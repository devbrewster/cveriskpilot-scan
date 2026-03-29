import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, MANAGE_ROLES } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// GET /api/sla/[id] — Get a specific SLA policy
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

    const policy = await prisma.slaPolicy.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        _count: { select: { vulnerabilityCases: true } },
      },
    });

    if (!policy) {
      return NextResponse.json({ error: 'SLA policy not found' }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('[API] GET /api/sla/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to load SLA policy' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/sla/[id] — Update an SLA policy
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      criticalDays,
      highDays,
      mediumDays,
      lowDays,
      kevCriticalDays,
      isDefault,
    } = body as {
      name?: string;
      description?: string;
      criticalDays?: number;
      highDays?: number;
      mediumDays?: number;
      lowDays?: number;
      kevCriticalDays?: number;
      isDefault?: boolean;
    };

    const existing = await prisma.slaPolicy.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'SLA policy not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (criticalDays !== undefined) updateData.criticalDays = criticalDays;
    if (highDays !== undefined) updateData.highDays = highDays;
    if (mediumDays !== undefined) updateData.mediumDays = mediumDays;
    if (lowDays !== undefined) updateData.lowDays = lowDays;
    if (kevCriticalDays !== undefined) updateData.kevCriticalDays = kevCriticalDays;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const policy = await prisma.$transaction(async (tx: any) => {
      // If making this the default, unset existing defaults
      if (isDefault) {
        await tx.slaPolicy.updateMany({
          where: { organizationId: existing.organizationId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.slaPolicy.update({
        where: { id },
        data: updateData,
      });
    });

    logAudit({
      organizationId: existing.organizationId,
      actorId: session.userId,
      action: 'UPDATE',
      entityType: 'SlaPolicy',
      entityId: id,
      details: updateData as Record<string, string | number | boolean>,
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error('[API] PUT /api/sla/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update SLA policy' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/sla/[id] — Delete an SLA policy (cannot delete default)
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleError = requireRole(session.role, MANAGE_ROLES);
    if (roleError) return roleError;

    const { id } = await params;

    const existing = await prisma.slaPolicy.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'SLA policy not found' }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default SLA policy' },
        { status: 400 },
      );
    }

    // Unlink cases from this policy before deleting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await tx.vulnerabilityCase.updateMany({
        where: { slaPolicyId: id },
        data: { slaPolicyId: null },
      });
      await tx.slaPolicy.delete({ where: { id } });
    });

    logAudit({
      organizationId: existing.organizationId,
      actorId: session.userId,
      action: 'DELETE',
      entityType: 'SlaPolicy',
      entityId: id,
      details: { name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/sla/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete SLA policy' },
      { status: 500 },
    );
  }
}
