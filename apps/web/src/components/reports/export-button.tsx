'use client';

import { useState, useRef, useEffect } from 'react';
import { exportFindingsToCSV, exportCasesToCSV, downloadCSV } from '@/lib/export/csv-export';
import { useToast } from '@/components/ui/toast';

interface ExportButtonProps {
  findings?: Record<string, unknown>[];
  cases?: Record<string, unknown>[];
}

export function ExportButton({ findings = [], cases = [] }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  function handleExportFindings() {
    try {
      const csv = exportFindingsToCSV(findings);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `cveriskpilot-findings-${date}.csv`);
      addToast('success', `Exported ${findings.length} findings to CSV`);
    } catch {
      addToast('error', 'Failed to export findings');
    }
    setOpen(false);
  }

  function handleExportCases() {
    try {
      const csv = exportCasesToCSV(cases);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `cveriskpilot-cases-${date}.csv`);
      addToast('success', `Exported ${cases.length} cases to CSV`);
    } catch {
      addToast('error', 'Failed to export cases');
    }
    setOpen(false);
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
        <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="py-1">
            <button
              type="button"
              onClick={handleExportFindings}
              disabled={findings.length === 0}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Export Findings CSV</div>
                <div className="text-xs text-gray-500">{findings.length} finding{findings.length !== 1 ? 's' : ''}</div>
              </div>
            </button>
            <button
              type="button"
              onClick={handleExportCases}
              disabled={cases.length === 0}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div className="text-left">
                <div className="font-medium">Export Cases CSV</div>
                <div className="text-xs text-gray-500">{cases.length} case{cases.length !== 1 ? 's' : ''}</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
