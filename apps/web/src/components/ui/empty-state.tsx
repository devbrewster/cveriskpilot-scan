'use client';

import { useRouter } from 'next/navigation';

/* ------------------------------------------------------------------ */
/* SVG Icons (inline to avoid external deps)                          */
/* ------------------------------------------------------------------ */

function SearchIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function BriefcaseIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function DocumentIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function XCircleIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable Empty State                                               */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pre-built Variants                                                 */
/* ------------------------------------------------------------------ */

export function EmptyFindings() {
  const router = useRouter();
  return (
    <EmptyState
      icon={<SearchIcon />}
      title="No findings yet"
      description="Upload a vulnerability scan to see findings appear here. We support Nessus, SARIF, CycloneDX, and more."
      action={{ label: 'Upload a scan', onClick: () => router.push('/upload') }}
    />
  );
}

export function EmptyCases() {
  const router = useRouter();
  return (
    <EmptyState
      icon={<BriefcaseIcon />}
      title="No vulnerability cases"
      description="Cases are automatically created when findings are processed. Upload a scan to get started."
      action={{ label: 'Upload a scan', onClick: () => router.push('/upload') }}
    />
  );
}

export function EmptyScans() {
  const router = useRouter();
  return (
    <EmptyState
      icon={<DocumentIcon />}
      title="No scans uploaded"
      description="Drag and drop a scan file or click below to upload your first vulnerability scan."
      action={{ label: 'Upload a scan', onClick: () => router.push('/upload') }}
    />
  );
}

export function EmptySearch({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={<XCircleIcon />}
      title="No results found"
      description="Try adjusting your search or filter criteria to find what you are looking for."
      action={onClear ? { label: 'Clear filters', onClick: onClear } : undefined}
    />
  );
}
