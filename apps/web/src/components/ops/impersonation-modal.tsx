'use client';

import { useState, useCallback } from 'react';

interface ImpersonationModalProps {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
  onStart: (token: string, startedAt: string) => void;
}

export function ImpersonationModal({
  organizationId,
  organizationName,
  onClose,
  onStart,
}: ImpersonationModalProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = reason.trim().length >= 10 && acknowledged;

  const handleStart = useCallback(async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ops/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, reason: reason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Failed to start impersonation');
        setLoading(false);
        return;
      }

      onStart(data.token, data.startedAt);
    } catch {
      setError('Network error — please try again');
      setLoading(false);
    }
  }, [isValid, organizationId, reason, onStart]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="imp-modal-title"
        className="w-full max-w-md rounded-lg border border-gray-200 bg-white dark:bg-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2
            id="imp-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            View as Customer
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Impersonate{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {organizationName}
            </span>
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Warning */}
          <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">This action is audit-logged</p>
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                Your identity, reason, IP address, and session duration will be
                permanently recorded. The session is read-only.
              </p>
            </div>
          </div>

          {/* Reason input */}
          <div>
            <label
              htmlFor="imp-reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Reason for impersonation{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              id="imp-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer reported missing scan results — investigating dashboard view (min 10 chars)"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {reason.length > 0 && reason.trim().length < 10 && (
              <p className="mt-1 text-xs text-red-500">
                Minimum 10 characters required ({reason.trim().length}/10)
              </p>
            )}
          </div>

          {/* Acknowledgement checkbox */}
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
            />
            <span className="text-gray-700 dark:text-gray-300">
              I understand this action is audit-logged and will be reviewed
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!isValid || loading}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Viewing'}
          </button>
        </div>
      </div>
    </div>
  );
}
