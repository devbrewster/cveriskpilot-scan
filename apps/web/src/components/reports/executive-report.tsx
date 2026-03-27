'use client';

import { useState, useMemo } from 'react';
import { mockCases } from '@/lib/mock-data';
import type { ExecutiveReportData } from '@/lib/export/pdf-report';
import { generateExecutivePDF, previewExecutiveReport } from '@/lib/export/pdf-report';

const SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const OPEN_STATUSES = new Set(['NEW', 'TRIAGE', 'IN_REMEDIATION', 'REOPENED']);
const CLOSED_STATUSES = new Set(['VERIFIED_CLOSED', 'FIXED_PENDING_VERIFICATION']);

const SECTION_OPTIONS = [
  { key: 'keyMetrics', label: 'Key Metrics' },
  { key: 'severityDistribution', label: 'Severity Distribution' },
  { key: 'topCritical', label: 'Top 10 Critical Cases' },
  { key: 'kevExposure', label: 'KEV Exposure' },
  { key: 'epssHighRisk', label: 'EPSS High-Risk' },
  { key: 'trend', label: 'Open vs Closed Trend' },
  { key: 'recommendations', label: 'Recommendations' },
] as const;

export function ExecutiveReport() {
  const [orgName, setOrgName] = useState('My Organization');
  const [dateFrom, setDateFrom] = useState('2026-03-01');
  const [dateTo, setDateTo] = useState('2026-03-27');
  const [severities, setSeverities] = useState<Set<string>>(
    new Set(SEVERITY_OPTIONS),
  );
  const [sections, setSections] = useState<Record<string, boolean>>({
    keyMetrics: true,
    severityDistribution: true,
    topCritical: true,
    kevExposure: true,
    epssHighRisk: true,
    trend: true,
    recommendations: true,
  });

  function toggleSeverity(sev: string) {
    setSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  }

  function toggleSection(key: string) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const reportData: ExecutiveReportData = useMemo(() => {
    const filtered = mockCases.filter((c) => severities.has(c.severity));

    const criticalCount = filtered.filter((c) => c.severity === 'CRITICAL').length;
    const highCount = filtered.filter((c) => c.severity === 'HIGH').length;
    const mediumCount = filtered.filter((c) => c.severity === 'MEDIUM').length;
    const lowCount = filtered.filter((c) => c.severity === 'LOW').length;
    const infoCount = filtered.filter((c) => c.severity === 'INFO').length;
    const kevCases = filtered.filter((c) => c.kevListed);
    const epssScores = filtered
      .map((c) => c.epssScore)
      .filter((s): s is number => s !== null);
    const avgEpss = epssScores.length > 0 ? epssScores.reduce((a, b) => a + b, 0) / epssScores.length : 0;

    const topCritical = [...filtered]
      .filter((c) => c.severity === 'CRITICAL' || c.severity === 'HIGH')
      .sort((a, b) => (b.cvssScore ?? 0) - (a.cvssScore ?? 0))
      .slice(0, 10)
      .map((c) => ({
        cveIds: c.cveIds,
        title: c.title,
        cvssScore: c.cvssScore,
        epssScore: c.epssScore,
        kevListed: c.kevListed,
        status: c.status,
      }));

    const kevExposure = kevCases.map((c) => ({
      cveIds: c.cveIds,
      title: c.title,
      kevDueDate: c.kevDueDate,
      status: c.status,
    }));

    const epssHighRisk = filtered
      .filter((c) => c.epssScore !== null && c.epssScore > 0.5)
      .sort((a, b) => (b.epssScore ?? 0) - (a.epssScore ?? 0))
      .map((c) => ({
        cveIds: c.cveIds,
        title: c.title,
        epssScore: c.epssScore,
        severity: c.severity,
        status: c.status,
      }));

    const openCount = filtered.filter((c) => OPEN_STATUSES.has(c.status)).length;
    const closedCount = filtered.filter((c) => CLOSED_STATUSES.has(c.status)).length;

    return {
      organizationName: orgName,
      reportDate: new Date().toISOString().slice(0, 10),
      dateRange: { from: dateFrom, to: dateTo },
      totalCases: filtered.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      kevCount: kevCases.length,
      avgEpssScore: avgEpss,
      meanTimeToRemediate: '12.4 days',
      topCriticalCases: topCritical,
      kevExposure,
      epssHighRisk,
      openCount,
      closedCount,
      includeSections: {
        keyMetrics: sections.keyMetrics,
        severityDistribution: sections.severityDistribution,
        topCritical: sections.topCritical,
        kevExposure: sections.kevExposure,
        epssHighRisk: sections.epssHighRisk,
        trend: sections.trend,
        recommendations: sections.recommendations,
      },
    };
  }, [orgName, dateFrom, dateTo, severities, sections]);

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">Report Configuration</h3>
          <p className="mt-1 text-sm text-gray-500">Configure the executive summary report parameters</p>
        </div>
        <div className="space-y-6 px-6 py-4">
          {/* Organization */}
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">
              Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Severity Filter</label>
            <div className="mt-2 flex flex-wrap gap-3">
              {SEVERITY_OPTIONS.map((sev) => (
                <label key={sev} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={severities.has(sev)}
                    onChange={() => toggleSeverity(sev)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{sev}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Include Sections */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Include Sections</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SECTION_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sections[opt.key]}
                    onChange={() => toggleSection(opt.key)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => previewExecutiveReport(reportData)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview
        </button>
        <button
          type="button"
          onClick={() => generateExecutivePDF(reportData)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </button>
      </div>

      {/* Preview Summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="text-sm font-medium text-gray-700">Report Preview Summary</h4>
        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 sm:grid-cols-4">
          <div>Total cases: <span className="font-medium text-gray-900">{reportData.totalCases}</span></div>
          <div>Critical/High: <span className="font-medium text-red-700">{reportData.criticalCount + reportData.highCount}</span></div>
          <div>KEV listed: <span className="font-medium text-orange-700">{reportData.kevCount}</span></div>
          <div>Avg EPSS: <span className="font-medium text-gray-900">{reportData.avgEpssScore.toFixed(3)}</span></div>
        </div>
      </div>
    </div>
  );
}
