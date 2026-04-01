import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/components/landing/nav-bar";
import { Footer } from "@/components/landing/footer";
import { PartnerApplicationForm } from "./partner-form";

export const metadata: Metadata = {
  title:
    "Partner Program | MSSP & Reseller | CVERiskPilot",
  description:
    "Grow your security practice with CVERiskPilot. White-label compliance intelligence for MSSPs and security consultants. Earn 20-30% recurring commissions, co-branded reports, and priority support.",
  keywords: [
    "MSSP partner program",
    "security reseller program",
    "white-label vulnerability management",
    "vCISO partner",
    "GRC reseller",
    "compliance intelligence partner",
    "managed security partner",
    "penetration testing reseller",
    "security consultant partner program",
    "white-label compliance platform",
  ],
  alternates: {
    canonical: "https://cveriskpilot.com/partners",
  },
  openGraph: {
    title: "Partner Program | CVERiskPilot",
    description:
      "Earn 20-30% recurring commissions. White-label compliance intelligence for MSSPs, consultants, and GRC firms.",
    url: "https://cveriskpilot.com/partners",
    images: [
      {
        url: "/graphics/og-veteran-owned.svg",
        width: 1200,
        height: 675,
        alt: "CVERiskPilot Partner Program",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Partner Program | CVERiskPilot",
    description:
      "White-label compliance intelligence for MSSPs and security consultants. 20-30% recurring revenue share.",
    images: ["/graphics/og-veteran-owned.svg"],
    creator: "@cveriskpilot",
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const benefits = [
  {
    title: "Recurring Revenue Share",
    description:
      "Earn 20-30% recurring commissions on every customer you bring in. No caps, no clawbacks. Your revenue grows as your clients grow.",
    icon: "currency",
  },
  {
    title: "White-Label Option",
    description:
      "MSSP tier includes full white-label branding. Your logo, your domain, your reports -- powered by our compliance intelligence engine.",
    icon: "brand",
  },
  {
    title: "Co-Branded Reports",
    description:
      "Generate audit-ready compliance reports with your firm's branding alongside CVERiskPilot. Deliver instant value to your clients.",
    icon: "document",
  },
  {
    title: "Priority Support",
    description:
      "Dedicated partner success manager, priority ticket queue, and direct Slack channel with our engineering team.",
    icon: "support",
  },
  {
    title: "Free Pro Account",
    description:
      "Every partner gets a free Pro account for their own practice. Use it internally, demo it to prospects, and experience the full platform.",
    icon: "gift",
  },
  {
    title: "Sales Enablement",
    description:
      "Pitch decks, battle cards, ROI calculators, and demo environments. Everything you need to close deals faster.",
    icon: "presentation",
  },
];

const audiences = [
  {
    title: "Managed Security Service Providers",
    description:
      "Add compliance intelligence to your managed services portfolio. White-label the platform, manage multiple clients from a single dashboard, and bill on your terms.",
  },
  {
    title: "Security Consultants & vCISOs",
    description:
      "Deliver AI-powered risk assessments and compliance gap analyses to your clients. Replace spreadsheet-based audits with automated, audit-ready intelligence.",
  },
  {
    title: "GRC Advisory Firms",
    description:
      "Accelerate SOC 2, CMMC, HIPAA, and FedRAMP readiness assessments. Map findings to 13 compliance frameworks automatically.",
  },
  {
    title: "Penetration Testing Companies",
    description:
      "Go beyond the pentest report. Show clients exactly which compliance controls their vulnerabilities threaten and generate POAMs automatically.",
  },
  {
    title: "IT Audit Firms",
    description:
      "Streamline evidence collection and control validation. Generate audit-ready documentation with AI-powered justifications and risk narratives.",
  },
];

const steps = [
  {
    num: "1",
    title: "Apply to the program",
    description:
      "Fill out the application below. We review every submission and respond within 48 hours.",
  },
  {
    num: "2",
    title: "Get onboarded",
    description:
      "Dedicated training session, sales materials, demo environment, and your partner portal credentials.",
  },
  {
    num: "3",
    title: "Sell to your clients",
    description:
      "Use your co-branded or white-label instance to demo the platform. We handle billing or you resell on your terms.",
  },
  {
    num: "4",
    title: "Earn recurring commissions",
    description:
      "Get paid every month for every active customer. Track referrals, commissions, and client health in your partner dashboard.",
  },
];

const tiers = [
  {
    name: "Referral Partner",
    commission: "20%",
    description: "Send us leads, earn commissions. No minimums.",
    features: [
      "20% recurring commission",
      "No minimum client requirement",
      "Unique referral tracking link",
      "Partner dashboard access",
      "Free Pro account for your practice",
      "Co-marketing opportunities",
    ],
    highlighted: false,
  },
  {
    name: "Reseller Partner",
    commission: "25%",
    description: "Sell directly to your clients with co-branded deliverables.",
    features: [
      "25% recurring commission",
      "5+ active clients required",
      "Co-branded compliance reports",
      "Priority support queue",
      "Dedicated partner success manager",
      "Sales enablement materials",
      "Quarterly business reviews",
    ],
    highlighted: true,
  },
  {
    name: "Strategic Partner",
    commission: "30%",
    description: "Full white-label platform with custom integrations.",
    features: [
      "30% recurring commission",
      "20+ active clients required",
      "Full white-label branding",
      "Custom integrations and API access",
      "Dedicated engineering support",
      "Joint go-to-market campaigns",
      "Executive sponsor alignment",
      "Custom SLA and terms",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: "How does the commission structure work?",
    answer:
      "You earn a percentage of recurring revenue for every customer you refer or resell to. Commissions are paid monthly, 30 days after the customer's payment clears. There are no caps on commissions and no clawbacks after the first 90 days.",
  },
  {
    question: "What is the onboarding process like?",
    answer:
      "After approval, you'll receive a 1-hour onboarding call covering the platform, sales positioning, and demo techniques. You'll get access to your partner portal, a demo environment, pitch deck templates, and battle cards. Most partners are ready to sell within a week.",
  },
  {
    question: "How does white-labeling work?",
    answer:
      "Strategic Partners on the MSSP tier get full white-label capabilities: your logo, your color scheme, your domain (via CNAME), and your branding on all reports and emails. Your clients never see the CVERiskPilot brand unless you want them to.",
  },
  {
    question: "Can I resell at my own price?",
    answer:
      "Reseller and Strategic Partners can set their own pricing. You pay us the wholesale rate (your tier price minus commission) and bill your clients whatever you want. Referral Partners use our standard pricing.",
  },
  {
    question: "What compliance frameworks are supported?",
    answer:
      "CVERiskPilot maps findings to 13 compliance frameworks: NIST 800-53, CMMC, SOC 2, FedRAMP, ASVS, SSDF, GDPR, HIPAA, PCI DSS, ISO 27001, NIST CSF 2.0, EU CRA, and NIS2. New frameworks are added based on partner demand.",
  },
  {
    question: "Is there a cost to join the partner program?",
    answer:
      "No. There is no fee to join at any tier. You get a free Pro account, access to the partner portal, and all sales enablement materials at no cost. You only need to meet the minimum client thresholds for Reseller (5+) and Strategic (20+) tiers.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

/* ------------------------------------------------------------------ */
/*  Icon helper                                                        */
/* ------------------------------------------------------------------ */

function BenefitIcon({ type }: { type: string }) {
  const cls = "h-6 w-6";
  switch (type) {
    case "currency":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "brand":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      );
    case "document":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case "support":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.712 4.33a9.027 9.027 0 011.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 00-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 010 9.424m-4.138-5.976a3.736 3.736 0 00-.88-1.388 3.737 3.737 0 00-1.388-.88m2.268 2.268a3.765 3.765 0 010 2.528m-2.268-4.796l-3.448 4.138m5.716-.37l-4.138 3.448m0 0a3.765 3.765 0 01-2.528 0m2.528 0l-4.138 3.448m1.61-1.08a9.014 9.014 0 010-9.424m0 9.424l-4.138-3.448M4.33 16.712a9.014 9.014 0 010-9.424m4.138 3.448l-4.138-3.448m0 0A9.027 9.027 0 013.022 5.98a9.03 9.03 0 00-1.306 1.652m5.572 7.08l-3.448 4.138m0 0a9.027 9.027 0 01-1.306-1.652A9.027 9.027 0 011.636 15.6" />
        </svg>
      );
    case "gift":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
    case "presentation":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v-1.5" />
        </svg>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PartnersPage() {
  return (
    <div className="dark">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <NavBar />
      <main>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 pt-32 pb-20 sm:pt-40 sm:pb-28">
          {/* Background grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 -left-48 h-125 w-125 rounded-full bg-primary-600/8 blur-3xl" />
            <div className="absolute -right-24 bottom-0 h-100 w-100 rounded-full bg-primary-800/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Partner Program
              </p>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Grow Your Security Practice with{" "}
                <span className="text-primary-400">CVERiskPilot</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl sm:leading-relaxed">
                White-label compliance intelligence for MSSPs and security
                consultants. Earn recurring commissions while delivering
                AI-powered vulnerability management to your clients.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a
                  href="#apply"
                  className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-500 hover:shadow-xl hover:shadow-primary-500/30"
                >
                  Apply Now
                </a>
                <a
                  href="#tiers"
                  className="inline-flex items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/10 px-8 py-4 text-base font-semibold text-primary-300 transition-all hover:border-primary-400/50 hover:bg-primary-500/20"
                >
                  View Partner Tiers
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Benefits ──────────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Why Partner With Us
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Partner benefits
              </h2>
              <p className="mt-4 text-gray-400">
                Everything you need to build a profitable compliance practice on
                top of CVERiskPilot.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-gray-800 bg-gray-900 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-800 hover:shadow-lg hover:shadow-primary-900/20"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-primary-500/10 p-3 text-primary-400">
                    <BenefitIcon type={item.icon} />
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

        {/* ── Who It's For ──────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Who It&apos;s For
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Built for security professionals
              </h2>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {audiences.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-7"
                >
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

        {/* ── How It Works ──────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Process
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How the partner program works
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

        {/* ── Partner Tiers ─────────────────────────────────────── */}
        <section
          id="tiers"
          className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Partner Tiers
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Choose your partnership level
              </h2>
              <p className="mt-4 text-gray-400">
                Start as a Referral Partner and grow into a Strategic Partner as
                your client base expands.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative flex flex-col rounded-2xl border p-8 transition-shadow hover:shadow-md ${
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
                      {tier.commission}
                    </span>
                    <span className="ml-2 text-sm text-gray-400">
                      recurring commission
                    </span>
                  </div>
                  <ul className="mt-8 flex-1 space-y-3">
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
                  <a
                    href="#apply"
                    className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                      tier.highlighted
                        ? "bg-primary-600 text-white shadow-md shadow-primary-600/20 hover:bg-primary-500"
                        : "border border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                    }`}
                  >
                    Apply Now
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Application Form ──────────────────────────────────── */}
        <section
          id="apply"
          className="border-t border-gray-800 bg-gray-950 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
                Get Started
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Apply to the partner program
              </h2>
              <p className="mt-4 text-gray-400">
                Fill out the form below and we will get back to you within 48
                hours.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-xl">
              <PartnerApplicationForm />
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-900/50 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-center text-gray-400">
              Have another question?{" "}
              <a
                href="mailto:partners@cveriskpilot.com"
                className="text-primary-400 underline hover:text-primary-300"
              >
                Reach out to our partnerships team
              </a>
              .
            </p>

            <dl className="mt-12 space-y-8">
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-base font-semibold text-white">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-gray-400">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-linear-to-br from-primary-700 via-primary-800 to-primary-950 py-20 sm:py-28">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to grow your security practice?
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-primary-100">
                Join the CVERiskPilot partner program and start earning
                recurring revenue while delivering world-class compliance
                intelligence to your clients.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <a
                  href="#apply"
                  className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
                >
                  Apply Now
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
                </a>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-white/25 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
                >
                  View Pricing
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-primary-200/80">
                <span>100% Veteran Owned</span>
                <span>13 Compliance Frameworks</span>
                <span>11 Scanner Formats</span>
                <span>No Partner Fees</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
