import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
