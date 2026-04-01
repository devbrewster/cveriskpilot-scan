import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Buy | CVERiskPilot",
  description:
    "Get your CVERiskPilot API key. Free, Founders Beta ($29/mo), or Pro ($149/mo) plans for AI-powered compliance scanning.",
  robots: { index: false, follow: false },
};

export default function BuyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10 sm:px-6 dark:bg-gray-950">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
          CR
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          CVERiskPilot
        </span>
      </Link>

      <div className="w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}
