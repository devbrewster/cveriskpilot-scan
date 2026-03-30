import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  destroySession,
  requireAuth,
  getSensitiveWriteLimiter,
} from '@cveriskpilot/auth';

export async function POST(request: NextRequest) {
  try {
    // Rate limit — auth endpoint
    try {
      const limiter = getSensitiveWriteLimiter();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const allowed = await limiter.check(ip);
      if (!allowed.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch { /* Redis unavailable — don't block */ }

    // Require a valid session so we know who is logging out
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    // Destroy session in Redis if it exists (graceful fallback)
    if (sessionId) {
      try {
        await destroySession(sessionId);
      } catch {
        // Redis not available — session will expire on its own
      }
    }

    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);

    return response;
  } catch (error) {
    console.error('[API] POST /api/auth/logout error:', error);

    // Even on error, clear the cookie so the user is logged out client-side
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);

    return response;
  }
}
