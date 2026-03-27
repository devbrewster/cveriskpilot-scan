// RBAC middleware for Next.js API routes
// Wraps handlers to enforce role-based access control

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { UserRole } from '@cveriskpilot/domain';
import { getServerSession, type AuthenticatedHandler } from '../session/middleware.js';
import type { Session } from '../session/redis-store.js';
import { hasPermission, type Permission } from './permissions.js';

/**
 * Middleware wrapper that requires the authenticated user to have one of the specified roles.
 * Checks session first (returns 401 if unauthenticated), then checks role (returns 403 if denied).
 *
 * Usage:
 * ```ts
 * export const GET = withRole(UserRole.ORG_OWNER, UserRole.SECURITY_ADMIN)(
 *   async (request, session) => {
 *     return NextResponse.json({ ok: true });
 *   }
 * );
 * ```
 */
export function withRole(...allowedRoles: UserRole[]) {
  return (handler: AuthenticatedHandler) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const session = await getServerSession(request);

      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Valid session required' },
          { status: 401 },
        );
      }

      if (!allowedRoles.includes(session.role as UserRole)) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You do not have the required role to access this resource',
          },
          { status: 403 },
        );
      }

      return handler(request, session);
    };
  };
}

/**
 * Middleware wrapper that requires the authenticated user to have a specific permission.
 * Uses the RBAC permission system rather than checking roles directly.
 *
 * Usage:
 * ```ts
 * export const POST = withPermission('cases:triage')(
 *   async (request, session) => {
 *     return NextResponse.json({ ok: true });
 *   }
 * );
 * ```
 */
export function withPermission(permission: Permission) {
  return (handler: AuthenticatedHandler) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const session = await getServerSession(request);

      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Valid session required' },
          { status: 401 },
        );
      }

      if (!hasPermission(session.role as UserRole, permission)) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: `Permission '${permission}' is required to access this resource`,
          },
          { status: 403 },
        );
      }

      return handler(request, session);
    };
  };
}
