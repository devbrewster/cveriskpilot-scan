'use client';

import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/notifications/notification-bell';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/portfolio': 'Portfolio',
  '/clients': 'Clients',
  '/teams': 'Teams',
  '/findings': 'Findings',
  '/cases': 'Cases',
  '/upload': 'Upload',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));
}

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || pageTitles['/' + pathname.split('/')[1]] || 'CVERiskPilot';
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {breadcrumbs.length > 1 && (
            <nav className="flex items-center gap-1 text-sm text-gray-500">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  {i > 0 && (
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span className={crumb.isLast ? 'text-gray-900 font-medium' : ''}>
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Notification bell — uses a placeholder userId; replace with auth context */}
          <NotificationBell userId="current-user" />

          {/* User menu */}
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
              AD
            </div>
            <span className="hidden font-medium sm:block">Admin</span>
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
