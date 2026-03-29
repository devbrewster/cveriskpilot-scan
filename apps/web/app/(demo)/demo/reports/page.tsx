'use client';

import { demoStats, demoCases, demoComplianceScores } from '@/lib/demo-data';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function progressColor(score: number): string {
  if (score > 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function progressTextColor(score: number): string {
  if (score > 80) return 'text-green-700';
  if (score >= 60) return 'text-yellow-700';
  return 'text-red-700';
}

const complianceItems: { label: string; key: keyof typeof demoComplianceScores; version: string }[] = [
  { label: 'SOC 2', key: 'SOC2', version: 'Type II' },
  { label: 'SSDF', key: 'SSDF', version: 'NIST SP 800-218 v1.1' },
  { label: 'ASVS', key: 'ASVS', version: 'OWASP v4.0.3' },
];

/* ------------------------------------------------------------------ */
/* Derived metrics                                                    */
/* ------------------------------------------------------------------ */

const criticalHighCount =
  demoCases.filter((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH').length;
const kevCount = demoCases.filter((c) => c.kevListed).length;

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function DemoReportsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Executive summaries, compliance posture, and export options
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm text-blue-800">
          Sample executive report view. Full PDF export and scheduled reports available in the platform.
        </p>
      </div>

      {/* Section 1: Executive Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
        <p className="mt-1 text-sm text-gray-500">Key vulnerability metrics at a glance</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Total Findings</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{demoStats.totalFindings}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Open Cases</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{demoStats.openCases}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Critical / High</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{criticalHighCount}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">KEV Listed</p>
            <p className="mt-1 text-2xl font-bold text-orange-700">{kevCount}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">MTTR</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{demoStats.mttr} days</p>
          </div>
        </div>
      </div>

      {/* Section 2: Compliance Posture */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Compliance Posture</h2>
        <p className="mt-1 text-sm text-gray-500">Framework alignment based on vulnerability data and control mappings</p>

        <div className="mt-6 space-y-5">
          {complianceItems.map((item) => {
            const score = demoComplianceScores[item.key];
            return (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                    <span className="ml-2 text-xs text-gray-500">{item.version}</span>
                  </div>
                  <span className={`text-sm font-bold ${progressTextColor(score)}`}>
                    {score}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Export Options */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>
        <p className="mt-1 text-sm text-gray-500">Generate and download reports in various formats</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Executive PDF */}
          <div className="rounded-lg border border-gray-200 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">Executive PDF</h3>
            <p className="mt-1 text-sm text-gray-500">
              Branded executive summary with severity breakdown, KEV exposure, and actionable recommendations.
            </p>
            <button
              disabled
              className="mt-4 w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Available in Pro plan
            </button>
          </div>

          {/* CSV Export */}
          <div className="rounded-lg border border-gray-200 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">CSV Export</h3>
            <p className="mt-1 text-sm text-gray-500">
              Export all cases and findings as CSV for integration with ticketing systems and spreadsheets.
            </p>
            <button
              disabled
              className="mt-4 w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Available in Pro plan
            </button>
          </div>

          {/* Scan Comparison */}
          <div className="rounded-lg border border-gray-200 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">Scan Comparison</h3>
            <p className="mt-1 text-sm text-gray-500">
              Compare two scan results side-by-side to identify new, resolved, and unchanged findings.
            </p>
            <button
              disabled
              className="mt-4 w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              Available in Pro plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
