import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/landing/nav-bar";
import { Footer } from "@/components/landing/footer";
import { CmmcCountdown } from "@/components/landing/cmmc-countdown";
import { SprsCalculator } from "@/components/cmmc/sprs-calculator";

export const metadata: Metadata = {
  title:
    "CMMC Compliance Scanner | CMMC Self-Assessment Tool | CVERiskPilot",
  description:
    "Map your pipeline to all 110 NIST 800-171 practices in 90 seconds. CMMC Level 2 deadline is November 10, 2026. SPRS score calculation, gap analysis, POAM generation, and audit evidence export.",
  keywords: [
    "CMMC compliance scanner",
    "CMMC self-assessment tool",
    "CMMC Level 2 deadline",
    "NIST 800-171",
    "SPRS score calculator",
    "CMMC POAM generation",
    "CMMC gap analysis",
    "defense contractor compliance",
    "CMMC Level 2 requirements",
    "CMMC certification",
  ],
  alternates: {
    canonical: "https://cveriskpilot.com/cmmc",
  },
  openGraph: {
    title: "CMMC Compliance Scanner | CVERiskPilot",
    description:
      "Map your pipeline to 110 NIST 800-171 practices in 90 seconds. CMMC Level 2 deadline: November 10, 2026.",
    images: [
      {
        url: "/graphics/og-veteran-owned.svg",
        width: 1200,
        height: 675,
        alt: "CVERiskPilot CMMC Compliance Scanner",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CMMC Compliance Scanner | CVERiskPilot",
    description:
      "Map your pipeline to 110 NIST 800-171 practices in 90 seconds. CMMC Level 2 deadline: Nov 10, 2026.",
    images: ["/graphics/og-veteran-owned.svg"],
    creator: "@cveriskpilot",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const whatYouGet = [
  {
    title: "All 110 CMMC Level 2 Practices Mapped",
    description:
      "Every NIST SP 800-171 Rev 2 practice automatically mapped from your scan findings. No spreadsheets, no guesswork.",
  },
  {
    title: "SPRS Score Calculation",
    description:
      "Instant Supplier Performance Risk System score from -203 to 110. Know exactly where you stand before your C3PAO assessment.",
  },
  {
    title: "Gap Analysis with Remediation Priorities",
    description:
      "AI-prioritized remediation roadmap ranked by risk impact. Focus on what moves the needle for your SPRS score first.",
  },
  {
    title: "POAM Auto-Generation",
    description:
      "FedRAMP Appendix A-format Plans of Action and Milestones generated automatically. Accepted by C3PAOs and DIBCAC assessors.",
  },
  {
    title: "Audit Evidence Export",
    description:
      "One-click PDF and CSV export of assessment results, control mappings, and remediation status for your assessment package.",
  },
];

const steps = [
  {
    num: "1",
    title: "Run the scanner",
    description:
      "Point the CLI at your codebase, infrastructure configs, or import existing scan results from Nessus, Qualys, or any of 11 supported formats.",
  },
  {
    num: "2",
    title: "AI maps findings to NIST 800-171",
    description:
      "Claude-powered triage automatically maps every finding to the relevant NIST 800-171 practices across all 14 control families.",
  },
  {
    num: "3",
    title: "Generate your SPRS score and POAMs",
    description:
      "Get your calculated SPRS score, see exactly which practices are met, partially met, or not met, and generate compliant POAMs.",
  },
  {
    num: "4",
    title: "Track remediation in the dashboard",
    description:
      "Assign findings to team members, set SLA deadlines, track remediation progress, and watch your SPRS score improve in real-time.",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Initial assessment to see where you stand.",
    features: [
      "CLI scanning",
      "Basic NIST 800-171 mapping",
      "SPRS score estimate",
      "Terminal output",
    ],
    cta: "Run Free Scan",
    ctaHref: "#get-started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$149",
    period: "/mo",
    description: "Full compliance workflow for defense contractors.",
    features: [
      "Full dashboard access",
      "All 110 practices tracked",
      "POAM generation",
      "Gap analysis + priorities",
      "Jira / ServiceNow sync",
      "PDF + CSV evidence export",
      "10 users included",
    ],
    cta: "Get Started",
    ctaHref: "/buy",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large defense primes and multi-division orgs.",
    features: [
      "Unlimited users + assets",
      "SSO / SAML / SCIM",
      "Custom integrations",
      "Dedicated account manager",
      "Multi-division scoping",
      "On-premise available",
      "Priority SLA support",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:gov@cveriskpilot.com?subject=CMMC%20Enterprise%20Plan",
    highlighted: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CmmcPage() {
  return (
    <div className="dark">
      <NavBar />
      <main>
        {/* ── Hero + Countdown ─────────────────────────────────── */}
        <section className="relative overflow-hidden bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
          {/* Background grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 -left-48 h-125 w-125 rounded-full bg-amber-600/8 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-100 w-100 rounded-full bg-amber-800/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                CMMC Level 2 Deadline:{" "}
                <span className="text-amber-400">November 10, 2026</span>
              </h1>

              <div className="mt-10">
                <CmmcCountdown
                  targetDate="2026-11-10T00:00:00-05:00"
                  label="CMMC Level 2 Phase 2 Deadline"
                />
              </div>

              <p className="mx-auto mt-10 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl sm:leading-relaxed">
                Map your entire pipeline to{" "}
                <span className="font-semibold text-white">
                  110 NIST 800-171 practices
                </span>{" "}
                in 90 seconds. Know your SPRS score before your C3PAO does.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/buy"
                  className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30"
                >
                  Get Started
                </Link>
                <Link
                  href="/government"
                  className="inline-flex items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-8 py-4 text-base font-semibold text-primary-300 transition-all hover:border-primary-400/50 hover:bg-primary-500/20"
                >
                  Government Page
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── What You Get ─────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Capabilities
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                What you get
              </h2>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {whatYouGet.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-gray-800 bg-gray-900 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-800 hover:shadow-lg hover:shadow-primary-900/20"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-primary-500/10 p-3 text-primary-400">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Process
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How it works for defense contractors
              </h2>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.num} className="relative">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SPRS Score Calculator ─────────────────────────────── */}
        <SprsCalculator />

        {/* ── Pricing ──────────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Pricing
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Plans for every stage of CMMC readiness
              </h2>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-2xl border p-8 transition-shadow hover:shadow-md ${
                    tier.highlighted
                      ? "border-primary-500 bg-gray-900 shadow-xl shadow-primary-900/20 ring-1 ring-primary-500"
                      : "border-gray-800 bg-gray-900 hover:shadow-gray-900/30"
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-white">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {tier.description}
                  </p>
                  <div className="mt-6 flex items-baseline">
                    <span className="text-4xl font-extrabold tabular-nums text-white">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="ml-1 text-sm text-gray-400">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <ul className="mt-8 space-y-3">
                    {tier.features.map((f) => (
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
                  {tier.ctaHref.startsWith("mailto:") ? (
                    <a
                      href={tier.ctaHref}
                      className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                        tier.highlighted
                          ? "bg-primary-600 text-white shadow-md shadow-primary-600/20 hover:bg-primary-500"
                          : "border border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                      }`}
                    >
                      {tier.cta}
                    </a>
                  ) : (
                    <Link
                      href={tier.ctaHref}
                      className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                        tier.highlighted
                          ? "bg-primary-600 text-white shadow-md shadow-primary-600/20 hover:bg-primary-500"
                          : "border border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust Signals ────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-8 text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                <span className="flex items-center gap-2 text-lg font-semibold text-white">
                  <svg
                    className="h-5 w-5 text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                  100% Veteran Owned
                </span>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-2 text-lg font-semibold text-white">
                  <svg
                    className="h-5 w-5 text-primary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                  SDVOSB Eligible
                </span>
              </div>
              <p className="max-w-xl text-gray-400">
                Built by veterans who understand DoD compliance. We have lived
                the mission -- now we build the tools to make it easier.
              </p>
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section
          id="get-started"
          className="relative overflow-hidden bg-linear-to-br from-primary-700 via-primary-800 to-primary-950 py-20 sm:py-28"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Start your CMMC self-assessment now
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-primary-100">
                Run the scanner, get your SPRS score, and generate POAMs -- all
                before your next cup of coffee.
              </p>

              {/* Terminal command */}
              <div className="mx-auto mt-8 max-w-lg">
                <pre className="overflow-x-auto rounded-xl border border-white/20 bg-black/30 px-5 py-4 text-left text-sm text-green-400 backdrop-blur-sm">
                  <code>npx @cveriskpilot/scan --preset defense</code>
                </pre>
              </div>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/buy"
                  className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
                >
                  Get Started
                  <svg
                    className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-xl border border-white/25 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
                >
                  Try the Live Demo
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-primary-200/80">
                <span>100% Veteran Owned</span>
                <span>SDVOSB Eligible</span>
                <span>FedRAMP POAM Ready</span>
                <span>Made in USA</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
