'use client';

import { useState } from 'react';

interface DemoTeam {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  clientCount: number;
  members: { id: string; name: string; email: string; role: string }[];
  clients: { id: string; name: string }[];
}

const DEMO_TEAMS: DemoTeam[] = [
  {
    id: 'team-001',
    name: 'Platform Security',
    description: 'Core infrastructure and platform vulnerability management',
    memberCount: 4,
    clientCount: 2,
    members: [
      { id: 'u-1', name: 'Maria Chen', email: 'maria@example.com', role: 'SECURITY_ADMIN' },
      { id: 'u-2', name: 'James Walker', email: 'james@example.com', role: 'ANALYST' },
      { id: 'u-3', name: 'Sarah Kim', email: 'sarah@example.com', role: 'ANALYST' },
      { id: 'u-4', name: 'David Park', email: 'david@example.com', role: 'DEVELOPER' },
    ],
    clients: [
      { id: 'cl-001', name: 'Acme Corporation' },
      { id: 'cl-002', name: 'Globex Industries' },
    ],
  },
  {
    id: 'team-002',
    name: 'Application Security',
    description: 'SAST/DAST findings triage and developer outreach',
    memberCount: 3,
    clientCount: 1,
    members: [
      { id: 'u-5', name: 'Alex Rivera', email: 'alex@example.com', role: 'SECURITY_ADMIN' },
      { id: 'u-6', name: 'Jordan Lee', email: 'jordan@example.com', role: 'ANALYST' },
      { id: 'u-3', name: 'Sarah Kim', email: 'sarah@example.com', role: 'ANALYST' },
    ],
    clients: [
      { id: 'cl-003', name: 'Initech LLC' },
    ],
  },
  {
    id: 'team-003',
    name: 'Compliance',
    description: 'SOC 2, SSDF, and ASVS compliance tracking and reporting',
    memberCount: 2,
    clientCount: 3,
    members: [
      { id: 'u-1', name: 'Maria Chen', email: 'maria@example.com', role: 'SECURITY_ADMIN' },
      { id: 'u-7', name: 'Pat Nguyen', email: 'pat@example.com', role: 'VIEWER' },
    ],
    clients: [
      { id: 'cl-001', name: 'Acme Corporation' },
      { id: 'cl-002', name: 'Globex Industries' },
      { id: 'cl-003', name: 'Initech LLC' },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  SECURITY_ADMIN: 'bg-purple-100 text-purple-800',
  ANALYST: 'bg-blue-100 text-blue-800',
  DEVELOPER: 'bg-green-100 text-green-800',
  VIEWER: 'bg-gray-100 text-gray-700',
};

export default function DemoTeamsPage() {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Organize users into teams and assign client scopes
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated team data. Teams control access to clients and features.
        </p>
      </div>

      {/* Team count + create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{DEMO_TEAMS.length}</span> team{DEMO_TEAMS.length !== 1 ? 's' : ''}
        </p>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Team
        </button>
      </div>

      {/* Teams */}
      <div className="space-y-4">
        {DEMO_TEAMS.map((team) => {
          const isExpanded = expandedTeam === team.id;
          return (
            <div key={team.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
                onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{team.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{team.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{team.memberCount} members</span>
                  <span className="text-xs text-gray-500">{team.clientCount} clients</span>
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
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-6 py-4">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Members */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Members</h4>
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-700'}`}>
                              {member.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assigned Clients */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Assigned Clients</h4>
                      <div className="space-y-2">
                        {team.clients.map((client) => (
                          <div key={client.id} className="flex items-center gap-3 rounded-md bg-gray-50 px-3 py-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-xs font-medium text-blue-700">
                              {client.name.charAt(0)}
                            </span>
                            <span className="text-sm text-gray-900">{client.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
