'use client';

import { useState, useMemo } from 'react';
import { demoUsers } from '@/lib/demo-data';

const ROLES = [
  'PLATFORM_ADMIN',
  'PLATFORM_SUPPORT',
  'ORG_OWNER',
  'SECURITY_ADMIN',
  'ANALYST',
  'DEVELOPER',
  'VIEWER',
  'SERVICE_ACCOUNT',
  'CLIENT_ADMIN',
  'CLIENT_VIEWER',
] as const;

const ROLE_COLORS: Record<string, { badge: string; avatar: string }> = {
  PLATFORM_ADMIN: { badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', avatar: 'bg-red-500' },
  PLATFORM_SUPPORT: { badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', avatar: 'bg-pink-500' },
  ORG_OWNER: { badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', avatar: 'bg-purple-500' },
  SECURITY_ADMIN: { badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', avatar: 'bg-indigo-500' },
  ANALYST: { badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', avatar: 'bg-blue-500' },
  DEVELOPER: { badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', avatar: 'bg-cyan-500' },
  VIEWER: { badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', avatar: 'bg-gray-500' },
  SERVICE_ACCOUNT: { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', avatar: 'bg-yellow-500' },
  CLIENT_ADMIN: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', avatar: 'bg-emerald-500' },
  CLIENT_VIEWER: { badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', avatar: 'bg-teal-500' },
};

function formatRole(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function DemoUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return demoUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Active' && u.isActive) ||
        (statusFilter === 'Inactive' && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
        Viewing demo user management. Data shown is simulated.
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <div className="group relative">
          <button
            disabled
            className="rounded-md bg-zinc-300 px-4 py-2 text-sm font-medium text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400"
          >
            Invite User
          </button>
          <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
            Available in full product
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 w-64"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="ALL">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {formatRole(r)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="ALL">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                MFA
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Last Login
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {filtered.map((user) => {
              const colors = ROLE_COLORS[user.role] ?? ROLE_COLORS.VIEWER;
              return (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  {/* User */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${colors.avatar}`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {user.name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}
                    >
                      {formatRole(user.role)}
                    </span>
                  </td>
                  {/* MFA */}
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {user.mfaEnabled ? (
                      <svg
                        className="inline h-5 w-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg
                        className="inline h-5 w-5 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </td>
                  {/* Status */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-1.5 text-sm">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          user.isActive ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {/* Last Login */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'Never'}
                  </td>
                  {/* Joined */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
