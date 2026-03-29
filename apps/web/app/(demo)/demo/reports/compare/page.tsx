'use client';

import { ScanCompare } from '@/components/reports/scan-compare';

export default function DemoScanComparePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan Compare</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compare two scan results to identify new, resolved, and unchanged findings
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Showing simulated scan comparison with mock data. Upload real scans to compare actual results.
        </p>
      </div>

      {/* ScanCompare uses its own internal mock data */}
      <ScanCompare />
    </div>
  );
}
