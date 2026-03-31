import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  requireAuth,
  destroyAllUserSessions,
  clearSessionCookie,
  getSensitiveWriteLimiter,
} from '@cveriskpilot/auth';
import { requirePerm } from '@cveriskpilot/auth';
import { checkCsrf } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

// ---------------------------------------------------------------------------
// POST /api/auth/revoke-sessions — Revoke all sessions for a user
// Body: { userId?: string }  — omit to revoke own sessions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    try {
      const limiter = getSensitiveWriteLimiter();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const allowed = await limiter.check(ip);
      if (!allowed.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch { /* Redis unavailable — don't block */ }

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    let body: { userId?: string } = {};
    try {
      body = await request.json();
    } catch { /* empty body = revoke own */ }

    const targetUserId = body.userId ?? session.userId;
    const isRevokingSelf = targetUserId === session.userId;

    // Revoking another user's sessions requires org:manage_users
    if (!isRevokingSelf) {
      const permError = requirePerm(session.role, 'org:manage_users');
      if (permError) return permError;

      // Tenant isolation: verify target user belongs to caller's org
      const targetUser = await prisma.user.findFirst({
        where: {
          id: targetUserId,
          organizationId: session.organizationId,
        },
        select: { id: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Revoke all sessions in Redis
    let destroyed = 0;
    try {
      destroyed = await destroyAllUserSessions(targetUserId);
    } catch (err) {
      console.error('[API] Failed to revoke sessions:', err);
      return NextResponse.json(
        { error: 'Failed to revoke sessions' },
        { status: 502 },
      );
    }

    // Audit log
    await logAudit({
      action: 'DELETE',
      actorId: session.userId,
      organizationId: session.organizationId,
      entityType: 'session',
      entityId: targetUserId,
      details: {
        targetUserId,
        sessionsDestroyed: destroyed,
        selfRevocation: isRevokingSelf,
      },
    }).catch(() => {});

    const response = NextResponse.json({
      destroyed,
      message: `Revoked ${destroyed} session(s) for user ${targetUserId}`,
    });

    // If revoking own sessions, clear the cookie so caller is logged out
    if (isRevokingSelf) {
      clearSessionCookie(response);
    }

    return response;
  } catch (error) {
    console.error('[API] POST /api/auth/revoke-sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 },
    );
  }
}
