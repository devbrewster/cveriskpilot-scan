import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, checkCsrf, requireRole, ADMIN_ROLES } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// In-memory retention policy store (per org)
// In production, this would be stored in a database model or settings table.
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

// Simple in-memory store keyed by organizationId
const retentionPolicies: Record<string, RetentionPolicy> = {};

// ---------------------------------------------------------------------------
// GET /api/settings/retention — current retention policy
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = session.organizationId;

    const policy = retentionPolicies[organizationId] ?? DEFAULT_POLICY;

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
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    retentionPolicies[organizationId] = policy;

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
