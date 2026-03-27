'use client';

import { useState } from 'react';
import { ExecutiveReport } from './executive-report';
import { ExportButton } from './export-button';
import { ScheduleManager } from './schedule-manager';
import { BulkExport } from './bulk-export';
import { mockCases } from '@/lib/mock-data';

type ActiveView = 'hub' | 'executive' | 'schedules' | 'bulk-export';

function ReportCard({
  title,
  description,
  icon,
  onClick,
  disabled,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-4 rounded-lg border bg-white p-6 text-left shadow-sm transition-all ${
        disabled
          ? 'cursor-not-allowed border-gray-100 opacity-60'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {badge}
        </div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {!disabled && (
        <svg className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

export function ReportsHub() {
  const [view, setView] = useState<ActiveView>('hub');

  // Prepare mock data for export button
  const casesForExport = mockCases.map((c) => ({ ...c } as Record<string, unknown>));

  if (view !== 'hub') {
    const viewTitles: Record<string, string> = {
      executive: 'Executive Summary',
      schedules: 'Scheduled Reports',
      'bulk-export': 'Bulk Export',
    };

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setView('hub')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports
        </button>
        {view === 'executive' && <ExecutiveReport />}
        {view === 'schedules' && <ScheduleManager organizationId="demo-org-id" />}
        {view === 'bulk-export' && <BulkExport organizationId="demo-org-id" />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {/* Executive Summary */}
        <ReportCard
          title="Executive Summary"
          description="Generate a print-friendly executive vulnerability summary report with severity breakdown, KEV exposure, and recommendations."
          onClick={() => setView('executive')}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        {/* Scan Comparison */}
        <a href="/reports/compare" className="block">
          <ReportCard
            title="Scan Comparison"
            description="Compare two scan results side-by-side to identify new, resolved, and unchanged findings between scans."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            }
          />
        </a>

        {/* Scheduled Reports */}
        <ReportCard
          title="Scheduled Reports"
          description="Set up automated recurring reports delivered via email on a schedule you define."
          onClick={() => setView('schedules')}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Bulk Export */}
        <ReportCard
          title="Bulk Export"
          description="Export large datasets of findings, cases, or assets asynchronously with filters."
          onClick={() => setView('bulk-export')}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          }
        />
      </div>

      {/* Quick Export Section */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Quick Export</h3>
            <p className="mt-1 text-sm text-gray-500">Export current vulnerability cases or findings data as CSV</p>
          </div>
          <ExportButton cases={casesForExport} findings={[]} />
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <span className="text-gray-500">Total Cases:</span>{' '}
              <span className="font-medium text-gray-900">{mockCases.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Critical:</span>{' '}
              <span className="font-medium text-red-700">
                {mockCases.filter((c) => c.severity === 'CRITICAL').length}
              </span>
            </div>
            <div>
              <span className="text-gray-500">High:</span>{' '}
              <span className="font-medium text-orange-700">
                {mockCases.filter((c) => c.severity === 'HIGH').length}
              </span>
            </div>
            <div>
              <span className="text-gray-500">KEV Listed:</span>{' '}
              <span className="font-medium text-orange-700">
                {mockCases.filter((c) => c.kevListed).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
