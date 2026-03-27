/**
 * Skeleton loading placeholder components
 */

interface SkeletonTextProps {
  lines?: number;
  widths?: string[];
  className?: string;
}

export function SkeletonText({ lines = 3, widths, className = '' }: SkeletonTextProps) {
  const defaultWidths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${
            widths?.[i] ?? defaultWidths[i % defaultWidths.length]
          }`}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  hasHeader?: boolean;
  lines?: number;
}

export function SkeletonCard({ className = '', hasHeader = true, lines = 2 }: SkeletonCardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {hasHeader && (
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      )}
      <div className="px-6 py-4">
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: SkeletonTableProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 bg-white ${className}`}>
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-6 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 border-b border-gray-100 px-6 py-4 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
              style={{ maxWidth: colIdx === 0 ? '40%' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonChartProps {
  className?: string;
  height?: string;
}

export function SkeletonChart({ className = '', height = 'h-64' }: SkeletonChartProps) {
  return (
    <div
      className={`flex items-end gap-2 rounded-lg border border-gray-200 bg-white p-6 ${height} ${className}`}
    >
      {[40, 65, 45, 80, 55, 70, 50, 75, 60, 85, 45, 70].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t bg-gray-200 dark:bg-gray-700"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-8 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      {/* Chart */}
      <SkeletonChart />
      {/* Table */}
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}
