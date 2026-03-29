import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkCsrf, requireRole, ADMIN_ROLES } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Retention policy store — persisted in the Organization.entitlements JSON
// field under the key "retentionPolicy".
// ---------------------------------------------------------------------------

interface RetentionPolicy {
  findingsDays: number;
  artifactsDays: number;
  auditLogsDays: number;
  reportsDays: number;
  updatedAt: string;
}

const DEFAULT_POLICY: RetentionPolicy = {
  findingsDays: 365,
  artifactsDays: 180,
  auditLogsDays: 2555, // ~7 years
  reportsDays: 365,
  updatedAt: new Date().toISOString(),
};

function getRetentionFromEntitlements(entitlements: unknown): RetentionPolicy | null {
  if (!entitlements || typeof entitlements !== 'object') return null;
  const ent = entitlements as Record<string, unknown>;
  if (!ent.retentionPolicy || typeof ent.retentionPolicy !== 'object') return null;
  return ent.retentionPolicy as RetentionPolicy;
}

// ---------------------------------------------------------------------------
// GET /api/settings/retention — current retention policy
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const organizationId = session.organizationId;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { entitlements: true },
    });

    const policy = getRetentionFromEntitlements(org?.entitlements) ?? DEFAULT_POLICY;

    return NextResponse.json({ organizationId, policy });
  } catch (error) {
    console.error('Retention policy fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention policy' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/retention — update retention policy
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleError = requireRole(session.role, ADMIN_ROLES);
    if (roleError) return roleError;

    const organizationId = session.organizationId;

    const body = await request.json();

    const { findingsDays, artifactsDays, auditLogsDays, reportsDays } = body;

    // Validation
    const errors: string[] = [];
    if (typeof findingsDays !== 'number' || findingsDays < 30)
      errors.push('findingsDays must be at least 30');
    if (typeof artifactsDays !== 'number' || artifactsDays < 30)
      errors.push('artifactsDays must be at least 30');
    if (typeof auditLogsDays !== 'number' || auditLogsDays < 365)
      errors.push('auditLogsDays must be at least 365 (1 year)');
    if (typeof reportsDays !== 'number' || reportsDays < 30)
      errors.push('reportsDays must be at least 30');

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const policy: RetentionPolicy = {
      findingsDays,
      artifactsDays,
      auditLogsDays,
      reportsDays,
      updatedAt: new Date().toISOString(),
    };

    // Persist in Organization.entitlements JSON field
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { entitlements: true },
    });

    const entitlements = {
      ...(typeof org?.entitlements === 'object' && org.entitlements !== null
        ? org.entitlements
        : {}),
      retentionPolicy: policy,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { entitlements: entitlements as any },
    });

    // Audit log for retention policy change
    try {
      await prisma.auditLog.create({
        data: {
          organizationId,
          actorId: session.userId,
          action: 'UPDATE',
          entityType: 'RetentionPolicy',
          entityId: organizationId,
          details: { findingsDays, artifactsDays, auditLogsDays, reportsDays },
          hash: `update-retention-${organizationId}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      organizationId,
      policy,
      message: 'Retention policy updated successfully',
    });
  } catch (error) {
    console.error('Retention policy update error:', error);
    return NextResponse.json(
      { error: 'Failed to update retention policy' },
      { status: 500 },
    );
  }
}
