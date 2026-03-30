interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  accent?: string;
}

export function StatCard({ label, value, trend, trendLabel, accent }: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  const trendColor = isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-gray-500';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accent || 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
      {trend !== undefined && (
        <div className={`mt-2 flex items-center text-sm ${trendColor}`}>
          {isPositive ? (
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          ) : isNegative ? (
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          ) : null}
          <span>{Math.abs(trend).toFixed(1)}%</span>
          {trendLabel && <span className="ml-1 text-gray-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
