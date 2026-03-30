import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, ADMIN_ROLES, checkCsrf, isFounderEmail } from '@cveriskpilot/auth';
import * as crypto from 'node:crypto';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// POST /api/ops/impersonate — Start a view-as-customer impersonation session
// DELETE /api/ops/impersonate — End an active impersonation session
// GET  /api/ops/impersonate — List recent impersonation audit entries
// ---------------------------------------------------------------------------

/** Allowed email domain for staff impersonation */
const STAFF_DOMAIN = 'cveriskpilot.com';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

function isStaffEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${STAFF_DOMAIN}`) || isFounderEmail(email);
}

// ---------------------------------------------------------------------------
// POST — Start impersonation
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleCheck = requireRole(session.role, ADMIN_ROLES);
    if (roleCheck) return roleCheck;

    // Only @cveriskpilot.com staff can impersonate
    if (!isStaffEmail(session.email)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Staff-only action' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const { organizationId, reason } = body as {
      organizationId?: string;
      reason?: string;
    };

    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'organizationId is required' },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'reason is required (minimum 10 characters)',
        },
        { status: 400 },
      );
    }

    // Generate impersonation token
    const token = `imp_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();

    // Persist audit log entry
    await logAudit({
      organizationId,
      actorId: session.userId,
      action: 'STATE_CHANGE',
      entityType: 'Impersonation',
      entityId: token,
      actorIp: getClientIp(request),
      details: {
        event: 'IMPERSONATE_START',
        staffEmail: session.email,
        targetOrganizationId: organizationId,
        reason: reason.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      token,
      organizationId,
      startedAt: now,
      message: 'Impersonation session started (read-only)',
    });
  } catch (error) {
    console.error('[ops/impersonate] POST error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE — End impersonation
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const auth2 = await requireAuth(request);
    if (auth2 instanceof NextResponse) return auth2;
    const session = auth2;

    const csrfError2 = checkCsrf(request);
    if (csrfError2) return csrfError2;

    const roleCheck = requireRole(session.role, ADMIN_ROLES);
    if (roleCheck) return roleCheck;

    if (!isStaffEmail(session.email)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Staff-only action' },
        { status: 403 },
      );
    }

    // Find the most recent IMPERSONATE_START for this user that has no
    // corresponding IMPERSONATE_END yet (best-effort without session store).
    const body = await request.json().catch(() => null);
    const organizationId = (body as Record<string, unknown>)?.organizationId as string | undefined;

    // Persist audit log entry for session end
    await logAudit({
      organizationId: organizationId ?? 'unknown',
      actorId: session.userId,
      action: 'STATE_CHANGE',
      entityType: 'Impersonation',
      entityId: crypto.randomUUID(),
      actorIp: getClientIp(request),
      details: {
        event: 'IMPERSONATE_END',
        staffEmail: session.email,
        targetOrganizationId: organizationId ?? 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Impersonation session ended',
    });
  } catch (error) {
    console.error('[ops/impersonate] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — List recent impersonation audit entries
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const roleCheck = requireRole(session.role, ADMIN_ROLES);
    if (roleCheck) return roleCheck;

    if (!isStaffEmail(session.email)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Staff-only action' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);

    const entries = await prisma.auditLog.findMany({
      where: { entityType: 'Impersonation' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        timestamp: e.createdAt.toISOString(),
        actorId: e.actorId,
        actorIp: e.actorIp,
        action: (e.details as Record<string, unknown>)?.event ?? e.action,
        targetOrganizationId: e.organizationId,
        reason: (e.details as Record<string, unknown>)?.reason ?? null,
        staffEmail: (e.details as Record<string, unknown>)?.staffEmail ?? null,
      })),
    });
  } catch (error) {
    console.error('[ops/impersonate] GET error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
