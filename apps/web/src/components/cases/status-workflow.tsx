'use client';

import { useState, useCallback } from 'react';
import { StatusBadge, getStatusLabel } from '@/components/ui/badges';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import type { CaseStatus } from '@/lib/types';

// Valid transitions map
const VALID_TRANSITIONS: Record<CaseStatus, { status: CaseStatus; label: string; variant?: 'primary' | 'danger' }[]> = {
  NEW: [
    { status: 'TRIAGE', label: 'Triage' },
    { status: 'ACCEPTED_RISK', label: 'Accept Risk', variant: 'danger' },
    { status: 'FALSE_POSITIVE', label: 'False Positive' },
    { status: 'NOT_APPLICABLE', label: 'Not Applicable' },
  ],
  TRIAGE: [
    { status: 'IN_REMEDIATION', label: 'Start Remediation' },
    { status: 'ACCEPTED_RISK', label: 'Accept Risk', variant: 'danger' },
    { status: 'FALSE_POSITIVE', label: 'False Positive' },
    { status: 'NOT_APPLICABLE', label: 'Not Applicable' },
  ],
  IN_REMEDIATION: [
    { status: 'FIXED_PENDING_VERIFICATION', label: 'Mark Fixed' },
    { status: 'REOPENED', label: 'Reopen', variant: 'danger' },
  ],
  FIXED_PENDING_VERIFICATION: [
    { status: 'VERIFIED_CLOSED', label: 'Verify & Close' },
    { status: 'REOPENED', label: 'Reopen', variant: 'danger' },
  ],
  VERIFIED_CLOSED: [{ status: 'REOPENED', label: 'Reopen', variant: 'danger' }],
  REOPENED: [
    { status: 'IN_REMEDIATION', label: 'Start Remediation' },
    { status: 'ACCEPTED_RISK', label: 'Accept Risk', variant: 'danger' },
    { status: 'FALSE_POSITIVE', label: 'False Positive' },
  ],
  ACCEPTED_RISK: [{ status: 'REOPENED', label: 'Reopen', variant: 'danger' }],
  FALSE_POSITIVE: [{ status: 'REOPENED', label: 'Reopen', variant: 'danger' }],
  NOT_APPLICABLE: [{ status: 'REOPENED', label: 'Reopen', variant: 'danger' }],
  DUPLICATE: [],
};

interface StatusWorkflowProps {
  currentStatus: CaseStatus;
  onStatusChange: (newStatus: CaseStatus, reason: string) => void;
}

export function StatusWorkflow({ currentStatus, onStatusChange }: StatusWorkflowProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CaseStatus | null>(null);
  const [reason, setReason] = useState('');
  const { addToast } = useToast();

  const transitions = VALID_TRANSITIONS[currentStatus] ?? [];

  const handleTransitionClick = useCallback((status: CaseStatus) => {
    setPendingStatus(status);
    setReason('');
    setDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (pendingStatus) {
      onStatusChange(pendingStatus, reason);
      addToast('success', `Status changed to ${getStatusLabel(pendingStatus)}`);
    }
    setDialogOpen(false);
    setPendingStatus(null);
    setReason('');
  }, [pendingStatus, reason, onStatusChange, addToast]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-500">Current Status</h3>
        <div className="mt-2">
          <StatusBadge status={currentStatus} size="lg" />
        </div>
      </div>

      {transitions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-500">Available Actions</h3>
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.status}
                type="button"
                onClick={() => handleTransitionClick(t.status)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  t.variant === 'danger'
                    ? 'border border-red-300 text-red-700 hover:bg-red-50'
                    : 'border border-primary-300 text-primary-700 hover:bg-primary-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setPendingStatus(null);
        }}
        title="Confirm Status Change"
        onConfirm={handleConfirm}
        confirmLabel={pendingStatus ? `Change to ${getStatusLabel(pendingStatus)}` : 'Confirm'}
        confirmVariant={
          transitions.find((t) => t.status === pendingStatus)?.variant === 'danger' ? 'danger' : 'primary'
        }
      >
        <div className="space-y-4">
          <p>
            Change status from <StatusBadge status={currentStatus} /> to{' '}
            {pendingStatus && <StatusBadge status={pendingStatus} />}?
          </p>
          <div>
            <label htmlFor="transition-reason" className="block text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <textarea
              id="transition-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter a reason for this status change..."
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
