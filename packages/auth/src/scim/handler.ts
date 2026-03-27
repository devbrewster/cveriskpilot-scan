// SCIM 2.0 provisioning handler for CVERiskPilot
// Handles IdP-driven user and group provisioning via SCIM protocol

import type { PrismaClient } from '@cveriskpilot/domain';
import { UserRole, UserStatus } from '@cveriskpilot/domain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScimUser {
  schemas: string[];
  id?: string;
  externalId?: string;
  userName: string;
  name?: {
    givenName?: string;
    familyName?: string;
    formatted?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  displayName?: string;
  active?: boolean;
  groups?: Array<{ value: string; display?: string }>;
}

export interface ScimGroup {
  schemas: string[];
  id?: string;
  externalId?: string;
  displayName: string;
  members?: Array<{ value: string; display?: string }>;
}

export interface ScimListResponse {
  schemas: string[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: (ScimUser | ScimGroup)[];
}

export interface ScimPatchOp {
  schemas: string[];
  Operations: Array<{
    op: 'add' | 'replace' | 'remove';
    path?: string;
    value?: unknown;
  }>;
}

export interface ScimResponse {
  status: number;
  body: unknown;
}

// ---------------------------------------------------------------------------
// SCIM Schema Constants
// ---------------------------------------------------------------------------

const SCIM_SCHEMAS = {
  user: 'urn:ietf:params:scim:schemas:core:2.0:User',
  group: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  list: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
  patchOp: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
  error: 'urn:ietf:params:scim:api:messages:2.0:Error',
};

// ---------------------------------------------------------------------------
// Error Helper
// ---------------------------------------------------------------------------

function scimError(status: number, detail: string): ScimResponse {
  return {
    status,
    body: {
      schemas: [SCIM_SCHEMAS.error],
      status: String(status),
      detail,
    },
  };
}

// ---------------------------------------------------------------------------
// User Handlers
// ---------------------------------------------------------------------------

function userToScim(user: any): ScimUser {
  return {
    schemas: [SCIM_SCHEMAS.user],
    id: user.id,
    externalId: user.googleId ?? user.githubId ?? undefined,
    userName: user.email,
    name: {
      formatted: user.name,
      givenName: user.name?.split(' ')[0],
      familyName: user.name?.split(' ').slice(1).join(' ') || undefined,
    },
    emails: [
      {
        value: user.email,
        type: 'work',
        primary: true,
      },
    ],
    displayName: user.name,
    active: user.status === UserStatus.ACTIVE,
  };
}

async function listUsers(
  prisma: PrismaClient,
  orgId: string,
  query: URLSearchParams,
): Promise<ScimResponse> {
  const startIndex = parseInt(query.get('startIndex') ?? '1', 10);
  const count = Math.min(parseInt(query.get('count') ?? '100', 10), 200);
  const filter = query.get('filter');

  const where: Record<string, unknown> = {
    organizationId: orgId,
    deletedAt: null,
  };

  // Parse simple SCIM filter: userName eq "value"
  if (filter) {
    const match = filter.match(/userName\s+eq\s+"([^"]+)"/i);
    if (match) {
      where.email = match[1];
    }
  }

  const [users, total] = await Promise.all([
    (prisma as any).user.findMany({
      where,
      skip: startIndex - 1,
      take: count,
      orderBy: { createdAt: 'asc' },
    }),
    (prisma as any).user.count({ where }),
  ]);

  return {
    status: 200,
    body: {
      schemas: [SCIM_SCHEMAS.list],
      totalResults: total,
      startIndex,
      itemsPerPage: count,
      Resources: users.map(userToScim),
    } satisfies ScimListResponse,
  };
}

async function getUser(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
): Promise<ScimResponse> {
  const user = await (prisma as any).user.findFirst({
    where: { id: userId, organizationId: orgId, deletedAt: null },
  });

  if (!user) {
    return scimError(404, 'User not found');
  }

  return { status: 200, body: userToScim(user) };
}

async function createUser(
  prisma: PrismaClient,
  orgId: string,
  scimUser: ScimUser,
): Promise<ScimResponse> {
  const email = scimUser.emails?.[0]?.value ?? scimUser.userName;
  if (!email) {
    return scimError(400, 'Email or userName is required');
  }

  // Check for existing user
  const existing = await (prisma as any).user.findFirst({
    where: { email, organizationId: orgId, deletedAt: null },
  });

  if (existing) {
    // Re-activate if deactivated
    if (existing.status === UserStatus.DEACTIVATED) {
      const updated = await (prisma as any).user.update({
        where: { id: existing.id },
        data: {
          status: UserStatus.ACTIVE,
          name: scimUser.name?.formatted ?? scimUser.displayName ?? existing.name,
        },
      });
      return { status: 200, body: userToScim(updated) };
    }
    return { status: 200, body: userToScim(existing) };
  }

  const name = scimUser.name?.formatted
    ?? scimUser.displayName
    ?? `${scimUser.name?.givenName ?? ''} ${scimUser.name?.familyName ?? ''}`.trim()
    ?? email.split('@')[0];

  const user = await (prisma as any).user.create({
    data: {
      organizationId: orgId,
      email,
      name,
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
    },
  });

  return { status: 201, body: userToScim(user) };
}

async function updateUser(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
  scimUser: ScimUser,
): Promise<ScimResponse> {
  const user = await (prisma as any).user.findFirst({
    where: { id: userId, organizationId: orgId, deletedAt: null },
  });

  if (!user) {
    return scimError(404, 'User not found');
  }

  const data: Record<string, unknown> = {};

  if (scimUser.name?.formatted || scimUser.displayName) {
    data.name = scimUser.name?.formatted ?? scimUser.displayName;
  }

  if (scimUser.active !== undefined) {
    data.status = scimUser.active ? UserStatus.ACTIVE : UserStatus.DEACTIVATED;
  }

  if (scimUser.emails?.[0]?.value) {
    data.email = scimUser.emails[0].value;
  }

  const updated = await (prisma as any).user.update({
    where: { id: userId },
    data,
  });

  return { status: 200, body: userToScim(updated) };
}

async function patchUser(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
  patchOp: ScimPatchOp,
): Promise<ScimResponse> {
  const user = await (prisma as any).user.findFirst({
    where: { id: userId, organizationId: orgId, deletedAt: null },
  });

  if (!user) {
    return scimError(404, 'User not found');
  }

  const data: Record<string, unknown> = {};

  for (const op of patchOp.Operations) {
    if (op.path === 'active' || op.path === 'urn:ietf:params:scim:schemas:core:2.0:User:active') {
      const active = op.op === 'remove' ? false : Boolean(op.value);
      data.status = active ? UserStatus.ACTIVE : UserStatus.DEACTIVATED;
    }

    if (op.path === 'displayName' || op.path === 'name.formatted') {
      if (op.op !== 'remove' && op.value) {
        data.name = String(op.value);
      }
    }

    // Handle replace on root with object value (Okta-style)
    if (!op.path && op.op === 'replace' && typeof op.value === 'object' && op.value !== null) {
      const val = op.value as Record<string, unknown>;
      if ('active' in val) {
        data.status = val.active ? UserStatus.ACTIVE : UserStatus.DEACTIVATED;
      }
      if ('displayName' in val) {
        data.name = String(val.displayName);
      }
    }
  }

  if (Object.keys(data).length > 0) {
    await (prisma as any).user.update({
      where: { id: userId },
      data,
    });
  }

  const updated = await (prisma as any).user.findUnique({ where: { id: userId } });
  return { status: 200, body: userToScim(updated) };
}

async function deleteUser(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
): Promise<ScimResponse> {
  const user = await (prisma as any).user.findFirst({
    where: { id: userId, organizationId: orgId, deletedAt: null },
  });

  if (!user) {
    return scimError(404, 'User not found');
  }

  // Soft-delete: deactivate the user rather than hard-deleting
  await (prisma as any).user.update({
    where: { id: userId },
    data: {
      status: UserStatus.DEACTIVATED,
      deletedAt: new Date(),
    },
  });

  return { status: 204, body: null };
}

// ---------------------------------------------------------------------------
// Group Handlers (stub — maps to Teams)
// ---------------------------------------------------------------------------

async function listGroups(
  prisma: PrismaClient,
  orgId: string,
  query: URLSearchParams,
): Promise<ScimResponse> {
  const startIndex = parseInt(query.get('startIndex') ?? '1', 10);
  const count = Math.min(parseInt(query.get('count') ?? '100', 10), 200);

  const [teams, total] = await Promise.all([
    (prisma as any).team.findMany({
      where: { organizationId: orgId },
      skip: startIndex - 1,
      take: count,
      include: { memberships: { include: { user: true } } },
    }),
    (prisma as any).team.count({ where: { organizationId: orgId } }),
  ]);

  const resources: ScimGroup[] = teams.map((team: any) => ({
    schemas: [SCIM_SCHEMAS.group],
    id: team.id,
    displayName: team.name,
    members: team.memberships?.map((m: any) => ({
      value: m.user.id,
      display: m.user.name,
    })) ?? [],
  }));

  return {
    status: 200,
    body: {
      schemas: [SCIM_SCHEMAS.list],
      totalResults: total,
      startIndex,
      itemsPerPage: count,
      Resources: resources,
    },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Route a SCIM 2.0 request to the appropriate handler.
 *
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param path - The SCIM resource path (e.g., "/Users", "/Users/123", "/Groups")
 * @param body - Parsed request body (for POST/PUT/PATCH)
 * @param orgId - The organization ID for tenant isolation
 * @param query - URL search params for pagination/filtering
 */
export async function handleScimRequest(
  prisma: PrismaClient,
  method: string,
  path: string,
  body: unknown,
  orgId: string,
  query?: URLSearchParams,
): Promise<ScimResponse> {
  const searchParams = query ?? new URLSearchParams();

  // Normalize path: remove leading/trailing slashes
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const segments = normalizedPath.split('/');

  const resource = segments[0]?.toLowerCase();
  const resourceId = segments[1];

  try {
    // Users
    if (resource === 'users') {
      if (!resourceId) {
        if (method === 'GET') return listUsers(prisma, orgId, searchParams);
        if (method === 'POST') return createUser(prisma, orgId, body as ScimUser);
        return scimError(405, `Method ${method} not allowed on /Users`);
      }

      if (method === 'GET') return getUser(prisma, orgId, resourceId);
      if (method === 'PUT') return updateUser(prisma, orgId, resourceId, body as ScimUser);
      if (method === 'PATCH') return patchUser(prisma, orgId, resourceId, body as ScimPatchOp);
      if (method === 'DELETE') return deleteUser(prisma, orgId, resourceId);
      return scimError(405, `Method ${method} not allowed on /Users/:id`);
    }

    // Groups
    if (resource === 'groups') {
      if (method === 'GET') return listGroups(prisma, orgId, searchParams);
      return scimError(405, `Method ${method} not supported for Groups yet`);
    }

    return scimError(404, `Unknown SCIM resource: ${resource}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal SCIM error';
    return scimError(500, message);
  }
}
