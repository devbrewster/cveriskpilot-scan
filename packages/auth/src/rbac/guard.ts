import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Role-based route guards for API routes
// ---------------------------------------------------------------------------

// Minimum role required for each action category
const WRITE_ROLES = ['PLATFORM_ADMIN', 'ORG_OWNER', 'SECURITY_ADMIN', 'ANALYST'];
const ADMIN_ROLES = ['PLATFORM_ADMIN', 'ORG_OWNER'];
const MANAGE_ROLES = ['PLATFORM_ADMIN', 'ORG_OWNER', 'SECURITY_ADMIN'];

/**
 * Check if the user's role is in the allowed list.
 * Returns a 403 NextResponse if the role is not allowed, or null if authorized.
 */
export function requireRole(userRole: string, allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 },
    );
  }
  return null;
}

export { WRITE_ROLES, ADMIN_ROLES, MANAGE_ROLES };
