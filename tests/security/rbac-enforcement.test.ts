/**
 * RBAC enforcement tests — verify that the permission matrix correctly
 * blocks unauthorized access and allows authorized access.
 *
 * Tests the requirePerm() guard and the underlying hasPermission() logic
 * against the full role-permission matrix.
 */

import { describe, it, expect } from 'vitest';
import { requirePerm, requireRole, WRITE_ROLES, ADMIN_ROLES, MANAGE_ROLES, APPROVER_ROLES } from '@cveriskpilot/auth';
import { hasPermission, getPermissionsForRole } from '@cveriskpilot/auth';
import type { Permission } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// Helper: check if requirePerm blocks (returns NextResponse) or allows (null)
// ---------------------------------------------------------------------------

function isBlocked(role: string, permission: Permission): boolean {
  return requirePerm(role, permission) !== null;
}

function isAllowed(role: string, permission: Permission): boolean {
  return requirePerm(role, permission) === null;
}

// ---------------------------------------------------------------------------
// Test: VIEWER cannot access mutations
// ---------------------------------------------------------------------------

describe('RBAC: VIEWER role restrictions', () => {
  const mutationPermissions: Permission[] = [
    'cases:create',
    'cases:update',
    'cases:delete',
    'cases:triage',
    'cases:assign',
    'scans:upload',
    'ai:advisory',
    'ai:chat',
    'org:update',
    'org:manage_users',
    'org:manage_teams',
    'org:manage_billing',
    'org:manage_api_keys',
    'exceptions:create',
    'exceptions:approve',
    'platform:admin',
  ];

  for (const perm of mutationPermissions) {
    it(`VIEWER blocked from '${perm}'`, () => {
      expect(isBlocked('VIEWER', perm)).toBe(true);
    });
  }

  it('VIEWER allowed to read cases', () => {
    expect(isAllowed('VIEWER', 'cases:read')).toBe(true);
  });

  it('VIEWER allowed to read assets', () => {
    expect(isAllowed('VIEWER', 'assets:read')).toBe(true);
  });

  it('VIEWER allowed to read scans', () => {
    expect(isAllowed('VIEWER', 'scans:read')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: DEVELOPER limited permissions
// ---------------------------------------------------------------------------

describe('RBAC: DEVELOPER role restrictions', () => {
  it('DEVELOPER cannot manage users', () => {
    expect(isBlocked('DEVELOPER', 'org:manage_users')).toBe(true);
  });

  it('DEVELOPER cannot manage billing', () => {
    expect(isBlocked('DEVELOPER', 'org:manage_billing')).toBe(true);
  });

  it('DEVELOPER cannot manage API keys', () => {
    expect(isBlocked('DEVELOPER', 'org:manage_api_keys')).toBe(true);
  });

  it('DEVELOPER cannot triage cases', () => {
    expect(isBlocked('DEVELOPER', 'cases:triage')).toBe(true);
  });

  it('DEVELOPER cannot create exceptions', () => {
    expect(isBlocked('DEVELOPER', 'exceptions:create')).toBe(true);
  });

  it('DEVELOPER can read cases', () => {
    expect(isAllowed('DEVELOPER', 'cases:read')).toBe(true);
  });

  it('DEVELOPER can comment on cases', () => {
    expect(isAllowed('DEVELOPER', 'cases:comment')).toBe(true);
  });

  it('DEVELOPER can use AI chat', () => {
    expect(isAllowed('DEVELOPER', 'ai:chat')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: ANALYST gets appropriate mutations but not admin
// ---------------------------------------------------------------------------

describe('RBAC: ANALYST role permissions', () => {
  it('ANALYST can update cases', () => {
    expect(isAllowed('ANALYST', 'cases:update')).toBe(true);
  });

  it('ANALYST can triage cases', () => {
    expect(isAllowed('ANALYST', 'cases:triage')).toBe(true);
  });

  it('ANALYST can upload scans', () => {
    expect(isAllowed('ANALYST', 'scans:upload')).toBe(true);
  });

  it('ANALYST can use AI advisory', () => {
    expect(isAllowed('ANALYST', 'ai:advisory')).toBe(true);
  });

  it('ANALYST can create exceptions', () => {
    expect(isAllowed('ANALYST', 'exceptions:create')).toBe(true);
  });

  it('ANALYST cannot approve exceptions', () => {
    expect(isBlocked('ANALYST', 'exceptions:approve')).toBe(true);
  });

  it('ANALYST cannot manage users', () => {
    expect(isBlocked('ANALYST', 'org:manage_users')).toBe(true);
  });

  it('ANALYST cannot manage billing', () => {
    expect(isBlocked('ANALYST', 'org:manage_billing')).toBe(true);
  });

  it('ANALYST cannot manage API keys', () => {
    expect(isBlocked('ANALYST', 'org:manage_api_keys')).toBe(true);
  });

  it('ANALYST is not a platform admin', () => {
    expect(isBlocked('ANALYST', 'platform:admin')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: SECURITY_ADMIN can manage security but not billing
// ---------------------------------------------------------------------------

describe('RBAC: SECURITY_ADMIN role permissions', () => {
  it('SECURITY_ADMIN can approve exceptions', () => {
    expect(isAllowed('SECURITY_ADMIN', 'exceptions:approve')).toBe(true);
  });

  it('SECURITY_ADMIN can manage users', () => {
    expect(isAllowed('SECURITY_ADMIN', 'org:manage_users')).toBe(true);
  });

  it('SECURITY_ADMIN can manage teams', () => {
    expect(isAllowed('SECURITY_ADMIN', 'org:manage_teams')).toBe(true);
  });

  it('SECURITY_ADMIN cannot update org settings (no org:update perm)', () => {
    expect(isBlocked('SECURITY_ADMIN', 'org:update')).toBe(true);
  });

  it('SECURITY_ADMIN cannot manage billing', () => {
    expect(isBlocked('SECURITY_ADMIN', 'org:manage_billing')).toBe(true);
  });

  it('SECURITY_ADMIN is not a platform admin', () => {
    expect(isBlocked('SECURITY_ADMIN', 'platform:admin')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: ORG_OWNER has everything except platform:admin
// ---------------------------------------------------------------------------

describe('RBAC: ORG_OWNER role permissions', () => {
  it('ORG_OWNER can manage billing', () => {
    expect(isAllowed('ORG_OWNER', 'org:manage_billing')).toBe(true);
  });

  it('ORG_OWNER can manage API keys', () => {
    expect(isAllowed('ORG_OWNER', 'org:manage_api_keys')).toBe(true);
  });

  it('ORG_OWNER can approve exceptions', () => {
    expect(isAllowed('ORG_OWNER', 'exceptions:approve')).toBe(true);
  });

  it('ORG_OWNER is NOT a platform admin', () => {
    expect(isBlocked('ORG_OWNER', 'platform:admin')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: PLATFORM_ADMIN has everything
// ---------------------------------------------------------------------------

describe('RBAC: PLATFORM_ADMIN role permissions', () => {
  it('PLATFORM_ADMIN has platform:admin', () => {
    expect(isAllowed('PLATFORM_ADMIN', 'platform:admin')).toBe(true);
  });

  it('PLATFORM_ADMIN can manage billing', () => {
    expect(isAllowed('PLATFORM_ADMIN', 'org:manage_billing')).toBe(true);
  });

  it('PLATFORM_ADMIN can do everything', () => {
    const allPerms = getPermissionsForRole('PLATFORM_ADMIN' as any);
    // PLATFORM_ADMIN should have the most permissions of any role
    const analystPerms = getPermissionsForRole('ANALYST' as any);
    expect(allPerms.length).toBeGreaterThan(analystPerms.length);
  });
});

// ---------------------------------------------------------------------------
// Test: CLIENT_VIEWER / CLIENT_ADMIN scoped permissions
// ---------------------------------------------------------------------------

describe('RBAC: Client-scoped roles', () => {
  it('CLIENT_VIEWER can only read', () => {
    expect(isAllowed('CLIENT_VIEWER', 'cases:read')).toBe(true);
    expect(isAllowed('CLIENT_VIEWER', 'assets:read')).toBe(true);
    expect(isBlocked('CLIENT_VIEWER', 'cases:update')).toBe(true);
    expect(isBlocked('CLIENT_VIEWER', 'exceptions:create')).toBe(true);
  });

  it('CLIENT_ADMIN can update cases but not delete', () => {
    expect(isAllowed('CLIENT_ADMIN', 'cases:update')).toBe(true);
    expect(isBlocked('CLIENT_ADMIN', 'cases:delete')).toBe(true);
    expect(isBlocked('CLIENT_ADMIN', 'org:manage_users')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: SERVICE_ACCOUNT has API-only permissions
// ---------------------------------------------------------------------------

describe('RBAC: SERVICE_ACCOUNT role', () => {
  it('SERVICE_ACCOUNT can upload scans', () => {
    expect(isAllowed('SERVICE_ACCOUNT', 'scans:upload')).toBe(true);
  });

  it('SERVICE_ACCOUNT can create cases', () => {
    expect(isAllowed('SERVICE_ACCOUNT', 'cases:create')).toBe(true);
  });

  it('SERVICE_ACCOUNT cannot manage org settings', () => {
    expect(isBlocked('SERVICE_ACCOUNT', 'org:update')).toBe(true);
  });

  it('SERVICE_ACCOUNT cannot use AI', () => {
    expect(isBlocked('SERVICE_ACCOUNT', 'ai:advisory')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: requirePerm returns proper 403 response shape
// ---------------------------------------------------------------------------

describe('requirePerm response format', () => {
  it('returns null for authorized access', () => {
    expect(requirePerm('PLATFORM_ADMIN', 'platform:admin')).toBeNull();
  });

  it('returns 403 NextResponse for unauthorized access', () => {
    const result = requirePerm('VIEWER', 'cases:update');
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('403 body includes permission name', async () => {
    const result = requirePerm('VIEWER', 'cases:update');
    const body = await result!.json();
    expect(body.error).toBe('Forbidden');
    expect(body.permission).toBe('cases:update');
  });
});

// ---------------------------------------------------------------------------
// Test: Permission escalation prevention
// ---------------------------------------------------------------------------

describe('Permission escalation scenarios', () => {
  it('no non-admin role has platform:admin', () => {
    const nonAdminRoles = [
      'VIEWER', 'DEVELOPER', 'ANALYST', 'SECURITY_ADMIN',
      'ORG_OWNER', 'CLIENT_ADMIN', 'CLIENT_VIEWER', 'SERVICE_ACCOUNT',
      'PLATFORM_SUPPORT',
    ];

    for (const role of nonAdminRoles) {
      expect(isBlocked(role, 'platform:admin')).toBe(true);
    }
  });

  it('only ORG_OWNER and PLATFORM_ADMIN can manage billing', () => {
    const rolesWithBilling = [
      'VIEWER', 'DEVELOPER', 'ANALYST', 'SECURITY_ADMIN',
      'CLIENT_ADMIN', 'CLIENT_VIEWER', 'SERVICE_ACCOUNT', 'PLATFORM_SUPPORT',
    ];

    for (const role of rolesWithBilling) {
      expect(isBlocked(role, 'org:manage_billing')).toBe(true);
    }

    expect(isAllowed('ORG_OWNER', 'org:manage_billing')).toBe(true);
    expect(isAllowed('PLATFORM_ADMIN', 'org:manage_billing')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Old WRITE_ROLES vs new permissions alignment
// ---------------------------------------------------------------------------

describe('WRITE_ROLES backward compatibility', () => {
  it('all WRITE_ROLES members have cases:update', () => {
    for (const role of WRITE_ROLES) {
      expect(hasPermission(role as any, 'cases:update')).toBe(true);
    }
  });

  it('VIEWER is NOT in WRITE_ROLES', () => {
    expect(WRITE_ROLES.includes('VIEWER')).toBe(false);
  });

  it('DEVELOPER is NOT in WRITE_ROLES', () => {
    expect(WRITE_ROLES.includes('DEVELOPER')).toBe(false);
  });
});
