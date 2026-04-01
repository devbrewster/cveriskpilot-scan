import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/landing/nav-bar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title:
    "HIPAA Compliance Tool | Healthcare Vulnerability Management | CVERiskPilot",
  description:
    "Map vulnerabilities to HIPAA Security Rule safeguards automatically. PHI/ePHI risk assessment, breach readiness, audit evidence export. Cover all 54 implementation specifications across Administrative, Physical, and Technical safeguards.",
  keywords: [
    "HIPAA compliance tool",
    "HIPAA security rule scanner",
    "healthcare vulnerability management",
    "PHI risk assessment",
    "ePHI protection",
    "HIPAA gap analysis",
    "HIPAA audit evidence",
    "HIPAA technical safeguards",
    "healthcare cybersecurity",
    "HIPAA breach notification",
    "covered entity compliance",
    "business associate compliance",
    "HIPAA security officer",
    "OCR audit readiness",
  ],
  alternates: {
    canonical: "https://cveriskpilot.com/hipaa",
  },
  openGraph: {
    title: "HIPAA Compliance Tool | CVERiskPilot",
    description:
      "Map vulnerabilities to HIPAA Security Rule safeguards automatically. PHI/ePHI risk assessment and audit evidence for healthcare organizations.",
    images: [
      {
        url: "/graphics/og-veteran-owned.svg",
        width: 1200,
        height: 675,
        alt: "CVERiskPilot HIPAA Compliance Tool",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HIPAA Compliance Tool | CVERiskPilot",
    description:
      "Map vulnerabilities to HIPAA Security Rule safeguards. PHI/ePHI risk assessment and audit evidence for healthcare orgs.",
    images: ["/graphics/og-veteran-owned.svg"],
    creator: "@cveriskpilot",
  },
  other: {
    "script:ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What HIPAA safeguards does CVERiskPilot cover?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CVERiskPilot maps vulnerability findings to all three categories of HIPAA Security Rule safeguards: Administrative (164.308), Physical (164.310), and Technical (164.312). This includes all 54 implementation specifications across access control, audit controls, integrity, transmission security, and more.",
          },
        },
        {
          "@type": "Question",
          name: "How does CVERiskPilot help with HIPAA risk assessments?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CVERiskPilot automates the technical risk assessment required by 164.308(a)(1)(ii)(A). It ingests scan data from 11 scanner formats, enriches findings with EPSS exploit probability and KEV status, maps each finding to the HIPAA safeguards it threatens, and generates audit-ready risk documentation.",
          },
        },
        {
          "@type": "Question",
          name: "Is CVERiskPilot a replacement for a HIPAA compliance platform?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CVERiskPilot is not a GRC checklist tool. It is the intelligence layer between your vulnerability scanners and your compliance program. It connects every technical finding to its HIPAA compliance impact so your security team and auditors speak the same language.",
          },
        },
        {
          "@type": "Question",
          name: "Can CVERiskPilot help prepare for an OCR audit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. CVERiskPilot generates audit evidence packages including risk assessments, remediation timelines, POAM documents, and AI-generated justifications that explain risk in compliance language. This documentation directly supports the evidence OCR auditors request during investigations.",
          },
        },
        {
          "@type": "Question",
          name: "Does CVERiskPilot support Business Associates as well as Covered Entities?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Both Covered Entities and Business Associates are subject to the HIPAA Security Rule. CVERiskPilot helps any organization that handles PHI/ePHI assess their technical security posture against HIPAA requirements and generate evidence of compliance.",
          },
        },
        {
          "@type": "Question",
          name: "How much does HIPAA compliance with CVERiskPilot cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The CLI scanner is free. The Pro plan at $149/month includes full HIPAA safeguard mapping, AI-powered triage, POAM generation, and audit evidence export. This is a fraction of the cost of HIPAA compliance consultants, which typically charge $5,000-$50,000 for a single risk assessment.",
          },
        },
      ],
    }),
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const challenges = [
  {
    stat: "$10.93M",
    label: "Average healthcare data breach cost",
    source: "IBM Cost of a Data Breach 2023",
  },
  {
    stat: "725+",
    label: "Major breaches reported to OCR in 2023",
    source: "HHS Breach Portal",
  },
  {
    stat: "$2.4M",
    label: "Average OCR settlement for Security Rule violations",
    source: "HHS Enforcement Actions",
  },
  {
    stat: "54",
    label: "Implementation specifications in the Security Rule",
    source: "45 CFR Part 164",
  },
];

const capabilities = [
  {
    title: "PHI/ePHI Risk Assessment",
    description:
      "Automated technical risk analysis required by 164.308(a)(1). Ingest scans from 11 formats, enrich with exploit intelligence, and map every finding to the HIPAA safeguards it threatens.",
  },
  {
    title: "Administrative Safeguard Mapping",
    description:
      "Map findings to 164.308 controls: security management process, workforce security, information access management, security awareness training, and contingency planning.",
  },
  {
    title: "Technical Safeguard Coverage",
    description:
      "Full mapping to 164.312 controls: access control, audit controls, integrity, person or entity authentication, and transmission security for ePHI in transit and at rest.",
  },
  {
    title: "AI-Powered Risk Narratives",
    description:
      "Claude-generated risk statements that explain vulnerability impact in compliance language. Auditor-ready justifications for risk acceptance, compensating controls, and remediation decisions.",
  },
  {
    title: "Breach Notification Readiness",
    description:
      "Identify which vulnerabilities could lead to a reportable breach under 164.404. Prioritize remediation of findings that expose unsecured PHI to reduce notification obligations.",
  },
  {
    title: "Audit Evidence Export",
    description:
      "One-click PDF and CSV export of risk assessments, control mappings, remediation timelines, and POAM documents. Evidence packages formatted for OCR audit response.",
  },
];

const steps = [
  {
    num: "1",
    title: "Scan your environment",
    description:
      "Run the CLI scanner against your infrastructure or import existing results from Nessus, Qualys, CrowdStrike, or any of 11 supported scanner formats.",
  },
  {
    num: "2",
    title: "AI maps findings to HIPAA safeguards",
    description:
      "Every vulnerability is automatically mapped to the relevant HIPAA Security Rule safeguards -- Administrative (164.308), Physical (164.310), and Technical (164.312).",
  },
  {
    num: "3",
    title: "Generate risk assessment documentation",
    description:
      "Get a compliance posture score per safeguard category, AI-generated risk narratives, and POAM documents that satisfy the risk analysis requirement of 164.308(a)(1).",
  },
  {
    num: "4",
    title: "Track remediation and export evidence",
    description:
      "Assign findings to team members, set SLA deadlines, track remediation progress, and export audit-ready evidence packages for OCR investigations.",
  },
];

const frameworks = [
  "HIPAA Security Rule",
  "NIST 800-53",
  "NIST CSF 2.0",
  "SOC 2",
  "PCI DSS",
  "ISO 27001",
  "FedRAMP",
  "CMMC",
  "GDPR",
  "ASVS",
  "SSDF",
  "EU CRA",
  "NIS2",
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Initial security posture assessment.",
    features: [
      "CLI scanning",
      "Basic HIPAA safeguard mapping",
      "Terminal output",
      "50 assets",
    ],
    cta: "Run Free Scan",
    ctaHref: "#get-started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$149",
    period: "/mo",
    description: "Full HIPAA compliance workflow for healthcare orgs.",
    features: [
      "Full dashboard access",
      "All HIPAA safeguard mapping",
      "AI-powered risk narratives",
      "POAM generation",
      "Breach readiness scoring",
      "PDF + CSV evidence export",
      "10 users included",
    ],
    cta: "Start 14-Day Trial",
    ctaHref: "/buy",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For health systems, payers, and large BAs.",
    features: [
      "Unlimited users + assets",
      "SSO / SAML / SCIM",
      "Custom integrations",
      "Dedicated account manager",
      "Multi-facility scoping",
      "BAA available",
      "Priority SLA support",
    ],
    cta: "Contact Sales",
    ctaHref:
      "mailto:sales@cveriskpilot.com?subject=HIPAA%20Enterprise%20Plan",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "What HIPAA safeguards does CVERiskPilot cover?",
    a: "CVERiskPilot maps vulnerability findings to all three categories of HIPAA Security Rule safeguards: Administrative (164.308), Physical (164.310), and Technical (164.312). This includes all 54 implementation specifications across access control, audit controls, integrity, transmission security, and more.",
  },
  {
    q: "How does CVERiskPilot help with HIPAA risk assessments?",
    a: "CVERiskPilot automates the technical risk assessment required by 164.308(a)(1)(ii)(A). It ingests scan data from 11 scanner formats, enriches findings with EPSS exploit probability and KEV status, maps each finding to the HIPAA safeguards it threatens, and generates audit-ready risk documentation.",
  },
  {
    q: "Is CVERiskPilot a replacement for a HIPAA compliance platform?",
    a: "No. CVERiskPilot is the intelligence layer between your vulnerability scanners and your compliance program. It connects every technical finding to its HIPAA compliance impact so your security team and auditors speak the same language.",
  },
  {
    q: "Can CVERiskPilot help prepare for an OCR audit?",
    a: "Yes. CVERiskPilot generates audit evidence packages including risk assessments, remediation timelines, POAM documents, and AI-generated justifications. This documentation directly supports the evidence OCR auditors request during investigations.",
  },
  {
    q: "Does CVERiskPilot support Business Associates?",
    a: "Yes. Both Covered Entities and Business Associates are subject to the HIPAA Security Rule. CVERiskPilot helps any organization that handles PHI/ePHI assess their technical security posture against HIPAA requirements.",
  },
  {
    q: "How much does it cost compared to a HIPAA consultant?",
    a: "The CLI scanner is free. The Pro plan at $149/month includes full HIPAA safeguard mapping, AI triage, and audit evidence export. HIPAA compliance consultants typically charge $5,000-$50,000 for a single risk assessment.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function HipaaPage() {
  return (
    <div className="dark">
      <NavBar />
      <main>
        {/* -- Hero -------------------------------------------------- */}
        <section className="relative overflow-hidden bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
          {/* Background grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 -left-48 h-125 w-125 rounded-full bg-teal-600/8 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-100 w-100 rounded-full bg-teal-800/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-sm font-medium text-teal-300">
                <svg
                  className="h-4 w-4"
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
                45 CFR Part 160 &amp; 164
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                HIPAA Security Rule Compliance{" "}
                <span className="text-teal-400">for Healthcare IT</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl sm:leading-relaxed">
                Map every vulnerability to the{" "}
                <span className="font-semibold text-white">
                  54 HIPAA Security Rule implementation specifications
                </span>
                . Protect PHI/ePHI with AI-powered risk assessments that
                auditors actually understand.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/signup?ref=hipaa"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-teal-600/25 transition-all hover:bg-teal-500 hover:shadow-xl hover:shadow-teal-500/30"
                >
                  Start Free HIPAA Scan
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/10 px-8 py-4 text-base font-semibold text-teal-300 transition-all hover:border-teal-400/50 hover:bg-teal-500/20"
                >
                  See HIPAA Mapping Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -- The Challenge ----------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                The Challenge
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Healthcare faces the highest breach costs of any industry
              </h2>
              <p className="mt-4 text-gray-400">
                For 13 consecutive years, healthcare has had the most expensive
                data breaches. OCR enforcement is increasing, and the Security
                Rule requires documented risk assessments that most organizations
                struggle to produce.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {challenges.map((item) => (
                <div
                  key={item.stat}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-7 text-center"
                >
                  <div className="text-3xl font-extrabold text-teal-400">
                    {item.stat}
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{item.source}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -- Capabilities ------------------------------------------ */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                Capabilities
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How CVERiskPilot protects PHI
              </h2>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-gray-800 bg-gray-900 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-800 hover:shadow-lg hover:shadow-teal-900/20"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-teal-500/10 p-3 text-teal-400">
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

        {/* -- How It Works ------------------------------------------ */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                Process
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How it works for healthcare organizations
              </h2>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.num} className="relative">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
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

        {/* -- Framework Coverage ------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                Framework Coverage
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                HIPAA plus 12 more frameworks
              </h2>
              <p className="mt-4 text-gray-400">
                Healthcare organizations often need to comply with multiple
                frameworks simultaneously. CVERiskPilot maps every finding
                across all 13 supported frameworks so you can track HIPAA, NIST,
                SOC 2, and PCI DSS posture from a single dashboard.
              </p>
            </div>

            <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-3">
              {frameworks.map((fw) => (
                <span
                  key={fw}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    fw === "HIPAA Security Rule"
                      ? "border border-teal-500 bg-teal-500/20 text-teal-300"
                      : "border border-gray-700 bg-gray-800 text-gray-300"
                  }`}
                >
                  {fw}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* -- Pricing ----------------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                Pricing
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                A fraction of the cost of HIPAA consultants
              </h2>
              <p className="mt-4 text-gray-400">
                HIPAA compliance consultants charge $5,000-$50,000 for a single
                risk assessment. CVERiskPilot gives you continuous, automated
                compliance intelligence starting at $0.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-2xl border p-8 transition-shadow hover:shadow-md ${
                    tier.highlighted
                      ? "border-teal-500 bg-gray-900 shadow-xl shadow-teal-900/20 ring-1 ring-teal-500"
                      : "border-gray-800 bg-gray-900 hover:shadow-gray-900/30"
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                      Recommended
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
                          className="mt-0.5 h-4 w-4 shrink-0 text-teal-400"
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
                          ? "bg-teal-600 text-white shadow-md shadow-teal-600/20 hover:bg-teal-500"
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
                          ? "bg-teal-600 text-white shadow-md shadow-teal-600/20 hover:bg-teal-500"
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

        {/* -- FAQ --------------------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">
                FAQ
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Frequently asked questions
              </h2>
            </div>

            <div className="mx-auto mt-16 max-w-3xl divide-y divide-gray-800">
              {faqs.map((faq) => (
                <div key={faq.q} className="py-6">
                  <h3 className="text-base font-semibold text-white">
                    {faq.q}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -- Trust Signals ----------------------------------------- */}
        <section className="border-t border-gray-800 bg-gray-950 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-8 text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                <span className="flex items-center gap-2 text-lg font-semibold text-white">
                  <svg
                    className="h-5 w-5 text-teal-400"
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
                    className="h-5 w-5 text-teal-400"
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
                    className="h-5 w-5 text-teal-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                  PHI/ePHI Protection
                </span>
              </div>
              <p className="max-w-xl text-gray-400">
                Built for healthcare IT teams who need to demonstrate HIPAA
                Security Rule compliance without the overhead of enterprise GRC
                platforms or the cost of recurring consultant engagements.
              </p>
            </div>
          </div>
        </section>

        {/* -- Final CTA --------------------------------------------- */}
        <section
          id="get-started"
          className="relative overflow-hidden bg-linear-to-br from-teal-700 via-teal-800 to-teal-950 py-20 sm:py-28"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Start your HIPAA security assessment today
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-teal-100">
                Run the scanner, map findings to HIPAA safeguards, and generate
                audit-ready evidence -- all before your next compliance review.
              </p>

              {/* Terminal command */}
              <div className="mx-auto mt-8 max-w-lg">
                <pre className="overflow-x-auto rounded-xl border border-white/20 bg-black/30 px-5 py-4 text-left text-sm text-green-400 backdrop-blur-sm">
                  <code>npx @cveriskpilot/scan --preset healthcare</code>
                </pre>
              </div>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/signup?ref=hipaa"
                  className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-teal-700 shadow-lg transition-all hover:bg-teal-50 hover:shadow-xl"
                >
                  Start Free HIPAA Scan
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
                  See HIPAA Mapping Demo
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-teal-200/80">
                <span>100% Veteran Owned</span>
                <span>11 Scanner Formats</span>
                <span>13 Compliance Frameworks</span>
                <span>Audit Evidence Export</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
