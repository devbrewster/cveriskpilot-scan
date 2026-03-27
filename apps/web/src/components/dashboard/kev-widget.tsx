'use client';

interface KevWidgetProps {
  kevCount: number;
  nearestDueDate: string | null;
}

export function KevWidget({ kevCount, nearestDueDate }: KevWidgetProps) {
  const hasKev = kevCount > 0;

  function formatDueDate(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (diffDays < 0) return `${formatted} (${Math.abs(diffDays)}d overdue)`;
    if (diffDays === 0) return `${formatted} (due today)`;
    return `${formatted} (${diffDays}d remaining)`;
  }

  return (
    <div
      className={`rounded-lg border p-6 ${
        hasKev ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <svg
          className={`h-5 w-5 ${hasKev ? 'text-red-600' : 'text-green-600'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <span className={`text-sm font-semibold ${hasKev ? 'text-red-800' : 'text-green-800'}`}>
          KEV-Listed
        </span>
      </div>

      <p className={`mt-3 text-5xl font-bold ${hasKev ? 'text-red-700' : 'text-green-700'}`}>
        {kevCount}
      </p>

      <p className={`mt-2 text-sm ${hasKev ? 'text-red-600' : 'text-green-600'}`}>
        Known Exploited Vulnerabilities requiring urgent remediation
      </p>

      {hasKev && nearestDueDate && (
        <div className="mt-4 rounded-md bg-red-100 px-3 py-2">
          <p className="text-xs font-medium text-red-800">Nearest deadline</p>
          <p className="text-sm font-semibold text-red-900">{formatDueDate(nearestDueDate)}</p>
        </div>
      )}

      {!hasKev && (
        <div className="mt-4 rounded-md bg-green-100 px-3 py-2">
          <p className="text-sm font-medium text-green-800">
            No active KEV vulnerabilities detected.
          </p>
        </div>
      )}
    </div>
  );
}
