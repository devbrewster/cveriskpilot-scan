'use client';

import { useState, useMemo } from 'react';
import { demoNotifications } from '@/lib/demo-data';

type NotificationType = 'scan_complete' | 'sla_breach' | 'case_assigned' | 'kev_alert' | 'status_change' | 'mention';
type FilterTab = 'all' | 'unread' | 'sla' | 'assignments' | 'mentions';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeConfig: Record<NotificationType, { bg: string; icon: React.ReactNode }> = {
  scan_complete: {
    bg: 'bg-green-100 text-green-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  sla_breach: {
    bg: 'bg-red-100 text-red-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  case_assigned: {
    bg: 'bg-blue-100 text-blue-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  kev_alert: {
    bg: 'bg-orange-100 text-orange-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M9.172 16.172a4 4 0 015.656 0M12 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016A11.955 11.955 0 0112 2.944z" />
      </svg>
    ),
  },
  status_change: {
    bg: 'bg-purple-100 text-purple-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  mention: {
    bg: 'bg-cyan-100 text-cyan-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9" />
      </svg>
    ),
  },
};

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'sla', label: 'SLA' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'mentions', label: 'Mentions' },
];

export default function DemoNotificationsPage() {
  const [notifications, setNotifications] = useState(demoNotifications);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter((n) => !n.isRead);
      case 'sla':
        return notifications.filter((n) => n.type === 'sla_breach');
      case 'assignments':
        return notifications.filter((n) => n.type === 'case_assigned');
      case 'mentions':
        return notifications.filter((n) => n.type === 'mention');
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      sla: notifications.filter((n) => n.type === 'sla_breach').length,
      assignments: notifications.filter((n) => n.type === 'case_assigned').length,
      mentions: notifications.filter((n) => n.type === 'mention').length,
    };
    return counts;
  }, [notifications]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium text-blue-800">
          Viewing demo notifications. Data shown is simulated.
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {unreadCount} unread
            </span>
          )}
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark All as Read
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-500">No notifications</p>
          <p className="mt-1 text-xs text-gray-400">
            {activeTab === 'unread'
              ? 'All caught up! No unread notifications.'
              : `No ${activeTab === 'all' ? '' : activeTab + ' '}notifications to display.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {filtered.map((notif) => {
            const config = typeConfig[notif.type];
            return (
              <button
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 ${
                  !notif.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                {/* Type icon */}
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                  {config.icon}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {notif.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{notif.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{timeAgo(notif.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!notif.isRead && (
                  <div className="mt-2 shrink-0">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
