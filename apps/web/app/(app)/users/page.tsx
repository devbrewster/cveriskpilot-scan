'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoleGuard } from '@/components/auth/role-guard';

// ── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

type UserRole =
  | 'PLATFORM_ADMIN'
  | 'PLATFORM_SUPPORT'
  | 'ORG_OWNER'
  | 'SECURITY_ADMIN'
  | 'ANALYST'
  | 'DEVELOPER'
  | 'VIEWER'
  | 'SERVICE_ACCOUNT'
  | 'CLIENT_ADMIN'
  | 'CLIENT_VIEWER';

// ── Role display config ──────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'PLATFORM_ADMIN', label: 'Platform Admin' },
  { value: 'PLATFORM_SUPPORT', label: 'Platform Support' },
  { value: 'ORG_OWNER', label: 'Org Owner' },
  { value: 'SECURITY_ADMIN', label: 'Security Admin' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'SERVICE_ACCOUNT', label: 'Service Account' },
  { value: 'CLIENT_ADMIN', label: 'Client Admin' },
  { value: 'CLIENT_VIEWER', label: 'Client Viewer' },
];

const ROLE_COLORS: Record<string, string> = {
  PLATFORM_ADMIN: 'bg-red-100 text-red-800 border-red-200',
  PLATFORM_SUPPORT: 'bg-red-50 text-red-700 border-red-200',
  ORG_OWNER: 'bg-rose-100 text-rose-800 border-rose-200',
  SECURITY_ADMIN: 'bg-orange-100 text-orange-800 border-orange-200',
  ANALYST: 'bg-blue-100 text-blue-800 border-blue-200',
  DEVELOPER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  VIEWER: 'bg-gray-100 text-gray-700 border-gray-200',
  SERVICE_ACCOUNT: 'bg-purple-100 text-purple-800 border-purple-200',
  CLIENT_ADMIN: 'bg-amber-100 text-amber-800 border-amber-200',
  CLIENT_VIEWER: 'bg-stone-100 text-stone-700 border-stone-200',
};

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso);
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function UsersPage() {
  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('ANALYST');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Edit role modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('ANALYST');

  // Deactivate dialog
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);

  // ── Fetch users ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();

      const res = await fetch(`/api/users${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Invite handler ───────────────────────────────────────────────────────

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteSuccess(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('ANALYST');
      setTimeout(() => {
        setShowInvite(false);
        setInviteSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  // ── Edit role handler ────────────────────────────────────────────────────

  const handleEditRole = async () => {
    if (!editUser) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, role: editRole } : u)),
      );
      setEditUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  // ── Deactivate handler ─────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${deactivateUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !deactivateUser.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === deactivateUser.id ? { ...u, isActive: !u.isActive } : u,
        ),
      );
      setDeactivateUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <RoleGuard permission="org:manage_users">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage users, roles, and access within your organization.
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Invite User
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <p className="text-sm text-gray-500">
            {users.length} user{users.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {search || roleFilter || statusFilter ? 'No matching users' : 'No users yet'}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              {search || roleFilter || statusFilter
                ? 'Try adjusting your search or filters to find the user you are looking for.'
                : 'Invite your first team member to start collaborating on vulnerability management.'}
            </p>
            {!(search || roleFilter || statusFilter) && (
              <button
                onClick={() => setShowInvite(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Invite User
              </button>
            )}
          </div>
        )}

        {/* Users table */}
        {!loading && users.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                    <th className="px-4 py-3 font-medium text-gray-500">MFA</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Last Login</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Joined</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-gray-50">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{user.name}</p>
                            <p className="truncate text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>

                      {/* MFA */}
                      <td className="px-4 py-3">
                        {user.mfaEnabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 text-gray-600">
                        {formatRelative(user.lastLoginAt)}
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditUser(user);
                              setEditRole(user.role as UserRole);
                            }}
                            className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            title="Edit role"
                          >
                            Edit Role
                          </button>
                          <button
                            onClick={() => setDeactivateUser(user)}
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                              user.isActive
                                ? 'border-red-200 bg-white dark:bg-gray-900 text-red-600 hover:bg-red-50'
                                : 'border-green-200 bg-white dark:bg-gray-900 text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Reactivate'}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Invite User Modal ──────────────────────────────────────────── */}
        {showInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowInvite(false)} />
            <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Invite User</h3>
              <p className="mt-1 text-sm text-gray-500">
                Send an invitation to join your organization.
              </p>

              {inviteSuccess && (
                <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
                  {inviteSuccess}
                </div>
              )}

              <form onSubmit={handleInvite} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Full name (optional)"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    The user will be assigned this role upon accepting the invite.
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvite(false);
                      setInviteSuccess(null);
                    }}
                    className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Role Modal ────────────────────────────────────────────── */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setEditUser(null)} />
            <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Edit User Role</h3>
              <p className="mt-1 text-sm text-gray-500">
                Change role for <span className="font-medium text-gray-900">{editUser.name}</span>{' '}
                ({editUser.email})
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Role</label>
                  <p className="mt-1 text-sm text-gray-600">
                    {ROLE_LABELS[editUser.role] || editUser.role}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditRole}
                    disabled={editRole === editUser.role}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Update Role
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Deactivate Confirmation Dialog ─────────────────────────────── */}
        {deactivateUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setDeactivateUser(null)} />
            <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
              {deactivateUser.isActive ? (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-center text-lg font-semibold text-gray-900">Deactivate User</h3>
                  <p className="mt-2 text-center text-sm text-gray-500">
                    Are you sure you want to deactivate{' '}
                    <span className="font-medium text-gray-900">{deactivateUser.name}</span>? They
                    will no longer be able to sign in or access any resources.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-center text-lg font-semibold text-gray-900">Reactivate User</h3>
                  <p className="mt-2 text-center text-sm text-gray-500">
                    Reactivate{' '}
                    <span className="font-medium text-gray-900">{deactivateUser.name}</span>? They
                    will regain access to the platform with their current role.
                  </p>
                </>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeactivateUser(null)}
                  className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivate}
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                    deactivateUser.isActive
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {deactivateUser.isActive ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
