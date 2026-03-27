'use client';

/* ------------------------------------------------------------------ */
/* Inline SVG Icons                                                   */
/* ------------------------------------------------------------------ */

function LockIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function BellIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* ComingSoonBadge                                                    */
/* ------------------------------------------------------------------ */

interface ComingSoonBadgeProps {
  className?: string;
}

export function ComingSoonBadge({ className = '' }: ComingSoonBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200 ${className}`}
    >
      Coming Soon
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* ComingSoonOverlay                                                  */
/* ------------------------------------------------------------------ */

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  className?: string;
}

export function ComingSoonOverlay({ children, className = '' }: ComingSoonOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Content behind the overlay */}
      <div className="pointer-events-none select-none blur-[2px]">{children}</div>
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white/90 px-6 py-4 shadow-sm border border-gray-200">
          <LockIcon className="h-8 w-8 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ComingSoonPage                                                     */
/* ------------------------------------------------------------------ */

interface ComingSoonPageProps {
  title: string;
  description: string;
  showNotifyButton?: boolean;
}

export function ComingSoonPage({ title, description, showNotifyButton = true }: ComingSoonPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-indigo-50 p-4">
        <LockIcon className="h-12 w-12 text-indigo-500" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-3 max-w-md text-base text-gray-500">{description}</p>
      <p className="mt-2 text-sm text-gray-400">We are working on this feature and it will be available soon.</p>
      {showNotifyButton && (
        <button
          className="mt-8 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          onClick={() => {
            /* placeholder */
          }}
        >
          <BellIcon className="h-4 w-4" />
          Notify Me
        </button>
      )}
    </div>
  );
}
