// RBAC permission definitions for CVERiskPilot
// Defines permissions, role mappings, and authorization helpers

import { UserRole } from '@cveriskpilot/domain';

/**
 * All permissions in the system, organized by domain.
 */
export const PERMISSIONS = {
  // Vulnerability cases
  'cases:read': 'View vulnerability cases',
  'cases:create': 'Create vulnerability cases',
  'cases:update': 'Update vulnerability cases',
  'cases:delete': 'Delete vulnerability cases',
  'cases:triage': 'Triage vulnerability cases',
  'cases:assign': 'Assign vulnerability cases',
  'cases:comment': 'Comment on vulnerability cases',
  'cases:export': 'Export vulnerability case data',

  // Assets
  'assets:read': 'View assets',
  'assets:create': 'Create assets',
  'assets:update': 'Update assets',
  'assets:delete': 'Delete assets',

  // Scans / uploads
  'scans:read': 'View scan results',
  'scans:upload': 'Upload scan files',

  // AI features
  'ai:advisory': 'Request AI advisory analysis',
  'ai:chat': 'Use AI chat features',

  // Organization management
  'org:read': 'View organization settings',
  'org:update': 'Update organization settings',
  'org:manage_users': 'Manage organization users',
  'org:manage_teams': 'Manage teams',
  'org:manage_billing': 'Manage billing and subscriptions',
  'org:manage_api_keys': 'Manage API keys',

  // Risk exceptions
  'exceptions:create': 'Create risk exceptions',
  'exceptions:approve': 'Approve risk exceptions',

  // Audit
  'audit:read': 'View audit logs',

  // Platform admin
  'platform:admin': 'Platform administration',
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Role-to-permission mapping.
 * MVP simplified: Owner gets all, Analyst gets triage/assign/comment/ai, Viewer gets read-only.
 */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.PLATFORM_ADMIN]: Object.keys(PERMISSIONS) as Permission[],

  [UserRole.PLATFORM_SUPPORT]: [
    'cases:read', 'cases:comment',
    'assets:read',
    'scans:read',
    'org:read',
    'audit:read',
  ],

  [UserRole.ORG_OWNER]: (Object.keys(PERMISSIONS) as Permission[]).filter(
    (p) => p !== 'platform:admin',
  ),

  [UserRole.SECURITY_ADMIN]: [
    'cases:read', 'cases:create', 'cases:update', 'cases:delete',
    'cases:triage', 'cases:assign', 'cases:comment', 'cases:export',
    'assets:read', 'assets:create', 'assets:update', 'assets:delete',
    'scans:read', 'scans:upload',
    'ai:advisory', 'ai:chat',
    'org:read', 'org:manage_users', 'org:manage_teams', 'org:manage_api_keys',
    'exceptions:create', 'exceptions:approve',
    'audit:read',
  ],

  [UserRole.ANALYST]: [
    'cases:read', 'cases:update', 'cases:triage', 'cases:assign',
    'cases:comment', 'cases:export',
    'assets:read',
    'scans:read', 'scans:upload',
    'ai:advisory', 'ai:chat',
    'exceptions:create',
  ],

  [UserRole.DEVELOPER]: [
    'cases:read', 'cases:comment',
    'assets:read',
    'scans:read',
    'ai:chat',
  ],

  [UserRole.VIEWER]: [
    'cases:read',
    'assets:read',
    'scans:read',
  ],

  [UserRole.SERVICE_ACCOUNT]: [
    'cases:read', 'cases:create', 'cases:update',
    'assets:read', 'assets:create', 'assets:update',
    'scans:read', 'scans:upload',
  ],

  [UserRole.CLIENT_ADMIN]: [
    'cases:read', 'cases:update', 'cases:triage', 'cases:assign',
    'cases:comment', 'cases:export',
    'assets:read',
    'scans:read',
    'ai:advisory', 'ai:chat',
    'org:read',
  ],

  [UserRole.CLIENT_VIEWER]: [
    'cases:read',
    'assets:read',
    'scans:read',
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Require a role to have a specific permission.
 * Throws an error if the role does not have the permission.
 */
export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(
      `Role '${role}' does not have permission '${permission}'`,
      role,
      permission,
    );
  }
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Custom error for authorization failures.
 */
export class AuthorizationError extends Error {
  public readonly role: UserRole;
  public readonly permission: Permission;

  constructor(message: string, role: UserRole, permission: Permission) {
    super(message);
    this.name = 'AuthorizationError';
    this.role = role;
    this.permission = permission;
  }
}
