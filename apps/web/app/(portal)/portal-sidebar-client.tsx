'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PortalSignOut } from './portal-sign-out';

const portalNavItems = [
  {
    label: 'Dashboard',
    href: '/portal',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    label: 'Findings',
    href: '/portal/findings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    label: 'Cases',
    href: '/portal/cases',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    href: '/portal/reports',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export function PortalSidebarClient({ clientName }: { clientName: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
        <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.67-3.13 9.06-7 10.2-3.87-1.14-7-5.53-7-10.2V6.3l7-3.12zm-1 5.82v2h2v-2h-2zm0 4v4h2v-4h-2z" />
        </svg>
        <span className="text-lg font-bold text-white">CVERiskPilot</span>
      </div>

      {/* Client branding */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="rounded-md bg-gray-800 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Client Portal</p>
          <p className="mt-0.5 text-sm font-semibold text-white truncate">{clientName}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {portalNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href));
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
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-800 p-4">
        <PortalSignOut />
      </div>
    </aside>
  );
}
