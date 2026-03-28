'use client';

import { useAuth } from '@/lib/auth-context';

// Standalone users (ORG_OWNER, PLATFORM_ADMIN) get full access.
// RBAC only restricts roles assigned to added team members.
const FULL_ACCESS_ROLES = new Set(['PLATFORM_ADMIN', 'ORG_OWNER']);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  PLATFORM_SUPPORT: ['org:read', 'cases:read', 'audit:read'],
  SECURITY_ADMIN: ['org:read', 'org:manage_users', 'org:manage_teams', 'org:manage_api_keys', 'scans:upload', 'cases:read', 'cases:triage', 'cases:assign', 'audit:read', 'exceptions:approve'],
  ANALYST: ['scans:upload', 'cases:read', 'cases:triage', 'cases:assign', 'exceptions:create'],
  DEVELOPER: ['cases:read'],
  VIEWER: ['cases:read'],
  SERVICE_ACCOUNT: ['scans:upload', 'cases:read'],
  CLIENT_ADMIN: ['org:read', 'cases:read'],
  CLIENT_VIEWER: ['cases:read'],
};

function hasPermission(role: string | null, permission: string): boolean {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.has(role)) return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

interface RoleGuardProps {
  /** The permission required to view this content */
  permission: string;
  /** Optional: custom fallback instead of default access denied */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ permission, fallback, children }: RoleGuardProps) {
  const { loaded, authenticated, role } = useAuth();

  // Still loading session
  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-red-600">Please sign in to access this page.</div>
      </div>
    );
  }

  // Permission check
  if (!hasPermission(role, permission)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-2 text-sm text-gray-500">
          You don't have permission to access this page. Contact your organization admin if you need access.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Required: {permission} · Your role: {role}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
