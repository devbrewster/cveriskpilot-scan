import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/landing/nav-bar";
import { Footer } from "@/components/landing/footer";
import { Soc2ReadinessForm } from "./soc2-readiness-form";

export const metadata: Metadata = {
  title:
    "Free SOC 2 Readiness Report | SOC 2 Gap Analysis Tool | CVERiskPilot",
  description:
    "Upload a vulnerability scan and get a free SOC 2 gap analysis PDF. See which Trust Service Criteria are affected, severity breakdown, and prioritized remediation steps. No signup required — just your email.",
  keywords: [
    "SOC 2 readiness",
    "SOC 2 gap analysis",
    "SOC 2 compliance checker",
    "Trust Service Criteria",
    "SOC 2 Type II",
    "SOC 2 audit readiness",
    "SOC 2 vulnerability assessment",
    "SOC 2 compliance tool",
    "free SOC 2 assessment",
    "SOC 2 controls mapping",
  ],
  alternates: {
    canonical: "https://cveriskpilot.com/soc2",
  },
  openGraph: {
    title: "Free SOC 2 Readiness Report | CVERiskPilot",
    description:
      "Upload a scan, get a free SOC 2 gap analysis PDF. See which Trust Service Criteria are affected and what to fix first.",
    images: [
      {
        url: "/graphics/og-veteran-owned.svg",
        width: 1200,
        height: 675,
        alt: "CVERiskPilot SOC 2 Readiness Report",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free SOC 2 Readiness Report | CVERiskPilot",
    description:
      "Upload a scan, get a free SOC 2 gap analysis. See which Trust Service Criteria are affected.",
    images: ["/graphics/og-veteran-owned.svg"],
    creator: "@cveriskpilot",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const whatYouGet = [
  {
    title: "Trust Service Criteria Gap Matrix",
    description:
      "Every finding mapped to SOC 2 Trust Service Criteria — CC6 (Access), CC7 (Operations), CC8 (Change Management), and more. See exactly which controls are affected.",
  },
  {
    title: "Severity Breakdown by Control",
    description:
      "Understand which criteria have critical vs. low-severity gaps. Prioritize remediation by actual risk to your SOC 2 posture.",
  },
  {
    title: "Remediation Priority Matrix",
    description:
      "AI-ranked remediation steps ordered by compliance impact. Fix what matters most for your auditor first.",
  },
  {
    title: "Auditor-Ready PDF Report",
    description:
      "Download a branded PDF you can hand to your auditor or share with leadership. Executive summary, gap matrix, and action items included.",
  },
  {
    title: "CWE-to-Control Mapping",
    description:
      "Every CWE from your scan data mapped through NIST 800-53 to the corresponding SOC 2 criteria. Full traceability from finding to control.",
  },
];

const steps = [
  {
    num: "1",
    title: "Enter your email",
    description:
      "We send the PDF report to your inbox. No account needed, no credit card required.",
  },
  {
    num: "2",
    title: "Paste or upload scan data",
    description:
      "Paste JSON output from the CVERiskPilot CLI, or upload findings from any of our 11 supported scanner formats.",
  },
  {
    num: "3",
    title: "Get your gap analysis",
    description:
      "We map your findings to SOC 2 Trust Service Criteria and generate a branded PDF report with severity breakdown and remediation priorities.",
  },
];

const trustStats = [
  { value: "52", label: "SOC 2 Controls Assessed" },
  { value: "13", label: "Compliance Frameworks" },
  { value: "11", label: "Scanner Formats Supported" },
  { value: "Free", label: "No Credit Card Required" },
];

/* ------------------------------------------------------------------ */
/*  JSON-LD                                                            */
/* ------------------------------------------------------------------ */

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CVERiskPilot SOC 2 Readiness Report",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  description:
    "Free SOC 2 gap analysis tool. Upload vulnerability scan data and get an auditor-ready PDF report showing which Trust Service Criteria are affected.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  creator: {
    "@type": "Organization",
    name: "CVERiskPilot LLC",
    url: "https://cveriskpilot.com",
  },
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function Soc2Page() {
  return (
    <div className="dark">
      <NavBar />
      <main>
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* -- Hero ------------------------------------------------- */}
        <section className="relative overflow-hidden bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
          {/* Background grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 -left-48 h-125 w-125 rounded-full bg-blue-600/8 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-100 w-100 rounded-full bg-blue-800/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-4 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300">
                Free Tool -- No Account Required
              </p>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Is Your SaaS{" "}
                <span className="text-blue-400">SOC 2 Ready?</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl sm:leading-relaxed">
                Upload your vulnerability scan data and get a{" "}
                <span className="font-semibold text-white">
                  free SOC 2 gap analysis PDF
                </span>
                . See which Trust Service Criteria are affected, severity
                breakdown, and what to fix first.
              </p>

              {/* Stats bar */}
              <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
                {trustStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-gray-800 bg-gray-900/50 p-4"
                  >
                    <div className="text-2xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a
                  href="#get-report"
                  className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30"
                >
                  Get Your Free Report
                </a>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-8 py-4 text-base font-semibold text-primary-300 transition-all hover:border-primary-400/50 hover:bg-primary-500/20"
                >
                  See Full Platform Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -- How It Works ----------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                3 Simple Steps
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How it works
              </h2>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-3">
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

        {/* -- What You Get ----------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Your Report Includes
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

        {/* -- Email-Gated Report Form ------------------------------ */}
        <section
          id="get-report"
          className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Free Assessment
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Get your SOC 2 readiness report
              </h2>
              <p className="mt-4 text-gray-400">
                Enter your email and paste your scan data below. We will map
                every finding to SOC 2 Trust Service Criteria and generate a
                downloadable PDF.
              </p>
            </div>

            <div className="mt-12">
              <Soc2ReadinessForm />
            </div>
          </div>
        </section>

        {/* -- Trust Signals ---------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-950 py-16">
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
                  13 Compliance Frameworks
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
                  Free Forever
                </span>
              </div>
              <p className="max-w-xl text-gray-400">
                Built by veterans who understand compliance. CVERiskPilot maps
                vulnerability findings to the compliance controls that matter --
                so you can focus on what moves the needle.
              </p>
            </div>
          </div>
        </section>

        {/* -- Final CTA -------------------------------------------- */}
        <section className="relative overflow-hidden bg-linear-to-br from-primary-700 via-primary-800 to-primary-950 py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to track remediation and close gaps?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-primary-100">
                The free report shows you where you stand. CVERiskPilot Pro
                helps you fix it -- with AI triage, team workflows, POAM
                generation, and real-time compliance scores.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/pricing"
                  className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
                >
                  See Plans
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
                <span>14-Day Free Trial</span>
                <span>No Credit Card Required</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
