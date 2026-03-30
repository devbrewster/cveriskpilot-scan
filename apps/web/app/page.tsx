import type { Metadata } from "next";
import { NavBar } from "@/components/landing/nav-bar";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { WhoItsFor } from "@/components/landing/who-its-for";
import { Features } from "@/components/landing/features";
import { PipelineSection } from "@/components/landing/pipeline-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { VeteranOwned } from "@/components/landing/veteran-owned";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://cveriskpilot.com",
  },
};

/* ------------------------------------------------------------------ */
/*  FAQ Schema — targets "People also ask" in Google SERPs            */
/* ------------------------------------------------------------------ */

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is CVERiskPilot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CVERiskPilot is an AI-powered vulnerability management platform that ingests scan results from 11+ scanner formats (Nessus, SARIF, CycloneDX, Qualys, and more), enriches findings with EPSS and CISA KEV data, and automatically maps vulnerabilities to compliance frameworks including NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, and SSDF.",
      },
    },
    {
      "@type": "Question",
      name: "How does CVERiskPilot map vulnerabilities to compliance controls?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CVERiskPilot uses a CWE-to-compliance bridge architecture: each vulnerability is tagged with CWE IDs, which map to NIST 800-53 controls via 80+ documented mappings. NIST 800-53 acts as the canonical hub, bridging to SOC 2, CMMC, FedRAMP, ASVS, and SSDF — 135 controls total across 6 frameworks.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Pipeline Compliance Scanner?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Pipeline Compliance Scanner (@cveriskpilot/scan) is a free, zero-dependency CLI that scans your codebase for vulnerable dependencies, hardcoded secrets, and IaC misconfigurations, then automatically maps findings to 6 compliance frameworks. Run it with: npx @cveriskpilot/scan@latest --preset startup",
      },
    },
    {
      "@type": "Question",
      name: "Is CVERiskPilot suitable for government and DoD teams?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. CVERiskPilot is built by a 100% Veteran Owned, Texas-registered LLC. It supports FedRAMP POAM generation, NIST 800-53 mapping, and CMMC Level 2 compliance, with presets specifically designed for federal and defense teams.",
      },
    },
    {
      "@type": "Question",
      name: "How much does CVERiskPilot cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CVERiskPilot offers a Free tier (1 user, 3 uploads/month, unlimited local pipeline scans), a Founders Beta at $29/month (locked pricing for early adopters), Pro at $49/month (10 users, unlimited uploads), and custom Enterprise pricing. The CLI pipeline scanner is free for everyone.",
      },
    },
  ],
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "CVERiskPilot LLC",
  description: "AI-Powered Vulnerability Management — 100% Veteran Owned",
  url: "https://cveriskpilot.com",
  logo: "https://cveriskpilot.com/icon-192.png",
  address: {
    "@type": "PostalAddress",
    addressRegion: "TX",
    addressCountry: "US",
  },
  founder: {
    "@type": "Person",
    jobTitle: "Founder",
  },
  foundingDate: "2025",
  legalName: "CVERiskPilot LLC",
  knowsAbout: [
    "Vulnerability Management",
    "Cybersecurity",
    "Compliance Automation",
    "NIST 800-53",
    "SOC 2",
    "CMMC",
    "FedRAMP",
  ],
  sameAs: [
    "https://x.com/cveriskpilot",
    "https://github.com/devbrewster",
    "https://www.npmjs.com/package/@cveriskpilot/scan",
  ],
};

export default function LandingPage() {
  return (
    <div className="dark">
      {/* Safe: static JSON-LD structured data, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <NavBar />
      <main>
        <Hero />
        <SocialProof />
        <WhoItsFor />
        <Features />
        <PipelineSection />
        <HowItWorks />
        <Pricing />
        <VeteranOwned />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
