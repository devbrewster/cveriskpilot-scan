import type { Metadata } from 'next';
import './globals.css';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
