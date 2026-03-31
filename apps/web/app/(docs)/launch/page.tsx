import type { Metadata } from "next";
import { LaunchPageClient } from "./launch-client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://cveriskpilot.com";

export const metadata: Metadata = {
  title: "CVERiskPilot — AI Compliance Scanning in 90 Seconds | Product Hunt",
  description:
    "Your scanner found 8,000 CVEs. We tell you which 50 matter. AI-powered compliance scanning maps vulnerabilities to NIST 800-53, SOC 2, CMMC, and FedRAMP in under 90 seconds. Free CLI, no signup required.",
  keywords: [
    "vulnerability management",
    "compliance automation",
    "NIST 800-53",
    "SOC 2",
    "CMMC",
    "FedRAMP",
    "CVE scanner",
    "EPSS",
    "KEV",
    "POAM generator",
    "DevSecOps",
    "CI/CD security",
    "Product Hunt",
  ],
  openGraph: {
    title: "CVERiskPilot — AI Compliance Scanning in 90 Seconds",
    description:
      "Your scanner found 8,000 CVEs. We tell you which 50 matter. Free CLI scans, no signup required.",
    url: `${BASE_URL}/launch`,
    siteName: "CVERiskPilot",
    images: [
      {
        url: `${BASE_URL}/graphics/og-hero.svg`,
        width: 1200,
        height: 630,
        alt: "CVERiskPilot — Compliance in the Shell",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CVERiskPilot — AI Compliance Scanning in 90 Seconds",
    description:
      "Your scanner found 8,000 CVEs. We tell you which 50 matter. Free CLI, no signup.",
    images: [`${BASE_URL}/graphics/og-hero.svg`],
    creator: "@caborunda1",
  },
  alternates: {
    canonical: `${BASE_URL}/launch`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LaunchPage() {
  return <LaunchPageClient />;
}
