'use client';

import { useEffect, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnnouncementType = 'info' | 'warning' | 'maintenance' | 'incident';
type AnnouncementStatus = 'draft' | 'active' | 'expired';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  startAt: string;
  endAt: string;
  createdBy: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_BADGES: Record<AnnouncementType, string> = {
  info: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  maintenance: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  incident: 'bg-red-500/20 text-red-400 ring-red-500/30',
};

const STATUS_BADGES: Record<AnnouncementStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
  expired: 'bg-gray-500/20 text-gray-500 ring-gray-600/30',
};

const TYPE_BANNER_COLORS: Record<AnnouncementType, string> = {
  info: 'border-blue-500/40 bg-blue-500/10',
  warning: 'border-yellow-500/40 bg-yellow-500/10',
  maintenance: 'border-orange-500/40 bg-orange-500/10',
  incident: 'border-red-500/40 bg-red-500/10',
};

const TYPE_BANNER_TEXT: Record<AnnouncementType, string> = {
  info: 'text-blue-300',
  warning: 'text-yellow-300',
  maintenance: 'text-orange-300',
  incident: 'text-red-300',
};

const TYPE_ICONS: Record<AnnouncementType, React.ReactNode> = {
  info: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  maintenance: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1a2.12 2.12 0 010-3l.7-.71a2.12 2.12 0 013 0l5.1 5.1m-7.07 7.07l5.1 5.1a2.12 2.12 0 003 0l.71-.7a2.12 2.12 0 000-3l-5.1-5.1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  incident: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
};

const ANNOUNCEMENT_TYPES: AnnouncementType[] = ['info', 'warning', 'maintenance', 'incident'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<AnnouncementType>('info');
  const [formStartAt, setFormStartAt] = useState('');
  const [formEndAt, setFormEndAt] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/announcements');
      if (!res.ok) throw new Error('Failed to load announcements');
      const json = await res.json();
      setAnnouncements(json.announcements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setFormTitle('');
    setFormMessage('');
    setFormType('info');
    setFormStartAt('');
    setFormEndAt('');
  };

  const handleCreate = async () => {
    if (!formTitle || !formMessage || !formStartAt || !formEndAt) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ops/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          message: formMessage,
          type: formType,
          startAt: new Date(formStartAt).toISOString(),
          endAt: new Date(formEndAt).toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to create announcement');
      setShowModal(false);
      resetForm();
      await fetchAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: AnnouncementStatus) => {
    try {
      const res = await fetch('/api/ops/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const activeBanners = announcements.filter((a) => a.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Announcements &amp; Banners</h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage customer-facing banners and notifications.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          New Announcement
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Active Banners Preview */}
      {activeBanners.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Active Banners (customer view)
          </h3>
          {activeBanners.map((banner) => (
            <div
              key={banner.id}
              className={`rounded-lg border p-4 ${TYPE_BANNER_COLORS[banner.type]}`}
            >
              <div className="flex items-start gap-3">
                <span className={TYPE_BANNER_TEXT[banner.type]}>
                  {TYPE_ICONS[banner.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${TYPE_BANNER_TEXT[banner.type]}`}>
                    {banner.title}
                  </p>
                  <p className={`mt-1 text-sm ${TYPE_BANNER_TEXT[banner.type]} opacity-80`}>
                    {banner.message}
                  </p>
                </div>
                <button
                  onClick={() => handleStatusChange(banner.id, 'expired')}
                  className="shrink-0 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-300 transition-colors"
                  title="Expire this banner"
                >
                  Expire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Announcements Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            All Announcements
          </h3>
        </div>
        {announcements.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            No announcements yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Start</th>
                  <th className="px-6 py-3 font-medium">End</th>
                  <th className="px-6 py-3 font-medium">Created By</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {announcements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{ann.title}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${TYPE_BADGES[ann.type]}`}
                      >
                        {ann.type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${STATUS_BADGES[ann.status]}`}
                      >
                        {ann.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-400">
                      {new Date(ann.startAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-400">
                      {new Date(ann.endAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3 text-gray-400">{ann.createdBy}</td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        {ann.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(ann.id, 'active')}
                            className="rounded px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        {ann.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(ann.id, 'expired')}
                            className="rounded px-2 py-1 text-xs font-medium text-orange-400 hover:bg-orange-500/10 transition-colors"
                          >
                            Expire
                          </button>
                        )}
                        {ann.status === 'expired' && (
                          <button
                            onClick={() => handleStatusChange(ann.id, 'active')}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">New Announcement</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 px-6 py-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                  Message
                </label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  rows={3}
                  placeholder="Describe the announcement..."
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as AnnouncementType)}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {ANNOUNCEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartAt}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndAt}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Banner Preview */}
              {formTitle && formMessage && (
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    Preview
                  </label>
                  <div className={`rounded-lg border p-3 ${TYPE_BANNER_COLORS[formType]}`}>
                    <div className="flex items-start gap-2">
                      <span className={TYPE_BANNER_TEXT[formType]}>
                        {TYPE_ICONS[formType]}
                      </span>
                      <div>
                        <p className={`text-sm font-semibold ${TYPE_BANNER_TEXT[formType]}`}>
                          {formTitle}
                        </p>
                        <p className={`mt-0.5 text-sm ${TYPE_BANNER_TEXT[formType]} opacity-80`}>
                          {formMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formTitle || !formMessage || !formStartAt || !formEndAt}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Creating...' : 'Create Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
