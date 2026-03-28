'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TeamClient {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  clientCount: number;
  members: TeamMember[];
  clients: TeamClient[];
}

export function TeamManagement() {
  const { organizationId } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Add member modal
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [memberUserId, setMemberUserId] = useState('');

  // Assign client modal
  const [assignClientTeamId, setAssignClientTeamId] = useState<string | null>(null);
  const [assignClientId, setAssignClientId] = useState('');
  const [availableClients, setAvailableClients] = useState<{ id: string; name: string }[]>([]);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams?organizationId=${organizationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setTeams(data.teams || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients?organizationId=${organizationId}`);
      const data = await res.json();
      if (data.clients) {
        setAvailableClients(data.clients.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // Silent fail for client list
    }
  }, [organizationId]);

  useEffect(() => {
    fetchTeams();
    fetchClients();
  }, [fetchTeams, fetchClients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: newName.trim(),
          description: newDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      fetchTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Delete team "${name}"? This will remove all memberships and client assignments.`)) return;
    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      fetchTeams();
    } catch {
      setError('Failed to delete team');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberTeamId || !memberUserId.trim()) return;
    try {
      const res = await fetch(`/api/teams/${addMemberTeamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUserId.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add member');
      }
      setMemberUserId('');
      setAddMemberTeamId(null);
      fetchTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove');
      fetchTeams();
    } catch {
      setError('Failed to remove member');
    }
  };

  const handleAssignClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignClientTeamId || !assignClientId) return;
    try {
      const res = await fetch(`/api/teams/${assignClientTeamId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: assignClientId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign');
      }
      setAssignClientId('');
      setAssignClientTeamId(null);
      fetchTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign client');
    }
  };

  const handleUnassignClient = async (teamId: string, clientId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/clients?clientId=${clientId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to unassign');
      fetchTeams();
    } catch {
      setError('Failed to unassign client');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {teams.length} team{teams.length !== 1 ? 's' : ''} in your organization
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Team
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Create New Team</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Security Operations"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAddMemberTeamId(null)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <input
                  type="text"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddMemberTeamId(null)}
                  className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!memberUserId.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Client Modal */}
      {assignClientTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAssignClientTeamId(null)} />
          <div className="relative z-10 mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Assign Client to Team</h3>
            <form onSubmit={handleAssignClient} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a client...</option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignClientTeamId(null)}
                  className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assignClientId}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && teams.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No teams yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create teams to organize your analysts and assign them to clients.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Team
          </button>
        </div>
      )}

      {/* Team Cards */}
      {!loading && teams.length > 0 && (
        <div className="space-y-4">
          {teams.map((team) => {
            const isExpanded = expandedTeam === team.id;
            return (
              <div key={team.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:bg-gray-900 shadow-sm">
                {/* Team header */}
                <div
                  className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{team.name}</h3>
                      {team.description && (
                        <p className="text-xs text-gray-500">{team.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Member avatars */}
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 3).map((m) => (
                        <span
                          key={m.id}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
                          title={m.name}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                      ))}
                      {team.memberCount > 3 && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-500">
                          +{team.memberCount - 3}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                      <span>{team.clientCount} client{team.clientCount !== 1 ? 's' : ''}</span>
                    </div>
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Members */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700">Members</h4>
                          <button
                            onClick={() => setAddMemberTeamId(team.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            + Add Member
                          </button>
                        </div>
                        {team.members.length === 0 ? (
                          <p className="text-xs text-gray-400">No members</p>
                        ) : (
                          <ul className="space-y-2">
                            {team.members.map((m) => (
                              <li key={m.id} className="flex items-center justify-between rounded-md bg-white dark:bg-gray-900 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                                    {m.name.charAt(0).toUpperCase()}
                                  </span>
                                  <div>
                                    <span className="text-sm text-gray-900">{m.name}</span>
                                    <span className="ml-2 text-xs text-gray-400">{m.email}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveMember(team.id, m.id)}
                                  className="text-gray-400 hover:text-red-500"
                                  title="Remove member"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Assigned Clients */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700">Assigned Clients</h4>
                          <button
                            onClick={() => setAssignClientTeamId(team.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            + Assign Client
                          </button>
                        </div>
                        {team.clients.length === 0 ? (
                          <p className="text-xs text-gray-400">No clients assigned</p>
                        ) : (
                          <ul className="space-y-2">
                            {team.clients.map((c) => (
                              <li key={c.id} className="flex items-center justify-between rounded-md bg-white dark:bg-gray-900 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded bg-green-100 text-xs font-medium text-green-700">
                                    {c.name.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="text-sm text-gray-900">{c.name}</span>
                                </div>
                                <button
                                  onClick={() => handleUnassignClient(team.id, c.id)}
                                  className="text-gray-400 hover:text-red-500"
                                  title="Unassign client"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Delete team */}
                    <div className="mt-4 flex justify-end border-t border-gray-200 pt-3">
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Delete Team
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
