import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Policy — Responsible Disclosure",
  description:
    "CVERiskPilot responsible disclosure policy. Report security vulnerabilities and help us keep the platform safe.",
  alternates: {
    canonical: "https://cveriskpilot.com/security-policy",
  },
  robots: { index: true, follow: true },
};

export default function SecurityPolicyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Security Policy
      </h1>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        CVERiskPilot LLC — 100% Veteran Owned Business — San Antonio, TX
      </p>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Effective: March 30, 2026
      </p>

      {/* Responsible Disclosure */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Responsible Disclosure
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We take the security of CVERiskPilot and our customers&apos; data seriously. If
          you believe you have found a security vulnerability in our platform, we
          encourage you to report it responsibly.
        </p>
      </section>

      {/* How to Report */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          How to Report a Vulnerability
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Send your report to{" "}
          <a
            href="mailto:security@cveriskpilot.com"
            className="font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            security@cveriskpilot.com
          </a>
          . Please include:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>A description of the vulnerability and its potential impact</li>
          <li>Step-by-step instructions to reproduce the issue</li>
          <li>Any supporting evidence (screenshots, HTTP requests, proof-of-concept code)</li>
          <li>Your preferred attribution name if you would like public credit</li>
        </ul>
      </section>

      {/* Our Commitment */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Our Commitment
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>
            <strong className="text-gray-900 dark:text-white">Acknowledgment within 24 hours</strong>{" "}
            — We will confirm receipt of your report
          </li>
          <li>
            <strong className="text-gray-900 dark:text-white">Assessment within 5 business days</strong>{" "}
            — We will evaluate the report and provide an initial assessment
          </li>
          <li>
            <strong className="text-gray-900 dark:text-white">Remediation timeline</strong>{" "}
            — Critical issues within 72 hours, high-severity within 14 days
          </li>
          <li>
            <strong className="text-gray-900 dark:text-white">Credit</strong>{" "}
            — With your permission, we will publicly acknowledge your contribution
          </li>
          <li>
            <strong className="text-gray-900 dark:text-white">No legal action</strong>{" "}
            — We will not pursue legal action against researchers who act in good faith
          </li>
        </ul>
      </section>

      {/* Scope */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          In Scope
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>cveriskpilot.com and all subdomains</li>
          <li>The <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">@cveriskpilot/scan</code> npm package</li>
          <li>Authentication and authorization flaws</li>
          <li>Data exposure or cross-tenant leakage</li>
          <li>Injection vulnerabilities (SQLi, XSS, SSRF, etc.)</li>
          <li>API security issues</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Out of Scope
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>Denial of service (DoS/DDoS) attacks</li>
          <li>Social engineering or phishing of employees or customers</li>
          <li>Physical attacks against infrastructure</li>
          <li>Automated scanning without prior coordination</li>
          <li>Issues in third-party services (Stripe, Google, GitHub)</li>
        </ul>
      </section>

      {/* Security Practices */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Our Security Practices
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>AES-256-GCM encryption at rest with Cloud KMS envelope encryption</li>
          <li>TLS 1.3 encryption in transit (HSTS preloaded)</li>
          <li>Multi-factor authentication (TOTP + WebAuthn/passkeys)</li>
          <li>Role-based access control (10 roles, least privilege)</li>
          <li>Cloud Armor WAF with OWASP CRS v3.3 rules</li>
          <li>Private VPC networking (no public database access)</li>
          <li>Tamper-evident audit logging with hash chains</li>
          <li>SOC 2 Type II and ISO 27001 certified infrastructure (GCP)</li>
          <li>90-day log retention for forensic analysis</li>
        </ul>
      </section>

      {/* Compliance */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Compliance
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          CVERiskPilot maintains a CMMC Level 1 self-assessment and maps to NIST 800-53,
          SOC 2, FedRAMP, ASVS, and SSDF frameworks. Our platform helps organizations
          achieve and maintain compliance across these same frameworks.
        </p>
      </section>

      {/* Contact */}
      <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Security Contact
        </h2>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Email:{" "}
            <a
              href="mailto:security@cveriskpilot.com"
              className="font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              security@cveriskpilot.com
            </a>
          </p>
          <p>
            PGP: Available upon request
          </p>
          <p>
            security.txt:{" "}
            <a
              href="/.well-known/security.txt"
              className="text-primary-600 hover:underline dark:text-primary-400"
            >
              /.well-known/security.txt
            </a>
          </p>
        </div>
      </section>

      {/* Links */}
      <div className="flex gap-4 pt-2 text-sm">
        <Link
          href="/privacy"
          className="text-primary-600 hover:underline dark:text-primary-400"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          className="text-primary-600 hover:underline dark:text-primary-400"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
