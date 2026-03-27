import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  destroySession,
} from '@cveriskpilot/auth';

export async function POST(request: NextRequest) {
  try {
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
