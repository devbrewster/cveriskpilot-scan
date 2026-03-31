import { NextResponse } from 'next/server';
import type { UserRole } from '@cveriskpilot/domain';
import { hasPermission } from './permissions';
import type { Permission } from './permissions';

// ---------------------------------------------------------------------------
// Role-based route guards for API routes
// ---------------------------------------------------------------------------

// Minimum role required for each action category
const WRITE_ROLES = ['PLATFORM_ADMIN', 'ORG_OWNER', 'SECURITY_ADMIN', 'ANALYST'];
const ADMIN_ROLES = ['PLATFORM_ADMIN', 'ORG_OWNER'];
const MANAGE_ROLES = ['PLATFORM_ADMIN', 'ORG_OWNER', 'SECURITY_ADMIN'];
const APPROVER_ROLES = ['PLATFORM_ADMIN', 'ORG_OWNER', 'SECURITY_ADMIN'];

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

/**
 * Check if the user's role has a specific permission.
 * Returns a 403 NextResponse if the permission is not granted, or null if authorized.
 * Drop-in replacement for requireRole() with granular permission checks.
 */
export function requirePerm(userRole: string, permission: Permission): NextResponse | null {
  if (!hasPermission(userRole as UserRole, permission)) {
    return NextResponse.json(
      { error: 'Forbidden', permission },
      { status: 403 },
    );
  }
  return null;
}

export { WRITE_ROLES, ADMIN_ROLES, MANAGE_ROLES, APPROVER_ROLES };
export type { Permission };
