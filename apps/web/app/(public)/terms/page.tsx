import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "CVERiskPilot Terms of Service — terms and conditions governing use of the CVERiskPilot vulnerability management platform.",
  alternates: {
    canonical: "https://cveriskpilot.com/terms",
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Terms of Service
      </h1>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        CVERiskPilot LLC — 100% Veteran Owned Business — San Antonio, TX
      </p>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Our Terms of Service are currently being finalized. If you have any
        questions in the meantime, please contact us at{" "}
        <a
          href="mailto:support@cveriskpilot.com"
          className="text-primary-600 hover:underline"
        >
          support@cveriskpilot.com
        </a>
        .
      </p>

      <p className="text-xs text-gray-500 dark:text-gray-500">
        Last updated: March 2026
      </p>

      <Link
        href="/"
        className="inline-block text-sm text-primary-600 hover:underline"
      >
        &larr; Back to home
      </Link>
    </div>
  );
}
