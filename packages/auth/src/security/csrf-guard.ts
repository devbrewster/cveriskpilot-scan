import { NextRequest, NextResponse } from 'next/server';
import { validateCsrfToken, CSRF_COOKIE_NAME } from './csrf';

/**
 * Validate CSRF token for state-changing requests.
 * Returns null if valid, or an error Response if invalid.
 *
 * Expects the token in the X-CSRF-Token header (matching the crp_csrf cookie).
 * GET, HEAD, and OPTIONS requests are skipped (safe methods).
 */
export function checkCsrf(request: NextRequest): NextResponse | null {
  // Only check on state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get('x-csrf-token');

  if (!validateCsrfToken(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: 'CSRF validation failed' },
      { status: 403 },
    );
  }

  return null;
}
