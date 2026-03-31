"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Copyable terminal command                                          */
/* ------------------------------------------------------------------ */

function CopyBlock({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group flex w-full items-center justify-between rounded-xl border border-gray-700/60 bg-gray-900/80 px-6 py-4 font-mono text-sm text-gray-300 backdrop-blur-sm transition-all hover:border-primary-500/40 hover:bg-gray-900 sm:text-base ${className ?? ""}`}
    >
      <span className="overflow-x-auto">
        <span className="text-green-400">$</span>{" "}
        <span className="text-white">{command}</span>
      </span>
      <span className="ml-4 shrink-0 rounded-md bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors group-hover:bg-primary-600/20 group-hover:text-primary-300">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Founders spots counter                                             */
/* ------------------------------------------------------------------ */

function useFoundersSpots(): number | null {
  const [spots, setSpots] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/billing/founders-spots")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.remaining != null) setSpots(data.remaining);
      })
      .catch(() => {});
  }, []);

  return spots;
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-16 pb-24 sm:pt-20 sm:pb-32">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 -left-48 h-[500px] w-[500px] rounded-full bg-primary-600/8 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-800/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Product Hunt badge */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-5 py-2 text-sm font-semibold text-orange-300">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 3H8.5C7.67 3 7 3.67 7 4.5V19.5C7 20.33 7.67 21 8.5 21H13.5C17.09 21 20 18.09 20 14.5V9.5C20 5.91 17.09 3 13.5 3ZM13.5 17H10V7H13.5C15.43 7 17 8.57 17 10.5V13.5C17 15.43 15.43 17 13.5 17Z" />
            </svg>
            Product Hunt Launch
          </span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-5xl text-center text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl lg:leading-[1.08]">
          Your scanner found{" "}
          <span className="text-red-400">8,000 CVEs</span>.
          <br />
          We tell you which{" "}
          <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
            50 matter
          </span>
          .
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-8 max-w-3xl text-center text-xl leading-relaxed text-gray-400 sm:text-2xl sm:leading-relaxed">
          AI-powered compliance scanning in{" "}
          <span className="font-semibold text-white">90 seconds</span>. Not{" "}
          <span className="text-gray-500 line-through">40 hours</span> of
          spreadsheets.
        </p>

        {/* CTAs */}
        <div className="mx-auto mt-10 flex max-w-xl flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#get-started"
            className="group inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 sm:w-auto"
          >
            Try it now — no signup
            <svg
              className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
          <Link
            href="/buy"
            className="inline-flex w-full items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-8 py-4 text-lg font-semibold text-primary-300 backdrop-blur-sm transition-all hover:border-primary-400/50 hover:bg-primary-500/20 hover:text-primary-200 sm:w-auto"
          >
            Get API Key
          </Link>
        </div>

        {/* Terminal mockup */}
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="rounded-2xl border border-gray-700/40 bg-gray-900/70 p-1.5 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
            <div className="rounded-xl bg-gray-900 p-5 sm:p-6">
              {/* Window chrome */}
              <div className="mb-5 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs font-medium uppercase tracking-wider text-gray-600">
                  Terminal
                </span>
              </div>

              <pre className="overflow-x-auto text-sm leading-relaxed sm:text-base">
                <code className="text-gray-400">
                  <span className="text-green-400">$</span>{" "}
                  <span className="text-white font-semibold">
                    npx @cveriskpilot/scan --preset startup
                  </span>
                  {"\n\n"}
                  <span className="text-gray-500">
                    {"  "}Scanning dependencies, secrets, IaC...
                  </span>
                  {"\n\n"}
                  <span className="text-white font-bold">{"  "}SCAN RESULTS</span>
                  {"\n"}
                  <span className="text-gray-600">
                    {"  "}{"─".repeat(48)}
                  </span>
                  {"\n"}
                  {"  "}
                  <span className="text-red-400 font-bold">CRITICAL 2</span>
                  {"   "}
                  <span className="text-orange-400 font-bold">HIGH 5</span>
                  {"   "}
                  <span className="text-yellow-400 font-bold">MEDIUM 14</span>
                  {"   "}
                  <span className="text-gray-500 font-bold">LOW 29</span>
                  {"\n\n"}
                  {"  "}
                  <span className="text-white font-bold">
                    COMPLIANCE MAPPING
                  </span>
                  {"\n"}
                  <span className="text-gray-600">
                    {"  "}{"─".repeat(48)}
                  </span>
                  {"\n"}
                  {"  "}
                  <span className="text-red-400">CRITICAL</span>
                  {"  "}
                  <span className="text-white">CVE-2026-1234</span>
                  {"  "}
                  <span className="text-gray-500">Prototype Pollution</span>
                  {"     "}
                  <span className="text-primary-400">NIST SI-2</span>
                  {"\n"}
                  {"  "}
                  <span className="text-red-400">CRITICAL</span>
                  {"  "}
                  <span className="text-white">CWE-798</span>
                  {"      "}
                  <span className="text-gray-500">Hard-Coded Credentials</span>
                  {"  "}
                  <span className="text-primary-400">SOC 2 CC6.1</span>
                  {"\n"}
                  {"  "}
                  <span className="text-orange-400">HIGH    </span>
                  {"  "}
                  <span className="text-white">CWE-79</span>
                  {"       "}
                  <span className="text-gray-500">XSS in user handler</span>
                  {"     "}
                  <span className="text-primary-400">CMMC SI.L2</span>
                  {"\n"}
                  {"  "}
                  <span className="text-orange-400">HIGH    </span>
                  {"  "}
                  <span className="text-white">CVE-2026-5678</span>
                  {"  "}
                  <span className="text-gray-500">SQL Injection in ORM</span>
                  {"    "}
                  <span className="text-primary-400">NIST SI-10</span>
                  {"\n"}
                  {"  "}
                  <span className="text-orange-400">HIGH    </span>
                  {"  "}
                  <span className="text-white">CWE-327</span>
                  {"      "}
                  <span className="text-gray-500">Weak Crypto Algorithm</span>
                  {"   "}
                  <span className="text-primary-400">FedRAMP SC-13</span>
                  {"\n\n"}
                  {"  "}
                  <span className="text-green-400 font-semibold">
                    6 frameworks mapped | 12 controls affected | 3 POAM entries generated
                  </span>
                  {"\n"}
                  {"  "}
                  <span className="text-gray-500">
                    Completed in 47s. Results saved to ./cveriskpilot-report.json
                  </span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Bar                                                          */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "11", label: "scanner formats" },
  { value: "6", label: "compliance frameworks" },
  { value: "135", label: "controls mapped" },
  { value: "< 90s", label: "scan time" },
];

function StatsBar() {
  return (
    <section className="border-y border-gray-800/60 bg-gray-950/80">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 py-10 sm:py-12 lg:grid-cols-4 lg:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-medium uppercase tracking-wider text-gray-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works (3 steps)                                             */
/* ------------------------------------------------------------------ */

const howSteps = [
  {
    num: "1",
    title: "Run the scanner",
    description:
      "Add one line to your CI/CD pipeline. Scans dependencies, secrets, and IaC configs. Works with GitHub Actions, GitLab CI, Jenkins, and any terminal.",
    code: "npx @cveriskpilot/scan --preset startup",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    num: "2",
    title: "AI triages by real risk",
    description:
      "Findings are ranked by EPSS exploit probability and CISA KEV status -- not just CVSS scores. True positives surface immediately; false positives get filtered out.",
    code: null,
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    num: "3",
    title: "Get compliance artifacts",
    description:
      "Every finding maps to NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF controls. POAM entries and remediation plans are generated automatically.",
    code: null,
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function HowItWorks() {
  return (
    <section className="bg-slate-950 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Three steps. Under 90 seconds.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-400 sm:text-xl">
            No accounts, no dashboards, no configuration files. Just a terminal
            command and compliance artifacts.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {howSteps.map((step) => (
            <div
              key={step.num}
              className="relative rounded-2xl border border-gray-800 bg-gray-900/50 p-8 transition-all hover:border-gray-700 hover:bg-gray-900/80"
            >
              {/* Step number */}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400">
                  {step.icon}
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {step.num}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-gray-400">
                {step.description}
              </p>

              {step.code && (
                <div className="mt-5 overflow-x-auto rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 font-mono text-sm text-green-400">
                  <span className="text-gray-600">$ </span>
                  {step.code}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Who It's For                                                       */
/* ------------------------------------------------------------------ */

const audiences = [
  {
    title: "Startups shipping fast",
    description:
      "Need SOC 2 evidence for enterprise sales but can't afford a full compliance team. Get audit-ready artifacts from your existing CI/CD pipeline.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    tag: "SOC 2",
  },
  {
    title: "Defense contractors",
    description:
      "CMMC Level 2 deadline is November 10, 2026. Map your existing scan results to 110 CMMC practices and generate POAMs your C3PAO will accept.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    tag: "CMMC",
  },
  {
    title: "DevSecOps teams",
    description:
      "Drowning in scanner noise? EPSS + KEV triage cuts 8,000 findings down to the 50 that actually matter. AI filters false positives so you fix real risks.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    tag: "DevSecOps",
  },
  {
    title: "MSSPs & consultants",
    description:
      "Manage compliance for multiple clients from a single platform. White-label branding, per-client isolation, and usage-based billing built in.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    tag: "MSSP",
  },
];

function WhoItsFor() {
  return (
    <section className="bg-gray-900/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
            Built For
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Who needs this?
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-400 sm:text-xl">
            If you run vulnerability scans and someone asks &ldquo;which compliance control
            failed?&rdquo; — this is for you.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="group rounded-2xl border border-gray-800 bg-gray-900/60 p-8 transition-all hover:border-gray-700 hover:bg-gray-900"
            >
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 transition-colors group-hover:bg-primary-500/15">
                  {a.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">
                      {a.title}
                    </h3>
                    <span className="rounded-full bg-primary-500/10 px-2.5 py-0.5 text-xs font-semibold text-primary-400">
                      {a.tag}
                    </span>
                  </div>
                  <p className="mt-3 text-base leading-relaxed text-gray-400">
                    {a.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing CTA                                                        */
/* ------------------------------------------------------------------ */

function PricingCta() {
  const spots = useFoundersSpots();

  return (
    <section className="bg-slate-950 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Free CLI. Paid platform.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-400 sm:text-xl">
            CLI scans are free forever — no signup, no limits. The full platform
            starts when you need dashboards, POAM generation, and team workflows.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {/* Free */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8">
            <h3 className="text-lg font-semibold text-white">Free</h3>
            <p className="mt-1 text-sm text-gray-500">
              CLI scans, compliance mapping, no account needed
            </p>
            <div className="mt-6 flex items-baseline">
              <span className="text-5xl font-extrabold text-white">$0</span>
              <span className="ml-2 text-sm text-gray-500">/forever</span>
            </div>
            <ul className="mt-8 space-y-3">
              {[
                "Unlimited local CLI scans",
                "6 compliance frameworks",
                "135 controls mapped",
                "JSON, SARIF, Markdown output",
                "CI/CD exit codes",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="#get-started"
              className="mt-8 block w-full rounded-xl border border-gray-700 py-3 text-center text-sm font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800"
            >
              Get Started Free
            </a>
          </div>

          {/* Founders Beta */}
          <div className="relative rounded-2xl border border-primary-500/40 bg-gray-900/80 p-8 ring-1 ring-primary-500/20 shadow-xl shadow-primary-900/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
              Best Value
            </div>
            <h3 className="text-lg font-semibold text-white">Founders Beta</h3>
            <p className="mt-1 text-sm text-gray-500">
              Everything in Pro — locked at early adopter pricing
            </p>
            {spots !== null && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-900/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-600" />
                </span>
                {spots} spots remaining
              </span>
            )}
            <div className="mt-6 flex items-baseline">
              <span className="text-5xl font-extrabold text-white">$29</span>
              <span className="ml-2 text-sm text-gray-500">/month</span>
            </div>
            <p className="mt-1 text-xs text-primary-400">
              Price locked forever. No increases.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Everything in Pro",
                "5 users, 250 assets",
                "Unlimited uploads",
                "250 AI triage calls/month",
                "Email support",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/buy"
              className="mt-8 block w-full rounded-xl bg-primary-600 py-3 text-center text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
            >
              Lock In $29/mo Forever
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8">
            <h3 className="text-lg font-semibold text-white">Pro</h3>
            <p className="mt-1 text-sm text-gray-500">
              Full compliance automation for teams
            </p>
            <div className="mt-6 flex items-baseline">
              <span className="text-5xl font-extrabold text-white">$149</span>
              <span className="ml-2 text-sm text-gray-500">/month</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              or start a 14-day free trial
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "10 users, 1,000 assets",
                "Unlimited uploads & PR comments",
                "1,000 AI triage calls/month",
                "POAM auto-generation",
                "Jira & ServiceNow sync",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/buy"
              className="mt-8 block w-full rounded-xl border border-gray-700 py-3 text-center text-sm font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800"
            >
              Start 14-Day Trial
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Need Enterprise or MSSP? <Link href="/buy" className="text-primary-400 underline hover:text-primary-300">See all plans</Link> or{" "}
          <a href="mailto:sales@cveriskpilot.com" className="text-primary-400 underline hover:text-primary-300">
            talk to sales
          </a>
          .
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Trust Signals                                                      */
/* ------------------------------------------------------------------ */

const frameworks = [
  "NIST 800-53",
  "SOC 2",
  "CMMC",
  "FedRAMP",
  "ASVS",
  "SSDF",
];

function TrustSignals() {
  return (
    <section className="border-y border-gray-800/60 bg-gray-900/30 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Business trust */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-base text-gray-400">
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            100% Veteran Owned
          </span>
          <span className="hidden text-gray-700 sm:inline">|</span>
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            SDVOSB Eligible
          </span>
          <span className="hidden text-gray-700 sm:inline">|</span>
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            Built in Texas
          </span>
        </div>

        {/* Frameworks */}
        <div className="mt-10">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Supported Compliance Frameworks
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            {frameworks.map((fw) => (
              <span
                key={fw}
                className="rounded-lg border border-gray-800 bg-gray-900/60 px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:border-primary-500/30 hover:text-primary-300"
              >
                {fw}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 py-20 sm:py-28"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Run your first scan in 90 seconds
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-primary-100 sm:text-xl">
            No signup. No configuration. No credit card. Just paste this into
            your terminal.
          </p>

          {/* Copyable command */}
          <div className="mx-auto mt-10 max-w-2xl">
            <CopyBlock command="npx @cveriskpilot/scan@latest --preset startup" />
            <p className="mt-3 text-sm text-primary-200/70">
              Scans dependencies, secrets, and IaC configs. Maps findings to 6
              compliance frameworks. Outputs JSON, SARIF, or Markdown.
            </p>
          </div>

          {/* CTA button */}
          <div className="mt-10">
            <Link
              href="/buy"
              className="group inline-flex items-center justify-center rounded-xl bg-white px-10 py-4 text-lg font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
            >
              Get API Key
              <svg
                className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-primary-200/80">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Free forever for CLI
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Veteran Owned
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function LaunchPageClient() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <HowItWorks />
      <WhoItsFor />
      <PricingCta />
      <TrustSignals />
      <FinalCta />
    </>
  );
}
