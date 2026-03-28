'use client';

import { useState, useEffect } from 'react';

interface DataDeletionDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onDeleted?: () => void;
}

export function DataDeletionDialog({
  open,
  onClose,
  clientId,
  clientName,
  onDeleted,
}: DataDeletionDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [dataCounts, setDataCounts] = useState<Record<string, number> | null>(null);

  const expectedText = `DELETE ${clientName}`;
  const isValid = confirmationText === expectedText && reason.trim().length >= 5;

  // Fetch data counts when dialog opens
  useEffect(() => {
    if (!open) {
      setConfirmationText('');
      setReason('');
      setError(null);
      setReceipt(null);
      return;
    }

    // Pre-fetch counts (in a real app this would be a separate endpoint)
    setDataCounts({
      findings: 0,
      cases: 0,
      assets: 0,
      artifacts: 0,
      comments: 0,
    });
  }, [open]);

  const handleDelete = async () => {
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/delete-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText, reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to delete client data');
        return;
      }

      setReceipt(data.receipt);
      onDeleted?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={receipt ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
        {receipt ? (
          // Success receipt
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Data Deletion Complete
              </h3>
            </div>
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">Client:</span>{' '}
                {String(receipt.clientName)}
              </p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                {String(receipt.status)}
              </p>
              <p>
                <span className="font-medium">Deleted at:</span>{' '}
                {String(receipt.deletedAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        ) : (
          // Confirmation form
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Client Data
                </h3>
                <p className="text-sm text-gray-500">
                  This action is irreversible.
                </p>
              </div>
            </div>

            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium">Warning: This will soft-delete all data for client &quot;{clientName}&quot;:</p>
              {dataCounts && (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  <li>Findings</li>
                  <li>Vulnerability cases</li>
                  <li>Assets</li>
                  <li>Scan artifacts</li>
                  <li>Comments</li>
                </ul>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type <span className="font-mono text-red-600">{expectedText}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={expectedText}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reason for deletion <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Client requested GDPR data erasure, CCPA compliance request"
                rows={2}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!isValid || loading}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete All Data'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
