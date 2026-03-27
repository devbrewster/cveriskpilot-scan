'use client';

import { useState } from 'react';
import { SeverityBadge, StatusBadge } from '@/components/ui/badge';
import type { VulnerabilityCase } from '@/lib/mock-data';

interface EpssTop10Props {
  cases: VulnerabilityCase[];
}

export function EpssTop10({ cases }: EpssTop10Props) {
  const [sortAsc, setSortAsc] = useState(false);

  const casesWithEpss = cases.filter((c) => c.epssScore !== null);
  const sorted = [...casesWithEpss].sort((a, b) => {
    const diff = (b.epssScore ?? 0) - (a.epssScore ?? 0);
    return sortAsc ? -diff : diff;
  });
  const top10 = sorted.slice(0, 10);

  if (top10.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        No cases with EPSS scores available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-3 pr-4">CVE ID</th>
            <th className="pb-3 pr-4">Title</th>
            <th
              className="cursor-pointer pb-3 pr-4 select-none"
              onClick={() => setSortAsc(!sortAsc)}
            >
              <span className="flex items-center gap-1">
                EPSS Score
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {sortAsc ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  )}
                </svg>
              </span>
            </th>
            <th className="pb-3 pr-4">Percentile</th>
            <th className="pb-3 pr-4">Severity</th>
            <th className="pb-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {top10.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="py-3 pr-4">
                <span className="font-mono text-xs font-medium text-blue-700">
                  {c.cveIds[0] || 'N/A'}
                </span>
              </td>
              <td className="max-w-[200px] truncate py-3 pr-4 text-gray-700" title={c.title}>
                {c.title}
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${(c.epssScore ?? 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {((c.epssScore ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </td>
              <td className="py-3 pr-4 text-xs text-gray-600">
                {c.epssPercentile !== null ? `${(c.epssPercentile * 100).toFixed(1)}%` : '-'}
              </td>
              <td className="py-3 pr-4">
                <SeverityBadge severity={c.severity} />
              </td>
              <td className="py-3">
                <StatusBadge status={c.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
