'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import type { CaseStatus } from '@/lib/mock-findings';

interface BulkActionsProps {
  selectedCount: number;
  onStatusChange: (status: CaseStatus) => void;
  onClear: () => void;
}

const BULK_STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'TRIAGE', label: 'Triage' },
  { value: 'IN_REMEDIATION', label: 'In Remediation' },
  { value: 'ACCEPTED_RISK', label: 'Accept Risk' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
];

export function BulkActions({ selectedCount, onStatusChange, onClear }: BulkActionsProps) {
  const [statusValue, setStatusValue] = useState<CaseStatus | ''>('');
  const { addToast } = useToast();

  const handleApply = () => {
    if (!statusValue) {
      addToast('warning', 'Please select a status to apply.');
      return;
    }
    onStatusChange(statusValue);
    addToast('success', `Status updated for ${selectedCount} finding${selectedCount !== 1 ? 's' : ''}.`);
    setStatusValue('');
  };

  const handleExport = () => {
    addToast('info', `Exporting ${selectedCount} selected finding${selectedCount !== 1 ? 's' : ''}...`);
  };

  const handleAssign = () => {
    addToast('info', 'Assign To feature coming soon.');
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-5 py-3 shadow-2xl">
        <span className="text-sm font-semibold text-gray-700">
          {selectedCount} selected
        </span>

        <div className="h-5 w-px bg-gray-300" />

        {/* Change Status */}
        <div className="flex items-center gap-2">
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value as CaseStatus | '')}
            className="rounded-md border border-gray-300 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Change Status...</option>
            {BULK_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleApply}
            disabled={!statusValue}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>

        <div className="h-5 w-px bg-gray-300" />

        {/* Assign */}
        <button
          type="button"
          onClick={handleAssign}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Assign To
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export Selected
        </button>

        <div className="h-5 w-px bg-gray-300" />

        {/* Clear */}
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
