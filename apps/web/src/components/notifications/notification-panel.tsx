'use client';

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NotificationPanelProps {
  userId: string;
}

type FilterType = 'all' | 'unread' | 'mentions' | 'assignments' | 'sla';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function typeIcon(type: string): string {
  switch (type) {
    case 'mention':
      return '@';
    case 'assignment':
      return '\u2192';
    case 'sla_breach':
      return '!';
    default:
      return '\u2022';
  }
}

function typeColor(type: string): string {
  switch (type) {
    case 'mention':
      return 'bg-purple-100 text-purple-700';
    case 'assignment':
      return 'bg-blue-100 text-blue-700';
    case 'sla_breach':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Mentions', value: 'mentions' },
  { label: 'Assignments', value: 'assignments' },
  { label: 'SLA', value: 'sla' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationPanel({ userId }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        page: String(page),
        limit: '20',
      });
      if (filter !== 'all') {
        params.set('filter', filter);
      }

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setPagination(data.pagination || null);
        setError(null);
      } else {
        setError('Failed to load notifications');
      }
    } catch {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [userId, filter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const handleClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.isRead) {
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationIds: [notif.id] }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
    }

    // Navigate
    if (notif.relatedEntityType === 'VulnerabilityCase' && notif.relatedEntityId) {
      window.location.href = `/cases/${notif.relatedEntityId}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-white dark:bg-gray-900 text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button type="button" onClick={fetchNotifications} className="ml-2 font-medium underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Notification list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {filter !== 'all' ? 'No matching notifications' : 'All caught up!'}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {filter !== 'all'
              ? 'Try switching to "All" to see all your notifications.'
              : 'You have no notifications yet. They will appear here when there are case updates, SLA breaches, or mentions.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => handleClick(notif)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                notif.isRead ? '' : 'bg-blue-50/40'
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${typeColor(notif.type)}`}
              >
                {typeIcon(notif.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm ${notif.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}
                  >
                    {notif.title}
                  </p>
                  {!notif.isRead && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-600">{notif.message}</p>
                <p className="mt-1 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
              </div>
              <svg
                className="mt-1 h-4 w-4 shrink-0 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
