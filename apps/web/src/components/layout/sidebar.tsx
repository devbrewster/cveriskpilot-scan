'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ClientSwitcher } from '@/components/layout/client-switcher';

// ---------------------------------------------------------------------------
// Role-permission map (client-side mirror of packages/auth/src/rbac/permissions.ts)
// ---------------------------------------------------------------------------
const ROLE_PERMISSIONS: Record<string, string[]> = {
  PLATFORM_ADMIN: ['platform:admin', 'org:read', 'org:manage_teams', 'org:manage_billing', 'scans:upload', 'cases:read', 'audit:read'],
  PLATFORM_SUPPORT: ['org:read', 'cases:read', 'audit:read'],
  ORG_OWNER: ['org:read', 'org:manage_teams', 'org:manage_billing', 'scans:upload', 'cases:read', 'audit:read'],
  SECURITY_ADMIN: ['org:read', 'org:manage_teams', 'scans:upload', 'cases:read', 'audit:read'],
  ANALYST: ['scans:upload', 'cases:read'],
  DEVELOPER: ['cases:read'],
  VIEWER: ['cases:read'],
  SERVICE_ACCOUNT: ['scans:upload', 'cases:read'],
  CLIENT_ADMIN: ['org:read', 'cases:read'],
  CLIENT_VIEWER: ['cases:read'],
};

function hasPermission(role: string | null, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

// ---------------------------------------------------------------------------
// Navigation items with optional requiredPermission
// ---------------------------------------------------------------------------
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredPermission?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    requiredPermission: 'org:read',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
  },
  {
    label: 'Clients',
    href: '/clients',
    requiredPermission: 'org:manage_teams',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    label: 'Teams',
    href: '/teams',
    requiredPermission: 'org:manage_teams',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    label: 'Findings',
    href: '/findings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    label: 'Cases',
    href: '/cases',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Upload',
    href: '/upload',
    requiredPermission: 'scans:upload',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    label: 'Compliance',
    href: '/compliance',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Admin',
    href: '/admin',
    requiredPermission: 'platform:admin',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    requiredPermission: 'org:read',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Skeleton shimmer for loading state
// ---------------------------------------------------------------------------
function NavSkeleton() {
  return (
    <div className="space-y-1 px-3 py-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2.5">
          <div className="h-5 w-5 animate-pulse rounded bg-gray-700" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { loaded, role, email } = useAuth();

  // Derive display values from auth context
  const avatarInitials = email
    ? email.slice(0, 2).toUpperCase()
    : '--';
  const roleBadge = role
    ? role.replace(/_/g, ' ')
    : null;

  // Filter nav items based on the user's role
  const visibleItems = loaded
    ? navItems.filter((item) => {
        if (!item.requiredPermission) return true;
        return hasPermission(role, item.requiredPermission);
      })
    : [];

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Even if the API call fails, redirect to login
    }
    router.push('/login');
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
        <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.67-3.13 9.06-7 10.2-3.87-1.14-7-5.53-7-10.2V6.3l7-3.12zm-1 5.82v2h2v-2h-2zm0 4v4h2v-4h-2z" />
        </svg>
        <span className="text-lg font-bold text-white">CVERiskPilot</span>
      </div>

      {/* Client Switcher */}
      <div className="border-b border-gray-800 px-3 py-3">
        <ClientSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {!loaded ? (
          <NavSkeleton />
        ) : (
          <div className="space-y-1 px-3 py-4">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-l-2 border-blue-500 bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-gray-300">
            {avatarInitials}
          </div>
          <div className="flex-1 truncate">
            {roleBadge && (
              <span className="inline-block rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-300">
                {roleBadge}
              </span>
            )}
            <p className="truncate text-xs text-gray-500">{email ?? 'Loading...'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
