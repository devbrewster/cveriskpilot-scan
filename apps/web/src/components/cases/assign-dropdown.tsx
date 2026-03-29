'use client';

import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface AssignDropdownProps {
  caseId: string;
  currentAssigneeId: string | null;
  currentUserId: string;
  onAssigned?: (assignee: TeamMember | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssignDropdown({
  caseId,
  currentAssigneeId,
  currentUserId,
  onAssigned,
}: AssignDropdownProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch team members when opened
  useEffect(() => {
    if (!open || members.length > 0) return;
    setLoading(true);
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setMembers(Array.isArray(data) ? data : data.users || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, members.length]);

  const handleAssign = async (userId: string | null) => {
    setAssigning(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: userId, assignerId: currentUserId }),
      });

      if (res.ok) {
        const updated = await res.json();
        onAssigned?.(updated.assignedTo ?? null);
        setOpen(false);
      }
    } catch {
      console.error('Failed to assign case');
    } finally {
      setAssigning(false);
    }
  };

  const currentAssignee = members.find((m) => m.id === currentAssigneeId);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        {currentAssignee ? (
          <>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
              {currentAssignee.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <span>{currentAssignee.name}</span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
              />
            </svg>
            <span className="text-gray-400">Unassigned</span>
          </>
        )}
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded-md border border-gray-200 bg-white dark:bg-gray-900 shadow-lg">
          {/* Search */}
          <div className="border-b border-gray-100 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-auto py-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              </div>
            ) : (
              <>
                {/* Unassign option */}
                {currentAssigneeId && (
                  <button
                    type="button"
                    onClick={() => handleAssign(null)}
                    disabled={assigning}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                      />
                    </svg>
                    Unassign
                  </button>
                )}

                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-gray-500">
                    No team members found
                  </p>
                ) : (
                  filtered.map((member) => {
                    const isActive = member.id === currentAssigneeId;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleAssign(member.id)}
                        disabled={assigning || isActive}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                          isActive ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                          {member.name
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{member.name}</p>
                          <p className="truncate text-xs text-gray-500">{member.email}</p>
                        </div>
                        {isActive && (
                          <svg
                            className="h-4 w-4 shrink-0 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
