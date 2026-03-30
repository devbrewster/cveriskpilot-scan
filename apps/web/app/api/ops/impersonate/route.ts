import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, ADMIN_ROLES, checkCsrf, isFounderEmail } from '@cveriskpilot/auth';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// POST /api/ops/impersonate — Start a view-as-customer impersonation session
// DELETE /api/ops/impersonate — End an active impersonation session
// ---------------------------------------------------------------------------

/** Allowed email domain for staff impersonation */
const STAFF_DOMAIN = 'cveriskpilot.com';

/** In-memory store for active impersonation sessions (mock) */
const activeSessions = new Map<
  string,
  {
    token: string;
    staffEmail: string;
    organizationId: string;
    reason: string;
    startedAt: string;
  }
>();

/** In-memory audit log for impersonation events (mock) */
export const impersonationAuditLog: Array<{
  id: string;
  timestamp: string;
  staffEmail: string;
  action: 'IMPERSONATE_START' | 'IMPERSONATE_END';
  targetOrganizationId: string;
  reason: string;
  ip: string;
}> = [];

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

    // Prevent double-impersonation
    if (activeSessions.has(session.userId)) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message:
            'An impersonation session is already active. End it first.',
        },
        { status: 409 },
      );
    }

    // Generate mock impersonation token
    const token = `imp_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();

    // Store active session
    activeSessions.set(session.userId, {
      token,
      staffEmail: session.email,
      organizationId,
      reason: reason.trim(),
      startedAt: now,
    });

    // Create audit log entry
    impersonationAuditLog.push({
      id: crypto.randomUUID(),
      timestamp: now,
      staffEmail: session.email,
      action: 'IMPERSONATE_START',
      targetOrganizationId: organizationId,
      reason: reason.trim(),
      ip: getClientIp(request),
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

    const activeSession = activeSessions.get(session.userId);
    if (!activeSession) {
      return NextResponse.json(
        { error: 'Not Found', message: 'No active impersonation session' },
        { status: 404 },
      );
    }

    // Audit log the end
    impersonationAuditLog.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      staffEmail: session.email,
      action: 'IMPERSONATE_END',
      targetOrganizationId: activeSession.organizationId,
      reason: activeSession.reason,
      ip: getClientIp(request),
    });

    // Remove session
    activeSessions.delete(session.userId);

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
