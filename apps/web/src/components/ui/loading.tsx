'use client';

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
} as const;

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-gray-300 border-t-primary-600 ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface LoadingPageProps {
  text?: string;
}

export function LoadingPage({ text }: LoadingPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}

interface LoadingOverlayProps {
  text?: string;
  className?: string;
}

export function LoadingOverlay({ text, className = '' }: LoadingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/70 backdrop-blur-[1px] ${className}`}
    >
      <LoadingSpinner size="md" />
      {text && <p className="text-sm font-medium text-gray-600">{text}</p>}
    </div>
  );
}
