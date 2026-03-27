'use client';

import type { Severity } from '@/lib/mock-data';

const severityConfig: Record<Severity, { color: string; label: string }> = {
  CRITICAL: { color: 'bg-red-600', label: 'Critical' },
  HIGH: { color: 'bg-orange-500', label: 'High' },
  MEDIUM: { color: 'bg-yellow-500', label: 'Medium' },
  LOW: { color: 'bg-blue-500', label: 'Low' },
  INFO: { color: 'bg-gray-400', label: 'Info' },
};

interface SeverityChartProps {
  counts: Record<Severity, number>;
}

export function SeverityChart({ counts }: SeverityChartProps) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        No vulnerability cases found.
      </div>
    );
  }

  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-10 overflow-hidden rounded-lg">
        {severities.map((sev) => {
          const pct = (counts[sev] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={sev}
              className={`${severityConfig[sev].color} flex items-center justify-center text-xs font-semibold text-white transition-all`}
              style={{ width: `${pct}%` }}
              title={`${severityConfig[sev].label}: ${counts[sev]} (${pct.toFixed(1)}%)`}
            >
              {pct >= 8 && counts[sev]}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {severities.map((sev) => {
          const pct = total > 0 ? ((counts[sev] / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={sev} className="flex items-center gap-2 text-sm">
              <span className={`inline-block h-3 w-3 rounded-sm ${severityConfig[sev].color}`} />
              <span className="font-medium text-gray-700">{severityConfig[sev].label}</span>
              <span className="text-gray-500">
                {counts[sev]} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
