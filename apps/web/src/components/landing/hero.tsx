'use client';

import Link from "next/link";
import { useState } from "react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-48 h-[500px] w-[500px] rounded-full bg-primary-600/8 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-800/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/5 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            Now processing 8,000+ CVEs per scan
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            Know Which{" "}
            <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              50 CVEs
            </span>{" "}
            Matter This Week
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl sm:leading-relaxed">
            One command. Instant compliance output. No account required.
          </p>

          {/* Zero-to-value: copy-pasteable CLI command */}
          <CopyableCommand />

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 sm:w-auto"
            >
              Start Free
              <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/demo"
              className="inline-flex w-full items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-8 py-4 text-base font-semibold text-primary-300 backdrop-blur-sm transition-all hover:border-primary-400/50 hover:bg-primary-500/20 hover:text-primary-200 sm:w-auto"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
              </svg>
              Live Demo
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-sm text-gray-500">
            No credit card required. Free plan available.
          </p>
        </div>

        {/* Mock Terminal Output — shows what you get when you run the command */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-gray-700/40 bg-gray-900/70 p-1.5 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
            <div className="rounded-xl bg-gray-900 p-4 sm:p-6">
              {/* Title bar */}
              <div className="mb-5 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs font-medium text-gray-500">Terminal</span>
              </div>
              {/* Terminal output */}
              <pre className="overflow-x-auto text-xs leading-relaxed sm:text-sm">
                <code className="text-gray-400">
                  <span className="text-green-400">$</span>{" "}
                  <span className="text-white">npx @cveriskpilot/scan --preset startup</span>
                  {"\n\n"}
                  <span className="text-gray-500">  Scanning dependencies, secrets, IaC...</span>
                  {"\n\n"}
                  <span className="text-white font-semibold">  SCAN RESULTS</span>
                  {"\n"}
                  <span className="text-gray-500">  {"─".repeat(48)}</span>
                  {"\n"}
                  {"  "}
                  <span className="text-red-400 font-bold">CRITICAL  1</span>
                  {"  "}
                  <span className="text-orange-400 font-bold">HIGH  3</span>
                  {"  "}
                  <span className="text-yellow-400 font-bold">MEDIUM  7</span>
                  {"  "}
                  <span className="text-green-400 font-bold">LOW  2</span>
                  {"\n\n"}
                  <span className="text-white font-semibold">  COMPLIANCE IMPACT</span>
                  {"\n"}
                  {"  "}
                  <span className="text-cyan-400">SOC 2</span>
                  <span className="text-gray-500">     3 controls affected</span>
                  {"\n"}
                  {"  "}
                  <span className="text-cyan-400">OWASP ASVS</span>
                  <span className="text-gray-500"> 2 controls affected</span>
                  {"\n\n"}
                  {"  "}
                  <span className="text-red-400 font-bold">EXIT 1</span>
                  <span className="text-gray-500"> — 1 CRITICAL finding(s) detected</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyableCommand() {
  const [copied, setCopied] = useState(false);
  const command = 'npx @cveriskpilot/scan --preset startup';

  function handleCopy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto mt-8 max-w-lg">
      <button
        type="button"
        onClick={handleCopy}
        className="group flex w-full items-center justify-between rounded-xl border border-gray-700/60 bg-gray-900/80 px-5 py-3.5 font-mono text-sm text-gray-300 backdrop-blur-sm transition-all hover:border-primary-500/40 hover:bg-gray-900"
      >
        <span>
          <span className="text-green-400">$</span>{" "}
          <span className="text-white">{command}</span>
        </span>
        <span className="ml-3 shrink-0 rounded-md bg-gray-800 px-2.5 py-1 text-xs text-gray-400 transition-colors group-hover:bg-primary-600/20 group-hover:text-primary-300">
          {copied ? 'Copied!' : 'Copy'}
        </span>
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Zero dependencies. Works offline. Scans deps, secrets, and IaC in seconds.
      </p>
    </div>
  );
}

