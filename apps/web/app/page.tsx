import type { Metadata } from "next";
import { NavBar } from "@/components/landing/nav-bar";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { WhoItsFor } from "@/components/landing/who-its-for";
import { Features } from "@/components/landing/features";
import { PipelineSection } from "@/components/landing/pipeline-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ComplianceImpact } from "@/components/landing/compliance-impact";
import { Pricing } from "@/components/landing/pricing";
import { AiTrust } from "@/components/landing/ai-trust";
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
        text: "CVERiskPilot is an AI-powered compliance intelligence platform that ingests scan results from 11+ scanner formats (Nessus, SARIF, CycloneDX, Qualys, and more), enriches findings with EPSS and CISA KEV data, and automatically maps vulnerabilities to 13 compliance frameworks including NIST 800-53, SOC 2, CMMC, FedRAMP, HIPAA, PCI DSS, ISO 27001, NIST CSF 2.0, EU CRA, NIS2, ASVS, SSDF, and GDPR.",
      },
    },
    {
      "@type": "Question",
      name: "How does CVERiskPilot map vulnerabilities to compliance controls?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CVERiskPilot uses a CWE-to-compliance bridge architecture: each vulnerability is tagged with CWE IDs, which map to NIST 800-53 controls via 80+ documented mappings. NIST 800-53 acts as the canonical hub, bridging to SOC 2, CMMC, FedRAMP, HIPAA, PCI DSS, ISO 27001, NIST CSF 2.0, EU CRA, NIS2, GDPR, ASVS, and SSDF — 300+ controls total across 13 frameworks.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Pipeline Compliance Scanner?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Pipeline Compliance Scanner (@cveriskpilot/scan) is a free, zero-dependency CLI that scans your codebase for vulnerable dependencies, hardcoded secrets, and IaC misconfigurations, then maps findings to 6 compliance frameworks (10 on the platform). Run it with: npx @cveriskpilot/scan@latest --preset startup",
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
      name: "Is my vulnerability data safe when CVERiskPilot uses AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All PII (IP addresses, hostnames, usernames, API keys) is automatically redacted before any AI call. Your data is never used for model training (per Anthropic API terms). All AI feedback and learning is scoped to your organization — no cross-tenant data sharing. You can also deploy with a local LLM (Ollama) for fully air-gapped AI triage with zero external calls.",
      },
    },
    {
      "@type": "Question",
      name: "How much does CVERiskPilot cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CVERiskPilot offers a Free tier (unlimited CLI scans, 3 dashboard uploads/month), a Founders Beta at $29/month (locked early adopter pricing), Pro at $149/month (full compliance automation for teams), and custom Enterprise and MSSP pricing. The CLI scanner maps to 6 frameworks free; the platform maps to all 13 frameworks including HIPAA, PCI DSS, ISO 27001, NIST CSF 2.0, EU CRA, and NIS2.",
      },
    },
  ],
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "CVERiskPilot LLC",
  description: "AI-Powered Compliance Intelligence Platform — 100% Veteran Owned",
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
    "Compliance Intelligence",
    "Cybersecurity",
    "Compliance Automation",
    "NIST 800-53",
    "SOC 2",
    "CMMC",
    "FedRAMP",
    "HIPAA",
    "PCI DSS",
    "ISO 27001",
    "NIST CSF 2.0",
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
        <ComplianceImpact />
        <Pricing />
        <AiTrust />
        <VeteranOwned />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
