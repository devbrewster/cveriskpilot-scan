import type { Metadata } from "next";
import { NavBar } from "@/components/landing/nav-bar";
import { Pricing } from "@/components/landing/pricing";
import { TierComparison } from "@/components/billing/tier-comparison";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Pricing | CVERiskPilot",
  description:
    "Simple, transparent pricing for AI-powered vulnerability management. Start free with unlimited CLI scans. Upgrade to Founders Beta ($29/mo), Pro ($149/mo), or Enterprise for full compliance automation across NIST 800-53, SOC 2, CMMC, and more.",
  alternates: {
    canonical: "https://cveriskpilot.com/pricing",
  },
  openGraph: {
    title: "Pricing | CVERiskPilot",
    description:
      "AI-powered vulnerability management pricing. Free CLI scans, paid plans from $29/mo.",
    url: "https://cveriskpilot.com/pricing",
    type: "website",
  },
};

/* ------------------------------------------------------------------ */
/*  FAQ data — rendered visually + as JSON-LD for Google rich results  */
/* ------------------------------------------------------------------ */

const faqs = [
  {
    question: "Is there a free tier?",
    answer:
      "Yes. The Free tier includes unlimited local CLI scans with 6 compliance frameworks, 3 dashboard uploads per month, and 50 AI remediation calls. No credit card required.",
  },
  {
    question: "How does the 14-day Pro trial work?",
    answer:
      "When you sign up for Pro, you get full access for 14 days with no charge. If you don't upgrade before the trial ends, your account automatically moves to the Free tier — no surprise charges.",
  },
  {
    question: "What does 'price locked forever' mean for Founders Beta?",
    answer:
      "Founders Beta members keep $29/month pricing for the lifetime of their subscription, even as we raise prices. Only 50 spots are available. If you cancel and re-subscribe later, you'll pay the current price.",
  },
  {
    question: "Can I change plans at any time?",
    answer:
      "Yes. You can upgrade or downgrade at any time from your billing settings. Upgrades take effect immediately with prorated charges. Downgrades apply at the end of your current billing period.",
  },
  {
    question: "What scanner formats do you support?",
    answer:
      "CVERiskPilot ingests 11 scanner formats: Nessus, SARIF, CSV, JSON, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, and XLSX. The CLI also scans for vulnerable dependencies, hardcoded secrets, and IaC misconfigurations.",
  },
  {
    question: "How do I get Enterprise or MSSP pricing?",
    answer:
      "Contact us at sales@cveriskpilot.com. Enterprise and MSSP plans are tailored to your organization's size, compliance requirements, and number of managed clients. We typically turn around quotes within 24 hours.",
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
  return (
    <div className="dark">
      {/* JSON-LD structured data — static, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <NavBar />

      <main className="pt-20">
        {/* Hero header */}
        <section className="bg-white px-4 pb-4 pt-16 text-center dark:bg-gray-950 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Start free. Upgrade when you need more. No surprise charges, no
            feature gates on security.
          </p>
        </section>

        {/* Pricing plan cards */}
        <Pricing />

        {/* Tier comparison matrix */}
        <section className="bg-white px-4 py-20 dark:bg-gray-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Compare plans in detail
            </h2>
            <TierComparison />
          </div>
        </section>

        {/* FAQ section */}
        <section className="border-t border-gray-200 bg-gray-50 px-4 py-20 dark:border-gray-800 dark:bg-gray-900 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
              Can&apos;t find what you&apos;re looking for?{" "}
              <a
                href="mailto:support@cveriskpilot.com"
                className="text-primary-600 underline hover:text-primary-500 dark:text-primary-400"
              >
                Reach out to our team
              </a>
              .
            </p>

            <dl className="mt-12 space-y-8">
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-base font-semibold text-gray-900 dark:text-white">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
