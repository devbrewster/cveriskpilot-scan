import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'CVERiskPilot | AI-Powered Vulnerability Management',
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
  ],
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'CVERiskPilot | AI-Powered Vulnerability Management',
    description:
      'Your scanner found 8,000 CVEs. We tell you which 50 matter. AI-powered vulnerability management built by veterans.',
    images: [{ url: '/graphics/og-hero.svg', width: 1200, height: 675 }],
    siteName: 'CVERiskPilot',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVERiskPilot | AI-Powered Vulnerability Management',
    description:
      'Your scanner found 8,000 CVEs. We tell you which 50 matter. AI-powered triage, EPSS + KEV enrichment, remediation plans.',
    images: ['/graphics/og-hero.svg'],
    creator: '@cveriskpilot',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
