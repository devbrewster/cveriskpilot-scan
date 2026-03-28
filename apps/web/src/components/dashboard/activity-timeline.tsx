'use client';

interface ActivityEvent {
  id: string;
  type: 'scan' | 'case' | 'remediation' | 'alert' | 'kev' | 'policy';
  title: string;
  description?: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

const eventIcons: Record<ActivityEvent['type'], { color: string; icon: React.ReactNode }> = {
  scan: {
    color: 'bg-blue-100 text-blue-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  case: {
    color: 'bg-purple-100 text-purple-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  remediation: {
    color: 'bg-green-100 text-green-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  alert: {
    color: 'bg-red-100 text-red-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  kev: {
    color: 'bg-orange-100 text-orange-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  policy: {
    color: 'bg-indigo-100 text-indigo-600',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        No recent activity
      </div>
    );
  }

  return (
    <div className="max-h-[28rem] overflow-y-auto pr-1">
      <div className="relative">
        {events.map((event, idx) => {
          const { color, icon } = eventIcons[event.type] ?? eventIcons.case;
          const isLast = idx === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-3 pb-6">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-[15px] top-8 h-full w-0.5 bg-gray-200" />
              )}

              {/* Icon circle */}
              <div
                className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${color}`}
              >
                {icon}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-gray-900">{event.title}</p>
                {event.description && (
                  <p className="mt-0.5 text-xs text-gray-500">{event.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">{event.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
