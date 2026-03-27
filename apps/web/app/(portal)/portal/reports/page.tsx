'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Portal Reports - Download-only view for client users
// ---------------------------------------------------------------------------

const REPORT_TYPES = [
  {
    id: 'executive',
    label: 'Executive Summary',
    description: 'High-level vulnerability summary with severity breakdown, KEV exposure, and recommendations.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    formats: ['json'],
  },
  {
    id: 'findings',
    label: 'Findings Report',
    description: 'Detailed export of all vulnerability findings with asset and scanner information.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    formats: ['csv'],
  },
  {
    id: 'sla',
    label: 'SLA Compliance',
    description: 'SLA compliance report showing overdue cases and compliance rates.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    formats: ['csv', 'json'],
  },
];

export default function PortalReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(reportType: string, format: string) {
    setGenerating(reportType);
    setError(null);

    try {
      // Read session from cookie
      const sessionCookie = document.cookie
        .split(';')
        .find((c) => c.trim().startsWith('crp_portal_session='));

      if (!sessionCookie) {
        throw new Error('Session not found. Please log in again.');
      }

      const sessionValue = sessionCookie.split('=').slice(1).join('=');
      const session = JSON.parse(atob(decodeURIComponent(sessionValue)));

      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: session.organizationId,
          clientId: session.clientId,
          reportType,
          format,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate report');

      const contentType = res.headers.get('Content-Type') ?? '';
      const timestamp = new Date().toISOString().slice(0, 10);

      if (contentType.includes('text/csv')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-report-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate and download reports for your organization
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((report) => (
          <div
            key={report.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                {report.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{report.label}</h3>
                <p className="mt-1 text-xs text-gray-500">{report.description}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {report.formats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleGenerate(report.id, fmt)}
                  disabled={generating === report.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {generating === report.id ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Download {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info note */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <strong>Note:</strong> All reports are automatically scoped to your organization's data.
        Contact your security team for historical or custom reports.
      </div>
    </div>
  );
}
