/**
 * CVERiskPilot Compliance Whitepaper — PDF Template
 *
 * Professional compliance document modeled after industry whitepapers
 * (Axonius-style). Covers:
 *   - Cover page
 *   - Table of Contents
 *   - Executive Summary
 *   - Framework overviews (NIST 800-53, CMMC, SOC 2, FedRAMP, ASVS, SSDF)
 *   - Challenges section
 *   - CVERiskPilot capabilities + control mapping
 *   - Capability matrix
 *
 * Uses @react-pdf/renderer for server-side PDF generation.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";

// ── Colors ────────────────────────────────────────────────────────────

const c = {
  primary: "#1e40af",
  primaryDark: "#1e293b",
  accent: "#0ea5e9",
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#2563eb",
  info: "#64748b",
  text: "#1f2937",
  muted: "#6b7280",
  light: "#f1f5f9",
  border: "#e2e8f0",
  white: "#ffffff",
  green: "#16a34a",
};

// ── Styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Cover
  coverPage: {
    padding: 60,
    justifyContent: "center",
    fontFamily: "Helvetica",
    backgroundColor: c.primaryDark,
  },
  coverTag: {
    fontSize: 10,
    color: c.accent,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: c.white,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 16,
    color: "#94a3b8",
    lineHeight: 1.5,
    marginBottom: 60,
  },
  coverMeta: { fontSize: 11, color: "#94a3b8", marginBottom: 4 },
  coverFooter: {
    position: "absolute" as const,
    bottom: 40,
    left: 60,
    right: 60,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  coverFooterText: { fontSize: 9, color: "#64748b" },

  // Content pages
  page: {
    padding: 50,
    paddingBottom: 60,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: c.text,
  },
  pageHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 24,
    paddingBottom: 8,
    borderBottom: `1 solid ${c.border}`,
  },
  pageHeaderLeft: { fontSize: 8, color: c.primary, fontWeight: "bold" },
  pageHeaderRight: { fontSize: 8, color: c.muted },
  pageFooter: {
    position: "absolute" as const,
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    borderTop: `1 solid ${c.border}`,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: c.muted },

  // Typography
  h1: {
    fontSize: 22,
    fontWeight: "bold",
    color: c.primary,
    marginBottom: 12,
    marginTop: 4,
  },
  h2: {
    fontSize: 16,
    fontWeight: "bold",
    color: c.primaryDark,
    marginBottom: 8,
    marginTop: 20,
  },
  h3: {
    fontSize: 12,
    fontWeight: "bold",
    color: c.text,
    marginBottom: 6,
    marginTop: 12,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.6,
    color: c.text,
    marginBottom: 8,
  },
  bodySmall: {
    fontSize: 9,
    lineHeight: 1.5,
    color: c.muted,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 10,
    lineHeight: 1.6,
    color: c.text,
    marginBottom: 4,
    paddingLeft: 16,
  },
  link: { color: c.accent, textDecoration: "underline" as const },

  // TOC
  tocEntry: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 4,
    borderBottom: `1 solid ${c.light}`,
  },
  tocLabel: { fontSize: 11, color: c.text },
  tocPage: { fontSize: 11, color: c.muted },
  tocSection: {
    fontSize: 12,
    fontWeight: "bold",
    color: c.primary,
    marginTop: 12,
    marginBottom: 4,
  },

  // Stat card row
  statsRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: c.light,
    borderRadius: 4,
    borderLeft: `3 solid ${c.primary}`,
  },
  statValue: { fontSize: 20, fontWeight: "bold", color: c.primary },
  statLabel: { fontSize: 8, color: c.muted, marginTop: 2 },

  // Table
  tableHeader: {
    flexDirection: "row" as const,
    backgroundColor: c.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: c.white,
    textTransform: "uppercase" as const,
  },
  tableRow: {
    flexDirection: "row" as const,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottom: `1 solid ${c.border}`,
  },
  tableRowAlt: {
    flexDirection: "row" as const,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottom: `1 solid ${c.border}`,
    backgroundColor: c.light,
  },
  tableCell: { fontSize: 9, color: c.text },
  tableCellBold: { fontSize: 9, fontWeight: "bold", color: c.text },

  // Badge
  badge: {
    fontSize: 7,
    fontWeight: "bold",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    color: c.white,
    textAlign: "center" as const,
  },

  // Callout box
  callout: {
    backgroundColor: "#eff6ff",
    borderLeft: `3 solid ${c.primary}`,
    padding: 12,
    marginVertical: 10,
    borderRadius: 2,
  },
  calloutText: { fontSize: 10, color: c.primary, lineHeight: 1.5 },
});

// ── Helpers ───────────────────────────────────────────────────────────

function Header({ title }: { title: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderLeft}>CVERiskPilot Compliance Whitepaper</Text>
      <Text style={s.pageHeaderRight}>{title}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.footerText}>CVERiskPilot LLC | 100% Veteran Owned</Text>
      <Text style={s.footerText}>cveriskpilot.com | Confidential</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function SeverityBadge({ level }: { level: string }) {
  const bgMap: Record<string, string> = {
    CRITICAL: c.critical,
    HIGH: c.high,
    MEDIUM: c.medium,
    LOW: c.low,
    INFO: c.info,
    FULL: c.green,
    PARTIAL: c.accent,
  };
  return (
    <Text style={[s.badge, { backgroundColor: bgMap[level] ?? c.info }]}>
      {level}
    </Text>
  );
}

// ── Capability Matrix Data ────────────────────────────────────────────

interface CapabilityRow {
  framework: string;
  controlId: string;
  controlTitle: string;
  coverage: "FULL" | "PARTIAL";
  capability: string;
}

const CAPABILITIES: CapabilityRow[] = [
  // NIST 800-53
  { framework: "NIST 800-53", controlId: "RA-5", controlTitle: "Vulnerability Monitoring & Scanning", coverage: "FULL", capability: "Automated dependency, secrets, and IaC scanning with AI triage" },
  { framework: "NIST 800-53", controlId: "SI-2", controlTitle: "Flaw Remediation", coverage: "FULL", capability: "CVE identification, fix versions, upgrade recommendations, POAM generation" },
  { framework: "NIST 800-53", controlId: "SI-10", controlTitle: "Information Input Validation", coverage: "FULL", capability: "CWE detection for injection, XSS, and input validation flaws" },
  { framework: "NIST 800-53", controlId: "CM-7", controlTitle: "Least Functionality", coverage: "FULL", capability: "SBOM generation, unused dependency detection, supply chain analysis" },
  { framework: "NIST 800-53", controlId: "SC-12", controlTitle: "Cryptographic Key Management", coverage: "FULL", capability: "Secrets scanning detects exposed keys, tokens, and certificates" },
  { framework: "NIST 800-53", controlId: "CA-7", controlTitle: "Continuous Monitoring", coverage: "FULL", capability: "Pipeline integration for continuous scanning on every commit/PR" },
  { framework: "NIST 800-53", controlId: "SA-11", controlTitle: "Developer Testing & Evaluation", coverage: "FULL", capability: "SAST/SCA scanning in CI/CD with automated PR comments" },
  { framework: "NIST 800-53", controlId: "AU-6", controlTitle: "Audit Record Review", coverage: "PARTIAL", capability: "Audit logging of all scan events, finding triage, and remediation" },
  // CMMC
  { framework: "CMMC Level 2", controlId: "SI.L2-3.14.1", controlTitle: "Flaw Remediation", coverage: "FULL", capability: "Vulnerability detection + fix recommendations with severity triage" },
  { framework: "CMMC Level 2", controlId: "SC.L2-3.13.1", controlTitle: "Boundary Protection", coverage: "FULL", capability: "IaC scanning for network configuration, TLS, and firewall rules" },
  { framework: "CMMC Level 2", controlId: "CM.L2-3.4.2", controlTitle: "Security Configuration Enforcement", coverage: "FULL", capability: "Terraform/Docker/K8s configuration scanning against CIS benchmarks" },
  { framework: "CMMC Level 2", controlId: "RM.L2-3.11.2", controlTitle: "Vulnerability Scanning", coverage: "FULL", capability: "Multi-ecosystem dependency scanning with OSV + npm audit" },
  // SOC 2
  { framework: "SOC 2 Type II", controlId: "CC6.1", controlTitle: "Logical Access Security", coverage: "FULL", capability: "Secrets detection prevents credential exposure in code" },
  { framework: "SOC 2 Type II", controlId: "CC6.8", controlTitle: "Vulnerability Management", coverage: "FULL", capability: "Full SCA pipeline with CVE identification and CVSS scoring" },
  { framework: "SOC 2 Type II", controlId: "CC7.1", controlTitle: "Detection of Changes", coverage: "FULL", capability: "PR-level scanning detects new vulnerabilities before merge" },
  // FedRAMP
  { framework: "FedRAMP Moderate", controlId: "RA-5", controlTitle: "Vulnerability Scanning", coverage: "FULL", capability: "Continuous automated scanning with SARIF output for toolchain integration" },
  { framework: "FedRAMP Moderate", controlId: "SI-2", controlTitle: "Flaw Remediation", coverage: "FULL", capability: "Automated POAM generation from scan findings" },
  { framework: "FedRAMP Moderate", controlId: "CM-6", controlTitle: "Configuration Settings", coverage: "FULL", capability: "IaC scanning validates infrastructure against security baselines" },
  // OWASP ASVS
  { framework: "OWASP ASVS 4.0", controlId: "V14.2", controlTitle: "Dependency", coverage: "FULL", capability: "SBOM generation + known vulnerability detection across 10 ecosystems" },
  { framework: "OWASP ASVS 4.0", controlId: "V1.14", controlTitle: "Configuration", coverage: "FULL", capability: "IaC scanning for misconfigurations in cloud infrastructure" },
  // SSDF
  { framework: "NIST SSDF 1.1", controlId: "PW.4", controlTitle: "Reuse Existing Software", coverage: "FULL", capability: "CycloneDX SBOM generation with supply chain vulnerability tracking" },
  { framework: "NIST SSDF 1.1", controlId: "PS.1", controlTitle: "Protect Software", coverage: "FULL", capability: "Secrets scanning prevents credential leaks in source code" },
  { framework: "NIST SSDF 1.1", controlId: "PO.1", controlTitle: "Define Security Requirements", coverage: "PARTIAL", capability: "Compliance mapping connects findings to framework controls" },
];

// ── Framework Summaries ───────────────────────────────────────────────

interface FrameworkInfo {
  name: string;
  id: string;
  controls: number;
  description: string;
  applicability: string;
}

const FRAMEWORKS: FrameworkInfo[] = [
  {
    name: "NIST SP 800-53 Rev 5",
    id: "nist-800-53",
    controls: 45,
    description:
      "The gold standard for federal information system security. NIST 800-53 provides a comprehensive catalog of security and privacy controls for organizational information systems. Revision 5 introduced supply chain risk management controls (SR family) and strengthened developer security testing requirements (SA-11).",
    applicability:
      "Required for FISMA compliance. Foundation for FedRAMP and GovRAMP. Widely adopted by defense contractors and critical infrastructure operators.",
  },
  {
    name: "CMMC Level 2",
    id: "cmmc-level2",
    controls: 33,
    description:
      "The Cybersecurity Maturity Model Certification establishes cybersecurity requirements for the Defense Industrial Base (DIB). Level 2 aligns with NIST SP 800-171 and requires 110 practices across 14 domains including vulnerability management (SI), configuration management (CM), and risk assessment (RM).",
    applicability:
      "Mandatory for DoD contractors handling Controlled Unclassified Information (CUI). Required for contract eligibility starting 2025.",
  },
  {
    name: "SOC 2 Type II",
    id: "soc2-type2",
    controls: 7,
    description:
      "The AICPA's Trust Services Criteria for service organizations. SOC 2 evaluates controls for security, availability, processing integrity, confidentiality, and privacy. CC6 (Logical and Physical Access Controls) and CC7 (System Operations) are directly relevant to vulnerability management.",
    applicability:
      "Required by enterprise buyers for SaaS vendors. Standard for B2B software companies and cloud service providers.",
  },
  {
    name: "FedRAMP Moderate",
    id: "fedramp-moderate",
    controls: 35,
    description:
      "The Federal Risk and Authorization Management Program provides a standardized approach to security assessment for cloud services. FedRAMP Moderate baseline includes 325 controls derived from NIST 800-53, with continuous monitoring requirements including monthly vulnerability scanning.",
    applicability:
      "Required for cloud service providers selling to federal agencies. Increasingly required by state and local governments.",
  },
  {
    name: "OWASP ASVS 4.0",
    id: "owasp-asvs",
    controls: 7,
    description:
      "The Application Security Verification Standard provides a framework for testing web application security controls. V14 (Configuration) covers dependency management, and V1 (Architecture) covers security design requirements.",
    applicability:
      "Industry standard for application security testing. Required by many enterprise security teams as part of SDLC security gates.",
  },
  {
    name: "NIST SSDF 1.1",
    id: "nist-ssdf",
    controls: 8,
    description:
      "The Secure Software Development Framework describes practices for producing secure software. Organized into four groups: Prepare (PO), Protect (PS), Produce (PW), and Respond (RV). Directly addresses software supply chain security.",
    applicability:
      "Referenced in Executive Order 14028 (Improving the Nation's Cybersecurity). Required for software sold to the federal government.",
  },
];

// ── Document ──────────────────────────────────────────────────────────

export function ComplianceWhitepaper() {
  return (
    <Document
      title="CVERiskPilot Compliance Whitepaper"
      author="CVERiskPilot LLC"
      subject="How CVERiskPilot Maps Vulnerability Findings to Compliance Frameworks"
    >
      {/* ─── Cover Page ─── */}
      <Page size="LETTER" style={s.coverPage}>
        <Text style={s.coverTag}>COMPLIANCE WHITEPAPER</Text>
        <Text style={s.coverTitle}>
          Multi-Framework{"\n"}Compliance Review
        </Text>
        <Text style={s.coverSubtitle}>
          How CVERiskPilot Automates Vulnerability-to-Control{"\n"}
          Mapping Across NIST 800-53, CMMC, SOC 2, FedRAMP,{"\n"}
          OWASP ASVS, and NIST SSDF
        </Text>
        <Text style={s.coverMeta}>CVERiskPilot LLC</Text>
        <Text style={s.coverMeta}>100% Veteran Owned | Texas, USA</Text>
        <Text style={s.coverMeta}>
          Published: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Text>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>cveriskpilot.com</Text>
          <Text style={s.coverFooterText}>Confidential</Text>
        </View>
      </Page>

      {/* ─── Table of Contents ─── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Table of Contents" />
        <Text style={s.h1}>Table of Contents</Text>

        <Text style={s.tocSection}>Overview</Text>
        <View style={s.tocEntry}><Text style={s.tocLabel}>Executive Summary</Text><Text style={s.tocPage}>3</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>Product Overview</Text><Text style={s.tocPage}>3</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>Supported Frameworks (6)</Text><Text style={s.tocPage}>4</Text></View>

        <Text style={s.tocSection}>Compliance Frameworks</Text>
        <View style={s.tocEntry}><Text style={s.tocLabel}>NIST SP 800-53 Rev 5</Text><Text style={s.tocPage}>4</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>CMMC Level 2</Text><Text style={s.tocPage}>5</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>SOC 2 Type II</Text><Text style={s.tocPage}>5</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>FedRAMP Moderate</Text><Text style={s.tocPage}>5</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>OWASP ASVS 4.0</Text><Text style={s.tocPage}>6</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>NIST SSDF 1.1</Text><Text style={s.tocPage}>6</Text></View>

        <Text style={s.tocSection}>Challenges &amp; Solutions</Text>
        <View style={s.tocEntry}><Text style={s.tocLabel}>Challenges Implementing Controls</Text><Text style={s.tocPage}>7</Text></View>
        <View style={s.tocEntry}><Text style={s.tocLabel}>CVERiskPilot Capabilities</Text><Text style={s.tocPage}>7</Text></View>

        <Text style={s.tocSection}>Control Mapping</Text>
        <View style={s.tocEntry}><Text style={s.tocLabel}>Capability Matrix — Full Control Mapping</Text><Text style={s.tocPage}>8</Text></View>

        <Footer />
      </Page>

      {/* ─── Executive Summary + Product Overview ─── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Executive Summary" />

        <Text style={s.h1}>Executive Summary</Text>
        <Text style={s.body}>
          CVERiskPilot is a vulnerability management platform purpose-built for GRC and compliance teams. It ingests scan results from CI/CD pipelines, enriches findings with CVE data and CVSS scores, performs AI-powered triage, and automatically maps vulnerabilities to compliance framework controls.
        </Text>
        <Text style={s.body}>
          This whitepaper demonstrates how CVERiskPilot addresses vulnerability management requirements across six major compliance frameworks: NIST SP 800-53 Rev 5, CMMC Level 2, SOC 2 Type II, FedRAMP Moderate, OWASP ASVS 4.0, and NIST SSDF 1.1. Each framework section describes the standard, its applicability, and how CVERiskPilot capabilities map to specific controls.
        </Text>

        <View style={s.callout}>
          <Text style={s.calloutText}>
            CVERiskPilot maps findings from 10+ scanner ecosystems to 135+ compliance controls across 6 frameworks — automatically, on every commit.
          </Text>
        </View>

        <Text style={s.h2}>Product Overview</Text>
        <Text style={s.body}>
          CVERiskPilot provides a unified vulnerability management lifecycle — from detection through remediation — with compliance mapping built into every step:
        </Text>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>6</Text>
            <Text style={s.statLabel}>Compliance Frameworks</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>135+</Text>
            <Text style={s.statLabel}>Mapped Controls</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>10</Text>
            <Text style={s.statLabel}>Scanner Ecosystems</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>3</Text>
            <Text style={s.statLabel}>Scanner Types</Text>
          </View>
        </View>

        <Text style={s.h3}>Core Capabilities</Text>
        <Text style={s.bullet}>
          {"\u2022"} Dependency scanning (SBOM) across npm, pip, Go, Cargo, Gem, Maven, Gradle + more
        </Text>
        <Text style={s.bullet}>
          {"\u2022"} Secrets detection for API keys, tokens, credentials, and certificates
        </Text>
        <Text style={s.bullet}>
          {"\u2022"} Infrastructure-as-Code scanning for Terraform, Docker, and Kubernetes
        </Text>
        <Text style={s.bullet}>
          {"\u2022"} CVE identification via OSV API + npm audit with CVSS scores and fix versions
        </Text>
        <Text style={s.bullet}>
          {"\u2022"} AI-powered triage with TRUE_POSITIVE / FALSE_POSITIVE / NEEDS_REVIEW verdicts
        </Text>
        <Text style={s.bullet}>
          {"\u2022"} Automated compliance mapping from CWE IDs to framework control families
        </Text>
        <Text style={s.bullet}>
          {"\u2022"} POAM generation, case management, and remediation tracking
        </Text>
        <Text style={s.bullet}>
          {"\u2022"} CI/CD integration via GitHub Action, CLI, and API with PR comment reporting
        </Text>

        <Footer />
      </Page>

      {/* ─── Frameworks: NIST, CMMC, SOC2 ─── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Compliance Frameworks" />

        <Text style={s.h1}>Supported Compliance Frameworks</Text>
        <Text style={s.body}>
          CVERiskPilot implements cross-framework compliance mapping that connects vulnerability findings to specific controls across all six frameworks simultaneously. When a finding with CWE-89 (SQL Injection) is detected, CVERiskPilot automatically identifies the affected controls in NIST 800-53 (SI-10), CMMC (SI.L2-3.14.1), SOC 2 (CC6.1), FedRAMP (SI-10), ASVS (V5.3), and SSDF (PW.4).
        </Text>

        {FRAMEWORKS.slice(0, 3).map((fw) => (
          <View key={fw.id}>
            <Text style={s.h2}>{fw.name}</Text>
            <Text style={s.bodySmall}>{fw.controls} controls mapped | Framework ID: {fw.id}</Text>
            <Text style={s.body}>{fw.description}</Text>
            <Text style={s.body}>
              <Text style={{ fontWeight: "bold" }}>Applicability: </Text>
              {fw.applicability}
            </Text>
          </View>
        ))}

        <Footer />
      </Page>

      {/* ─── Frameworks: FedRAMP, ASVS, SSDF ─── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Compliance Frameworks (continued)" />

        {FRAMEWORKS.slice(3).map((fw) => (
          <View key={fw.id}>
            <Text style={s.h2}>{fw.name}</Text>
            <Text style={s.bodySmall}>{fw.controls} controls mapped | Framework ID: {fw.id}</Text>
            <Text style={s.body}>{fw.description}</Text>
            <Text style={s.body}>
              <Text style={{ fontWeight: "bold" }}>Applicability: </Text>
              {fw.applicability}
            </Text>
          </View>
        ))}

        <Footer />
      </Page>

      {/* ─── Challenges + CVERiskPilot Approach ─── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Challenges & Solutions" />

        <Text style={s.h1}>Challenges Implementing Controls</Text>

        <Text style={s.h3}>Complexity of Multi-Framework Compliance</Text>
        <Text style={s.body}>
          Organizations pursuing multiple certifications (e.g., FedRAMP + SOC 2 + CMMC) face overlapping but non-identical control requirements. Manually mapping vulnerability findings to controls across frameworks is error-prone and time-consuming. A single CVE may affect different controls in each framework, and auditors expect precise, documented mapping.
        </Text>

        <Text style={s.h3}>Maintaining a Plan of Action & Milestones (POAM)</Text>
        <Text style={s.body}>
          Federal compliance programs require POAMs documenting known vulnerabilities, their risk level, assigned owners, and remediation timelines. Manually creating and updating POAMs from scan results is a major audit preparation bottleneck — often requiring days of manual effort per assessment cycle.
        </Text>

        <Text style={s.h3}>Developer Friction in Security Workflows</Text>
        <Text style={s.body}>
          Security tools that operate outside the developer workflow create blind spots. Findings discovered after deployment are 10-100x more expensive to remediate than those caught in CI/CD. Teams need vulnerability detection at the pull request level, with actionable recommendations — not just alerts.
        </Text>

        <Text style={s.h1}>How CVERiskPilot Solves These Challenges</Text>

        <Text style={s.h3}>Automated Cross-Framework Mapping</Text>
        <Text style={s.body}>
          CVERiskPilot uses a CWE-to-control mapping engine that automatically connects every vulnerability finding to affected controls across all 6 frameworks simultaneously. When you scan once, you get compliance impact across NIST 800-53, CMMC, SOC 2, FedRAMP, ASVS, and SSDF.
        </Text>

        <Text style={s.h3}>Automated POAM Generation</Text>
        <Text style={s.body}>
          Every scan automatically generates FedRAMP-style POAM entries with weakness descriptions, CVE IDs, severity, remediation milestones, and scheduled completion dates. POAMs are versioned, tracked, and exportable as PDF for auditor delivery.
        </Text>

        <Text style={s.h3}>Shift-Left Pipeline Integration</Text>
        <Text style={s.body}>
          The CVERiskPilot GitHub Action runs scans on every PR, posts compliance-aware comments with severity badges and triage recommendations, and can block merges based on configurable severity thresholds. Developers see fix commands directly in the PR comment.
        </Text>

        <View style={s.callout}>
          <Text style={s.calloutText}>
            CVERiskPilot reduces POAM preparation time from days to minutes by automatically generating entries from scan findings with full compliance mapping.
          </Text>
        </View>

        <Footer />
      </Page>

      {/* ─── Capability Matrix ─── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Capability Matrix" />

        <Text style={s.h1}>Capability Matrix — Control Mapping</Text>
        <Text style={s.body}>
          The following matrix details how CVERiskPilot capabilities map to specific controls across all six supported compliance frameworks.
        </Text>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, { width: "15%" }]}>Framework</Text>
          <Text style={[s.tableHeaderCell, { width: "10%" }]}>Control</Text>
          <Text style={[s.tableHeaderCell, { width: "20%" }]}>Control Title</Text>
          <Text style={[s.tableHeaderCell, { width: "10%", textAlign: "center" as const }]}>Coverage</Text>
          <Text style={[s.tableHeaderCell, { width: "45%" }]}>CVERiskPilot Capability</Text>
        </View>

        {CAPABILITIES.slice(0, 16).map((row, idx) => (
          <View key={`${row.controlId}-${idx}`} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCell, { width: "15%" }]}>{row.framework}</Text>
            <Text style={[s.tableCellBold, { width: "10%" }]}>{row.controlId}</Text>
            <Text style={[s.tableCell, { width: "20%" }]}>{row.controlTitle}</Text>
            <View style={{ width: "10%", alignItems: "center" as const }}>
              <SeverityBadge level={row.coverage} />
            </View>
            <Text style={[s.tableCell, { width: "45%" }]}>{row.capability}</Text>
          </View>
        ))}

        <Footer />
      </Page>

      {/* ─── Capability Matrix (continued) ─── */}
      <Page size="LETTER" style={s.page}>
        <Header title="Capability Matrix (continued)" />

        <Text style={s.h2}>Control Mapping (continued)</Text>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, { width: "15%" }]}>Framework</Text>
          <Text style={[s.tableHeaderCell, { width: "10%" }]}>Control</Text>
          <Text style={[s.tableHeaderCell, { width: "20%" }]}>Control Title</Text>
          <Text style={[s.tableHeaderCell, { width: "10%", textAlign: "center" as const }]}>Coverage</Text>
          <Text style={[s.tableHeaderCell, { width: "45%" }]}>CVERiskPilot Capability</Text>
        </View>

        {CAPABILITIES.slice(16).map((row, idx) => (
          <View key={`${row.controlId}-${idx}`} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.tableCell, { width: "15%" }]}>{row.framework}</Text>
            <Text style={[s.tableCellBold, { width: "10%" }]}>{row.controlId}</Text>
            <Text style={[s.tableCell, { width: "20%" }]}>{row.controlTitle}</Text>
            <View style={{ width: "10%", alignItems: "center" as const }}>
              <SeverityBadge level={row.coverage} />
            </View>
            <Text style={[s.tableCell, { width: "45%" }]}>{row.capability}</Text>
          </View>
        ))}

        <Text style={s.h2}>Coverage Summary</Text>
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>23</Text>
            <Text style={s.statLabel}>Controls Mapped</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: c.green }]}>
            <Text style={[s.statValue, { color: c.green }]}>21</Text>
            <Text style={s.statLabel}>Full Coverage</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: c.accent }]}>
            <Text style={[s.statValue, { color: c.accent }]}>2</Text>
            <Text style={s.statLabel}>Partial Coverage</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: c.primaryDark }]}>
            <Text style={[s.statValue, { color: c.primaryDark }]}>91%</Text>
            <Text style={s.statLabel}>Full Coverage Rate</Text>
          </View>
        </View>

        <Text style={s.h2}>Getting Started</Text>
        <Text style={s.body}>
          Run your first compliance-mapped scan in under 60 seconds:
        </Text>
        <View style={{ backgroundColor: c.primaryDark, padding: 12, borderRadius: 4, marginVertical: 8 }}>
          <Text style={{ fontSize: 10, fontFamily: "Courier", color: c.accent }}>
            npx @cveriskpilot/scan --preset federal --format json
          </Text>
        </View>
        <Text style={s.body}>
          For more information, visit{" "}
          <Link src="https://cveriskpilot.com" style={s.link}>cveriskpilot.com</Link>
          {" "}or contact us at{" "}
          <Link src="mailto:sales@cveriskpilot.com" style={s.link}>sales@cveriskpilot.com</Link>.
        </Text>

        <Footer />
      </Page>
    </Document>
  );
}
