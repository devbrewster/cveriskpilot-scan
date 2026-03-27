/**
 * Portal authentication and authorization helper for CVERiskPilot.
 * Verifies that users accessing the client portal have the appropriate role
 * and auto-scopes all queries to their assigned clientId.
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT_VIEWER' | 'CLIENT_ADMIN';
  organizationId: string;
  clientId: string;
  clientName: string;
}

export interface PortalSession {
  user: PortalUser;
  organizationId: string;
  clientId: string;
}

// Roles allowed to access the client portal
const PORTAL_ROLES = new Set(['CLIENT_VIEWER', 'CLIENT_ADMIN']);

// Routes that portal users are allowed to access
const ALLOWED_PORTAL_ROUTES = [
  '/portal',
  '/portal/findings',
  '/portal/cases',
  '/portal/reports',
];

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Get the current portal session from cookies/headers.
 * In production, this would validate a JWT or session token.
 * For now, it reads from a portal session cookie.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('crp_portal_session');

    if (!sessionCookie?.value) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8'),
    ) as PortalSession;

    // Validate the session has required fields
    if (
      !session.user?.id ||
      !session.user?.role ||
      !session.clientId ||
      !session.organizationId
    ) {
      return null;
    }

    // Validate role
    if (!PORTAL_ROLES.has(session.user.role)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Require a valid portal session. Redirects to login if not authenticated.
 * Use this in portal page components.
 */
export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();

  if (!session) {
    redirect('/login?redirect=/portal');
  }

  return session;
}

/**
 * Check if a user role is allowed to access the portal.
 */
export function isPortalRole(role: string): boolean {
  return PORTAL_ROLES.has(role);
}

/**
 * Check if a route is an allowed portal route.
 */
export function isAllowedPortalRoute(pathname: string): boolean {
  return ALLOWED_PORTAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );
}

/**
 * Build a Prisma where clause scoped to the portal user's client.
 * Always includes organizationId and clientId for tenant isolation.
 */
export function scopeToClient(session: PortalSession): {
  organizationId: string;
  clientId: string;
} {
  return {
    organizationId: session.organizationId,
    clientId: session.clientId,
  };
}

/**
 * Check if the portal user has admin privileges within the portal.
 */
export function isPortalAdmin(session: PortalSession): boolean {
  return session.user.role === 'CLIENT_ADMIN';
}

/**
 * Create a portal session cookie value.
 * In production, this would create a signed JWT.
 */
export function createPortalSessionCookie(user: PortalUser): string {
  const session: PortalSession = {
    user,
    organizationId: user.organizationId,
    clientId: user.clientId,
  };
  return Buffer.from(JSON.stringify(session)).toString('base64');
}
