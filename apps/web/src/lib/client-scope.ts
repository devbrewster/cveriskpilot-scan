import { prisma } from '@/lib/prisma';

/**
 * Client-scoping helper for MSSP tenant isolation.
 *
 * Resolves which client IDs a user can access based on:
 * 1. Their role (org-level roles see all clients)
 * 2. Their team memberships → client assignments
 * 3. The active client in their session (further narrows scope)
 *
 * Returns a Prisma `clientId` filter clause to add to queries.
 */

/** Roles that have org-wide access (not scoped to specific clients) */
const ORG_WIDE_ROLES = [
  'PLATFORM_ADMIN',
  'PLATFORM_SUPPORT',
  'ORG_OWNER',
  'SECURITY_ADMIN',
  'ANALYST',
  'DEVELOPER',
  'VIEWER',
  'SERVICE_ACCOUNT',
];

export interface ClientScopeResult {
  /** If null, no client filtering needed (org-wide access). Otherwise, filter by these IDs. */
  clientIds: string[] | null;
  /** Prisma where clause fragment to add to queries with a clientId field */
  where: { clientId?: string | { in: string[] } };
}

/**
 * Resolve the client scope for a user's session.
 *
 * @param session - The user's session (from getServerSession)
 * @returns ClientScopeResult with either null clientIds (no filtering) or specific IDs
 */
export async function resolveClientScope(session: {
  userId: string;
  organizationId: string;
  role: string;
  clientId?: string;
}): Promise<ClientScopeResult> {
  // Org-wide roles can see everything
  if (ORG_WIDE_ROLES.includes(session.role)) {
    // If a specific client is selected in the session, scope to that
    if (session.clientId) {
      return {
        clientIds: [session.clientId],
        where: { clientId: session.clientId },
      };
    }
    return { clientIds: null, where: {} };
  }

  // Client-scoped roles: resolve accessible clients from team assignments
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: session.userId },
    select: {
      team: {
        select: {
          clientAssignments: {
            select: { clientId: true },
          },
        },
      },
    },
  });

  const accessibleClientIds = new Set<string>();
  for (const m of memberships) {
    for (const ca of m.team.clientAssignments) {
      accessibleClientIds.add(ca.clientId);
    }
  }

  const clientIds = Array.from(accessibleClientIds);

  // If no client assignments found, user sees nothing
  if (clientIds.length === 0) {
    return {
      clientIds: [],
      where: { clientId: '__no_access__' }, // Will match nothing
    };
  }

  // If a specific client is selected in the session, verify it's in the accessible set
  if (session.clientId) {
    if (accessibleClientIds.has(session.clientId)) {
      return {
        clientIds: [session.clientId],
        where: { clientId: session.clientId },
      };
    }
    // Selected client not in accessible set — fall back to all accessible
  }

  return {
    clientIds,
    where: clientIds.length === 1
      ? { clientId: clientIds[0] }
      : { clientId: { in: clientIds } },
  };
}
