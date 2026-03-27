"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-gray-200/60 bg-white/90 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/90"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md shadow-primary-600/20">
            CR
          </div>
          <span className={`text-lg font-bold transition-colors ${scrolled ? "text-gray-900 dark:text-white" : "text-white"}`}>
            CVERiskPilot
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className={`text-sm font-medium transition-colors ${
              scrolled
                ? "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className={`text-sm font-medium transition-colors ${
              scrolled
                ? "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className={`text-sm font-medium transition-colors ${
              scrolled
                ? "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Pricing
          </a>
          <Link
            href="/login"
            className={`text-sm font-medium transition-colors ${
              scrolled
                ? "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-lg p-2 transition-colors md:hidden ${
            scrolled
              ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              : "text-gray-300 hover:text-white"
          }`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200/60 bg-white/95 px-4 py-5 backdrop-blur-xl md:hidden dark:border-gray-800/60 dark:bg-gray-950/95">
          <div className="flex flex-col gap-4">
            <a
              href="#features"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
              onClick={() => setMobileOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-gray-600 dark:text-gray-400"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </a>
            <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md shadow-primary-600/20"
            >
              Start Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
