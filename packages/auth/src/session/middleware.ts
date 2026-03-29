// Next.js session middleware helpers for CVERiskPilot
// Reads session cookie, validates against Redis, provides auth wrappers

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession, type Session } from './redis-store';

/** Cookie name for the session ID */
export const SESSION_COOKIE_NAME = 'crp_session';

/** Cookie options for setting the session cookie */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 24 * 60 * 60, // 24 hours, matches session TTL
};

/**
 * Extract the session ID from a request's cookies.
 */
export function getSessionIdFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Get the current server-side session from a Next.js request.
 * Returns null if no valid session exists.
 */
export async function getServerSession(
  request: NextRequest,
): Promise<Session | null> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;

  // Dev-only: handle base64-encoded cookie from /api/auth/dev-session fallback
  if (sessionId.startsWith('dev:') && process.env.NODE_ENV !== 'production') {
    try {
      const payload = JSON.parse(
        Buffer.from(sessionId.slice(4), 'base64').toString('utf-8'),
      );
      return payload as Session;
    } catch {
      return null;
    }
  }

  return getSession(sessionId);
}

/**
 * Helper to get session from cookies object (for use in Server Components / Route Handlers).
 * Accepts a function that retrieves the cookie value by name.
 */
export async function getServerSessionFromCookies(
  getCookie: (name: string) => string | undefined,
): Promise<Session | null> {
  const sessionId = getCookie(SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  // Dev-only: handle base64-encoded cookie from /api/auth/dev-session fallback
  if (sessionId.startsWith('dev:') && process.env.NODE_ENV !== 'production') {
    try {
      const payload = JSON.parse(
        Buffer.from(sessionId.slice(4), 'base64').toString('utf-8'),
      );
      return payload as Session;
    } catch {
      return null;
    }
  }

  return getSession(sessionId);
}

/** Handler type for authenticated API routes */
export type AuthenticatedHandler = (
  request: NextRequest,
  session: Session,
) => Promise<NextResponse> | NextResponse;

/** Optional hook for tier-aware API rate limiting, injected by the app layer */
let _rateLimitHook: ((orgId: string) => Promise<NextResponse | null>) | null = null;

/**
 * Register a rate-limit hook to be called by withAuth on every request.
 * Called once at app startup from the Next.js layer with the billing helper.
 */
export function setRateLimitHook(
  hook: (organizationId: string) => Promise<NextResponse | null>,
): void {
  _rateLimitHook = hook;
}

/**
 * Wrap a Next.js API route handler to require authentication.
 * Returns 401 if no valid session exists.
 * Applies tier-aware API rate limiting when a rate-limit hook is registered.
 *
 * Usage:
 * ```ts
 * export const GET = withAuth(async (request, session) => {
 *   return NextResponse.json({ userId: session.userId });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid session required' },
        { status: 401 },
      );
    }

    // Tier-aware API rate limiting (if hook registered)
    if (_rateLimitHook) {
      const rateLimitResponse = await _rateLimitHook(session.organizationId);
      if (rateLimitResponse) return rateLimitResponse;
    }

    return handler(request, session);
  };
}

/**
 * Create a NextResponse with the session cookie set.
 */
export function setSessionCookie(
  response: NextResponse,
  sessionId: string,
): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
  return response;
}

/**
 * Create a NextResponse with the session cookie cleared.
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
