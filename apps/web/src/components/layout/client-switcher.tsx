'use client';

import { useState, useEffect, useRef } from 'react';
import { useClientContext } from '@/lib/client-context';
import { useAuth, type UserRole } from '@/lib/auth-context';

const SWITCHER_ROLES: UserRole[] = [
  'PLATFORM_ADMIN',
  'PLATFORM_SUPPORT',
  'ORG_OWNER',
  'SECURITY_ADMIN',
  'ANALYST',
];

interface ClientOption {
  id: string;
  name: string;
}

export function ClientSwitcher() {
  const { role, loaded } = useAuth();
  const { activeClientId, activeClientName, setActiveClient } = useClientContext();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch clients on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/clients?organizationId=demo-org')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.clients) {
          setClients(
            data.clients.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const displayName = activeClientId ? activeClientName || 'Client' : 'All Clients';

  // Show skeleton while auth is loading
  if (!loaded) {
    return <div className="h-[38px] w-full animate-pulse rounded-md bg-gray-700" />;
  }

  // Hide switcher for roles that are locked to a single client
  if (!role || !SWITCHER_ROLES.includes(role)) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-gray-750 hover:border-gray-600"
      >
        {/* Building icon */}
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
        <span className="flex-1 truncate">{displayName}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-gray-700 bg-gray-800 shadow-lg">
          {/* Search */}
          <div className="border-b border-gray-700 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {/* All Clients option */}
            <button
              onClick={() => {
                setActiveClient(null, null);
                setOpen(false);
                setSearch('');
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700 ${
                !activeClientId ? 'bg-gray-700 text-white' : 'text-gray-300'
              }`}
            >
              <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
              </svg>
              All Clients
              {!activeClientId && (
                <svg className="ml-auto h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <div className="mx-2 my-1 border-t border-gray-700" />

            {loading && (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">No clients found</div>
            )}

            {filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  setActiveClient(client.id, client.name);
                  setOpen(false);
                  setSearch('');
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-700 ${
                  activeClientId === client.id ? 'bg-gray-700 text-white' : 'text-gray-300'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-600 text-xs font-medium text-gray-200">
                  {client.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{client.name}</span>
                {activeClientId === client.id && (
                  <svg className="ml-auto h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
