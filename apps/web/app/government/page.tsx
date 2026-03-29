import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/landing/nav-bar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "CVERiskPilot for Government | SDVOSB Veteran-Owned",
  description:
    "Vulnerability management built by veterans for government security teams. SDVOSB certified, FedRAMP POAM generation, NIST 800-53 mapping, CMMC Level 2 compliance. Simplified procurement for DoD and federal agencies.",
  openGraph: {
    title: "CVERiskPilot for Government | SDVOSB Veteran-Owned",
    description:
      "Vulnerability management built by veterans for government security teams. SDVOSB certified, NIST 800-53, CMMC, FISMA compliance.",
    images: ["/graphics/og-veteran-owned.svg"],
  },
};

/* ------------------------------------------------------------------ */
/*  Trust badge data                                                  */
/* ------------------------------------------------------------------ */

const trustBadges = [
  {
    label: "100% Veteran Owned",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    label: "SDVOSB Eligible",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    label: "Texas LLC",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    label: "Made in USA",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Compliance capabilities                                           */
/* ------------------------------------------------------------------ */

const complianceCapabilities = [
  {
    title: "FedRAMP POAM Generation",
    description:
      "Automatically generate Plans of Action and Milestones from scan findings. Map vulnerabilities to FedRAMP control families with correct formatting for ATO packages.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "CMMC Level 2 Mapping",
    description:
      "Map findings to CMMC Level 2 practices. Track maturity across all 14 domains with evidence collection for assessment readiness.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "NIST 800-53 Controls",
    description:
      "Full NIST SP 800-53 Rev 5 control mapping. Link vulnerabilities to specific control families (RA, SI, CA, CM) with automated evidence generation.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "FISMA Compliance Tracking",
    description:
      "Continuous monitoring dashboards aligned to FISMA requirements. Track remediation timelines against OMB-mandated SLAs with automated escalation.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Procurement advantages                                            */
/* ------------------------------------------------------------------ */

const procurementAdvantages = [
  {
    title: "SDVOSB Set-Aside Eligibility",
    description:
      "As a Service-Disabled Veteran-Owned Small Business, CVERiskPilot qualifies for SDVOSB set-aside and sole-source contracts under FAR 19.14, streamlining your acquisition process.",
  },
  {
    title: "GSA Schedule Compatible",
    description:
      "Pricing and licensing structured for GSA Schedule compatibility. Standard government terms, no surprise fees, and volume pricing aligned with BPA and IDIQ vehicles.",
  },
  {
    title: "Simplified Procurement",
    description:
      "Transparent per-seat pricing under the micro-purchase and simplified acquisition thresholds. No complex enterprise license negotiations required to get started.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function GovernmentPage() {
  return (
    <div className="dark">
      <NavBar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
          {/* Background grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 -left-48 h-[500px] w-[500px] rounded-full bg-primary-600/8 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-[400px] w-[400px] rounded-full bg-primary-800/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-300 backdrop-blur-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                100% Veteran-Owned Small Business
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.1]">
                Built by{" "}
                <span className="bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
                  Veterans
                </span>
                , for Government Security Teams
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl sm:leading-relaxed">
                CVERiskPilot delivers enterprise vulnerability management purpose-built
                for federal, DoD, and state agencies. SDVOSB-eligible procurement,
                native POAM generation, and full NIST/CMMC/FISMA compliance mapping
                -- from a company that understands the mission.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:gov@cveriskpilot.com?subject=FedGov%20Demo%20Request"
                  className="group inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30 sm:w-auto"
                >
                  Schedule a FedGov Demo
                  <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
                <Link
                  href="/#features"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-8 py-4 text-base font-semibold text-primary-300 backdrop-blur-sm transition-all hover:border-primary-400/50 hover:bg-primary-500/20 hover:text-primary-200 sm:w-auto"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  View Compliance Capabilities
                </Link>
              </div>

              {/* Trust line */}
              <p className="mt-6 text-sm text-gray-500">
                CVERiskPilot LLC -- San Antonio, TX -- SDVOSB Eligible
              </p>
            </div>
          </div>
        </section>

        {/* ── Trust Badges ─────────────────────────────────────── */}
        <section className="border-y border-gray-800 bg-gray-950 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {trustBadges.map((badge) => (
                <div
                  key={badge.label}
                  className="flex flex-col items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-center"
                >
                  <div className="inline-flex rounded-lg bg-primary-500/10 p-3 text-primary-400">
                    {badge.icon}
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compliance Capabilities ──────────────────────────── */}
        <section className="bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Compliance
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Native federal compliance support
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-400">
                Purpose-built for the frameworks your agency already uses.
                Automated evidence collection, not checkbox theater.
              </p>
            </div>

            {/* Capabilities grid */}
            <div className="mt-16 grid gap-6 sm:grid-cols-2">
              {complianceCapabilities.map((cap) => (
                <div
                  key={cap.title}
                  className="group relative rounded-2xl border border-gray-800 bg-gray-900 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-800 hover:shadow-lg hover:shadow-primary-900/20"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-primary-500/10 p-3 text-primary-400 transition-colors group-hover:bg-primary-500/15">
                    {cap.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {cap.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {cap.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Procurement Advantages ───────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Procurement
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Simplified government acquisition
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-400">
                Veteran-owned status and transparent pricing designed to reduce
                procurement friction for contracting officers.
              </p>
            </div>

            {/* Advantages */}
            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {procurementAdvantages.map((adv, i) => (
                <div key={adv.title} className="relative">
                  {/* Number badge */}
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {adv.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {adv.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Government Pricing ───────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Pricing
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Transparent, government-friendly pricing
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-400">
                No hidden fees, no surprise costs. Volume discounts available
                for agency-wide deployments.
              </p>
            </div>

            {/* Pricing cards */}
            <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
              {/* Pro */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 transition-shadow hover:shadow-md hover:shadow-gray-900/30">
                <h3 className="text-lg font-semibold text-white">Pro</h3>
                <p className="mt-1 text-sm text-gray-400">
                  For individual security teams and small agencies.
                </p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tabular-nums text-white">$49</span>
                  <span className="ml-1 text-sm text-gray-400">/month</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {[
                    "10 users",
                    "Unlimited uploads",
                    "500 AI remediation calls",
                    "POAM generation",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup?plan=pro"
                  className="mt-8 block w-full rounded-xl border border-gray-700 py-3 text-center text-sm font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800"
                >
                  Get Started
                </Link>
              </div>

              {/* Enterprise -- highlighted */}
              <div className="relative rounded-2xl border border-primary-500 bg-gray-900 p-8 shadow-xl shadow-primary-900/20 ring-1 ring-primary-500">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                  Recommended for Gov
                </div>
                <h3 className="text-lg font-semibold text-white">Enterprise</h3>
                <p className="mt-1 text-sm text-gray-400">
                  For agencies with advanced compliance and SSO needs.
                </p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tabular-nums text-white">$199</span>
                  <span className="ml-1 text-sm text-gray-400">/month</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {[
                    "50 users",
                    "Unlimited uploads",
                    "5,000 AI remediation calls",
                    "SSO / SAML / SCIM",
                    "NIST 800-53 mapping",
                    "CMMC Level 2 tracking",
                    "POAM + FISMA reports",
                    "Dedicated support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:gov@cveriskpilot.com?subject=Enterprise%20Gov%20Plan"
                  className="mt-8 block w-full rounded-xl bg-primary-600 py-3 text-center text-sm font-semibold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
                >
                  Contact Gov Sales
                </a>
              </div>

              {/* MSSP / Agency-Wide */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 transition-shadow hover:shadow-md hover:shadow-gray-900/30">
                <h3 className="text-lg font-semibold text-white">Agency-Wide</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Multi-division deployment with centralized management.
                </p>
                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tabular-nums text-white">Custom</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Volume pricing available</p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Unlimited users",
                    "Unlimited everything",
                    "White-label option",
                    "Per-division scoping",
                    "Custom integrations",
                    "Dedicated account manager",
                    "On-premise available",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:gov@cveriskpilot.com?subject=Agency-Wide%20Plan"
                  className="mt-8 block w-full rounded-xl border border-gray-700 py-3 text-center text-sm font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800"
                >
                  Contact Gov Sales
                </a>
              </div>
            </div>

            {/* Volume note */}
            <p className="mx-auto mt-8 max-w-xl text-center text-sm text-gray-500">
              Annual billing and multi-year agreements available. All plans include
              20% annual discount. GSA Schedule-compatible pricing structure.
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 py-20 sm:py-28">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to modernize your agency&apos;s vulnerability management?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-primary-100">
                Schedule a tailored demo for your team. We speak NIST, FISMA, and
                CMMC -- because we&apos;ve lived the mission.
              </p>

              {/* CTA Buttons */}
              <div className="mx-auto mt-10 flex max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
                <a
                  href="mailto:gov@cveriskpilot.com?subject=FedGov%20Demo%20Request"
                  className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
                >
                  Schedule a FedGov Demo
                  <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-xl border border-white/25 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
                >
                  Try the Live Demo
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-primary-200/80">
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  Veteran Owned
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  SDVOSB Eligible
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  FedRAMP POAM Ready
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                  </svg>
                  Made in USA
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
