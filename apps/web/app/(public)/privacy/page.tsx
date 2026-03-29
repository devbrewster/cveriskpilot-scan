import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "CVERiskPilot Privacy Policy — how we collect, use, and protect your data. GDPR and SOC 2 compliant.",
  alternates: {
    canonical: "https://cveriskpilot.com/privacy",
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Privacy Policy
      </h1>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        CVERiskPilot LLC — 100% Veteran Owned Business — San Antonio, TX
      </p>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Our full Privacy Policy is currently being finalized. If you have any
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
