import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { ThemeProvider } from '@/components/theme-provider';
import { CsrfProvider } from '@/components/csrf-provider';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-TXXFD3FYR1';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveriskpilot.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'CVERiskPilot | AI-Powered Vulnerability Management',
    template: '%s | CVERiskPilot',
  },
  description:
    'Unify vulnerability signals from every scanner into a single, AI-powered remediation system. Prioritize by real exploit risk, not just CVSS. Built by veterans, for security teams.',
  keywords: [
    'vulnerability management',
    'CVE',
    'EPSS',
    'CISA KEV',
    'AI remediation',
    'CVSS',
    'security',
    'compliance',
    'NIST 800-53',
    'SOC 2',
    'CMMC',
    'FedRAMP',
    'POAM',
    'DevSecOps',
    'pipeline compliance',
    'secrets scanner',
    'SBOM',
    'IaC security',
    'vulnerability scanner',
    'GRC',
    'cybersecurity',
    'veteran owned',
  ],
  authors: [{ name: 'CVERiskPilot LLC', url: BASE_URL }],
  creator: 'CVERiskPilot LLC',
  publisher: 'CVERiskPilot LLC',
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: 'CVERiskPilot | AI-Powered Vulnerability Management',
    description:
      'Your scanner found 8,000 CVEs. We tell you which 50 matter. AI-powered vulnerability management built by veterans.',
    images: [{ url: '/graphics/og-hero.svg', width: 1200, height: 675, alt: 'CVERiskPilot — AI-Powered Vulnerability Management' }],
    siteName: 'CVERiskPilot',
    type: 'website',
    url: BASE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVERiskPilot | AI-Powered Vulnerability Management',
    description:
      'Your scanner found 8,000 CVEs. We tell you which 50 matter. AI-powered triage, EPSS + KEV enrichment, remediation plans.',
    images: [{ url: '/graphics/og-hero.svg', alt: 'CVERiskPilot' }],
    creator: '@cveriskpilot',
    site: '@cveriskpilot',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
};

/* ------------------------------------------------------------------ */
/*  JSON-LD Structured Data                                           */
/* ------------------------------------------------------------------ */

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CVERiskPilot LLC',
  url: BASE_URL,
  logo: `${BASE_URL}/icon-192.png`,
  description: 'AI-Powered Vulnerability Management — unify CVE signals, prioritize by real exploit risk, and map to compliance frameworks automatically.',
  foundingDate: '2025',
  foundingLocation: 'Texas, USA',
  sameAs: [
    'https://x.com/cveriskpilot',
    'https://github.com/devbrewster',
    'https://www.npmjs.com/package/@cveriskpilot/scan',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    url: `${BASE_URL}/signup`,
  },
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CVERiskPilot',
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Web, Linux, macOS, Windows',
  description: 'AI-powered vulnerability management platform. Ingest scan results from 11+ scanner formats, enrich with EPSS and CISA KEV, triage with AI, and map to 6 compliance frameworks.',
  url: BASE_URL,
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      description: 'Unlimited local pipeline scans, 3 uploads/month, 50 AI calls',
    },
    {
      '@type': 'Offer',
      name: 'Founders Beta',
      price: '29',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: 'Locked pricing for early adopters — 5 users, unlimited uploads, 200 AI calls',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '49',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description: '10 users, unlimited uploads, 500 AI calls, 500 assets',
    },
  ],
  author: {
    '@type': 'Organization',
    name: 'CVERiskPilot LLC',
  },
  featureList: [
    'Multi-scanner ingestion (Nessus, SARIF, CycloneDX, Qualys, OpenVAS, SPDX, OSV, CSAF, CSV, JSON, XLSX)',
    'AI-powered vulnerability triage with Claude',
    'EPSS + CISA KEV + CVSS risk prioritization',
    'Compliance mapping (NIST 800-53, SOC 2, CMMC, FedRAMP, ASVS, SSDF)',
    'Pipeline compliance scanner CLI',
    'POAM generation',
    'Executive PDF/CSV reports',
    'RBAC with 10 roles',
    'SSO (SAML/OIDC) via WorkOS',
    'MFA/TOTP authentication',
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CVERiskPilot',
  url: BASE_URL,
  description: 'AI-Powered Vulnerability Management',
  publisher: {
    '@type': 'Organization',
    name: 'CVERiskPilot LLC',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        {/* Safe: static JSON-LD structured data, no user input */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider><CsrfProvider>{children}</CsrfProvider></ThemeProvider>
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
