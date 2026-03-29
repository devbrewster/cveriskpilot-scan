'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

interface NotificationBellProps {
  userId: string;
}

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

function notificationIcon(type: string): string {
  switch (type) {
    case 'mention':
      return '@';
    case 'assignment':
      return '\u2192'; // right arrow
    case 'sla_breach':
      return '!';
    default:
      return '\u2022'; // bullet
  }
}

function notificationIconColor(type: string): string {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell({ userId }: NotificationBellProps) {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Poll unread count
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications/count?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
      }
    } catch {
      // silently ignore
    }
  }, [userId]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Fetch recent notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/notifications?userId=${userId}&limit=10`)
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => {
        setError('Failed to load notifications');
      })
      .finally(() => setLoading(false));
  }, [open, userId]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setCount(0);
    } catch {
      // ignore
    }
  };

  // Mark a single notification as read and navigate
  const handleClick = async (notif: Notification) => {
    if (!notif.isRead) {
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationIds: [notif.id] }),
      }).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setCount((c) => Math.max(0, c - 1));
    }

    // Navigate to the related case if applicable
    if (notif.relatedEntityType === 'VulnerabilityCase' && notif.relatedEntityId) {
      setOpen(false);
      window.location.href = `/cases/${notif.relatedEntityId}`;
    }
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white dark:bg-gray-900 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {count > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-auto">
            {error ? (
              <p className="px-4 py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No notifications</p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleClick(notif)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                    notif.isRead ? '' : 'bg-blue-50/50'
                  }`}
                >
                  {/* Type icon */}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${notificationIconColor(notif.type)}`}
                  >
                    {notificationIcon(notif.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${notif.isRead ? 'text-gray-700' : 'font-medium text-gray-900'}`}
                    >
                      {notif.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {!notif.isRead && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2">
            <a
              href="/notifications"
              className="block text-center text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
