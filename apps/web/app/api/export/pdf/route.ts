import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@cveriskpilot/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  generatePdfDocument,
  type PdfReportMeta,
  type PdfCase,
  type PdfFinding,
  type PoamItem,
  type ComplianceScore,
  type PdfReportType,
} from "@/lib/export/pdf-export";

/**
 * POST /api/export/pdf
 *
 * Renders a PDF report server-side using @react-pdf/renderer and returns
 * the binary PDF directly with appropriate headers for download.
 *
 * Body: {
 *   type: "executive" | "findings" | "cases" | "poam";
 *   orgId?: string;
 *   filters?: {
 *     severity?: string[];
 *     status?: string[];
 *     dateFrom?: string;
 *     dateTo?: string;
 *     clientId?: string;
 *   };
 *   dateRange?: { from: string; to: string };
 * }
 *
 * Returns: application/pdf binary stream with Content-Disposition: attachment
 *
 * NOTE: Currently uses sample data. Wire to Prisma queries once the data
 * layer is connected for production use.
 */

const VALID_TYPES = ["executive", "findings", "cases", "poam"] as const;

interface ExportRequest {
  type: PdfReportType;
  orgId?: string;
  filters?: {
    severity?: string[];
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
    clientId?: string;
  };
  dateRange?: { from: string; to: string };
}

// ── Sample data generators ────────────────────────────────────────────
// These provide realistic mock data for PDF rendering until the data
// layer is wired. Each generator returns typed arrays matching the PDF
// template interfaces.

function buildMeta(
  type: string,
  dateRange?: { from: string; to: string },
): PdfReportMeta {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const titles: Record<string, string> = {
    executive: "Executive Summary Report",
    findings: "Vulnerability Findings Report",
    cases: "Vulnerability Case Report",
    poam: "Plan of Action & Milestones",
  };
  return {
    orgName: "CVERiskPilot Demo Organization",
    generatedAt: now,
    reportTitle: titles[type] || "Report",
    dateRange: dateRange || { from: "2026-03-01", to: "2026-03-28" },
    totalScans: 4,
  };
}

function sampleCases(): PdfCase[] {
  return [
    {
      id: "case-001",
      title: "Apache Log4j Remote Code Execution (Log4Shell)",
      cveIds: ["CVE-2021-44228"],
      severity: "CRITICAL",
      cvssScore: 10.0,
      epssScore: 0.975,
      epssPercentile: 0.999,
      kevListed: true,
      kevDueDate: "2026-04-15",
      status: "IN_REMEDIATION",
      findingCount: 12,
      assignedToId: "usr-001",
      assignedTo: { id: "usr-001", name: "Jane Smith", email: "jane@example.com" },
      dueAt: "2026-04-10",
      firstSeenAt: "2026-03-05",
      lastSeenAt: "2026-03-27",
      description:
        "Apache Log4j2 2.0-beta9 through 2.15.0 (excluding security releases 2.12.2, 2.12.3, and 2.3.1) JNDI features do not protect against attacker-controlled LDAP and other JNDI related endpoints. An attacker who can control log messages or log message parameters can execute arbitrary code loaded from LDAP servers when message lookup substitution is enabled.",
      solution:
        "Upgrade to Log4j 2.17.1 or later. As an interim mitigation, set log4j2.formatMsgNoLookups=true or remove the JndiLookup class from the classpath.",
      affectedAssets: ["app-server-01", "app-server-02", "api-gateway-prod"],
    },
    {
      id: "case-002",
      title: "OpenSSL Buffer Overflow in X.509 Certificate Verification",
      cveIds: ["CVE-2022-3602", "CVE-2022-3786"],
      severity: "CRITICAL",
      cvssScore: 9.8,
      epssScore: 0.812,
      epssPercentile: 0.987,
      kevListed: true,
      kevDueDate: "2026-04-20",
      status: "NEW",
      findingCount: 8,
      assignedToId: null,
      assignedTo: null,
      dueAt: null,
      firstSeenAt: "2026-03-20",
      lastSeenAt: "2026-03-27",
      description:
        "A buffer overrun can be triggered in X.509 certificate verification, specifically in name constraint checking. An attacker can craft a malicious email address to overflow four attacker-controlled bytes on the stack.",
      solution:
        "Upgrade OpenSSL to 3.0.7 or later. Apply vendor patches for all affected systems.",
      affectedAssets: ["load-balancer-01", "web-proxy-02"],
    },
    {
      id: "case-003",
      title: "Spring4Shell Remote Code Execution",
      cveIds: ["CVE-2022-22965"],
      severity: "HIGH",
      cvssScore: 9.8,
      epssScore: 0.742,
      epssPercentile: 0.978,
      kevListed: true,
      kevDueDate: "2026-05-01",
      status: "TRIAGE",
      findingCount: 5,
      assignedToId: "usr-002",
      assignedTo: { id: "usr-002", name: "Bob Johnson", email: "bob@example.com" },
      dueAt: "2026-04-25",
      firstSeenAt: "2026-03-10",
      lastSeenAt: "2026-03-25",
      description:
        "A Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable to remote code execution via data binding.",
      solution: "Upgrade to Spring Framework 5.3.18+ or 5.2.20+.",
    },
    {
      id: "case-004",
      title: "Microsoft Exchange Server ProxyShell",
      cveIds: ["CVE-2021-34473", "CVE-2021-34523"],
      severity: "HIGH",
      cvssScore: 9.1,
      epssScore: 0.654,
      epssPercentile: 0.965,
      kevListed: false,
      kevDueDate: null,
      status: "IN_REMEDIATION",
      findingCount: 3,
      assignedToId: "usr-001",
      assignedTo: { id: "usr-001", name: "Jane Smith", email: "jane@example.com" },
      dueAt: "2026-04-30",
      firstSeenAt: "2026-03-08",
      lastSeenAt: "2026-03-26",
      description:
        "A combination of vulnerabilities in Microsoft Exchange Server allows pre-authenticated remote code execution.",
      solution:
        "Apply Microsoft security updates KB5001779 and ensure Exchange is fully patched.",
    },
    {
      id: "case-005",
      title: "PostgreSQL SQL Injection via Improper Quoting",
      cveIds: ["CVE-2025-1094"],
      severity: "HIGH",
      cvssScore: 8.1,
      epssScore: 0.321,
      epssPercentile: 0.92,
      kevListed: false,
      kevDueDate: null,
      status: "NEW",
      findingCount: 2,
      assignedToId: null,
      assignedTo: null,
      dueAt: null,
      firstSeenAt: "2026-03-22",
      lastSeenAt: "2026-03-27",
    },
    {
      id: "case-006",
      title: "Nginx HTTP/2 Rapid Reset DDoS Vector",
      cveIds: ["CVE-2023-44487"],
      severity: "MEDIUM",
      cvssScore: 7.5,
      epssScore: 0.185,
      epssPercentile: 0.85,
      kevListed: false,
      kevDueDate: null,
      status: "TRIAGE",
      findingCount: 6,
      assignedToId: "usr-003",
      assignedTo: { id: "usr-003", name: "Alice Chen", email: "alice@example.com" },
      dueAt: "2026-05-15",
      firstSeenAt: "2026-03-12",
      lastSeenAt: "2026-03-27",
    },
    {
      id: "case-007",
      title: "Node.js HTTP Request Smuggling via Transfer-Encoding",
      cveIds: ["CVE-2024-22019"],
      severity: "MEDIUM",
      cvssScore: 7.3,
      epssScore: 0.092,
      epssPercentile: 0.75,
      kevListed: false,
      kevDueDate: null,
      status: "IN_REMEDIATION",
      findingCount: 4,
      assignedToId: "usr-002",
      assignedTo: { id: "usr-002", name: "Bob Johnson", email: "bob@example.com" },
      dueAt: "2026-05-20",
      firstSeenAt: "2026-03-15",
      lastSeenAt: "2026-03-26",
    },
    {
      id: "case-008",
      title: "jQuery Cross-Site Scripting via HTML Parsing",
      cveIds: ["CVE-2020-11022"],
      severity: "MEDIUM",
      cvssScore: 6.1,
      epssScore: 0.045,
      epssPercentile: 0.62,
      kevListed: false,
      kevDueDate: null,
      status: "VERIFIED_CLOSED",
      findingCount: 3,
      assignedToId: "usr-003",
      assignedTo: { id: "usr-003", name: "Alice Chen", email: "alice@example.com" },
      dueAt: null,
      firstSeenAt: "2026-03-01",
      lastSeenAt: "2026-03-20",
    },
    {
      id: "case-009",
      title: "OpenSSH Information Disclosure",
      cveIds: ["CVE-2023-48795"],
      severity: "LOW",
      cvssScore: 5.9,
      epssScore: 0.028,
      epssPercentile: 0.55,
      kevListed: false,
      kevDueDate: null,
      status: "ACCEPTED_RISK",
      findingCount: 7,
      assignedToId: null,
      assignedTo: null,
      dueAt: null,
      firstSeenAt: "2026-03-05",
      lastSeenAt: "2026-03-25",
    },
    {
      id: "case-010",
      title: "TLS Certificate Uses Weak Signature Algorithm (SHA-1)",
      cveIds: [],
      severity: "LOW",
      cvssScore: 4.3,
      epssScore: 0.012,
      epssPercentile: 0.35,
      kevListed: false,
      kevDueDate: null,
      status: "NEW",
      findingCount: 2,
      assignedToId: null,
      assignedTo: null,
      dueAt: null,
      firstSeenAt: "2026-03-18",
      lastSeenAt: "2026-03-27",
    },
    {
      id: "case-011",
      title: "Server Exposes Version Information in HTTP Headers",
      cveIds: [],
      severity: "INFO",
      cvssScore: null,
      epssScore: null,
      epssPercentile: null,
      kevListed: false,
      kevDueDate: null,
      status: "NOT_APPLICABLE",
      findingCount: 15,
      assignedToId: null,
      assignedTo: null,
      dueAt: null,
      firstSeenAt: "2026-03-01",
      lastSeenAt: "2026-03-27",
    },
    {
      id: "case-012",
      title: "DNS Zone Transfer Permitted (AXFR)",
      cveIds: [],
      severity: "INFO",
      cvssScore: null,
      epssScore: null,
      epssPercentile: null,
      kevListed: false,
      kevDueDate: null,
      status: "FALSE_POSITIVE",
      findingCount: 1,
      assignedToId: null,
      assignedTo: null,
      dueAt: null,
      firstSeenAt: "2026-03-15",
      lastSeenAt: "2026-03-15",
    },
  ];
}

function sampleFindings(): PdfFinding[] {
  const cases = sampleCases();
  const scannerTypes = ["VM", "SCA", "DAST", "SAST", "CONTAINER", "VM", "SCA", "DAST"] as const;
  const scannerNames = ["Nessus", "Snyk", "OWASP ZAP", "Semgrep", "Trivy", "Qualys", "Dependabot", "Burp Suite"];
  return cases.slice(0, 8).map((c, i) => ({
    id: `finding-${String(i + 1).padStart(3, "0")}`,
    organizationId: "org-demo-001",
    clientId: "client-demo-001",
    assetId: `asset-${String(i + 1).padStart(3, "0")}`,
    scannerType: scannerTypes[i],
    scannerName: scannerNames[i] || "Unknown Scanner",
    discoveredAt: "2026-03-15T10:00:00Z",
    createdAt: "2026-03-15T10:00:00Z",
    asset: {
      id: `asset-${String(i + 1).padStart(3, "0")}`,
      name: `host-${10 + i}.example.com`,
      type: "SERVER",
      environment: "PRODUCTION",
      criticality: c.severity,
    },
    vulnerabilityCase: c.cveIds.length > 0
      ? {
          id: c.id,
          title: c.title,
          severity: c.severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
          status: c.status as "NEW" | "TRIAGE" | "IN_REMEDIATION" | "FIXED_PENDING_VERIFICATION" | "VERIFIED_CLOSED" | "REOPENED" | "ACCEPTED_RISK" | "FALSE_POSITIVE" | "NOT_APPLICABLE" | "DUPLICATE",
          cveIds: c.cveIds,
          epssScore: c.epssScore,
          kevListed: c.kevListed,
        }
      : null,
    title: c.title,
    cveId: c.cveIds[0] || null,
    description:
      (c as PdfCase).description ||
      `Vulnerability detected on host requiring attention. ${c.title}.`,
    severity: c.severity,
    cvssScore: c.cvssScore,
    riskScore: c.cvssScore ? c.cvssScore * (c.epssScore || 0.1) * 10 : null,
    status: c.status,
    solution:
      (c as PdfCase).solution ||
      "Apply vendor patches and verify remediation.",
    affectedHost: `192.168.1.${10 + i}`,
    affectedPort: [443, 8443, 80, 22, 5432, 3306, 8080, 3000][i] || null,
    assignedTo: c.assignedTo
      ? { name: c.assignedTo.name, email: c.assignedTo.email }
      : null,
  }));
}

function samplePoamItems(): PoamItem[] {
  return [
    {
      id: "poam-001",
      weakness: "Remote Code Execution via Log4j JNDI Injection",
      cveIds: ["CVE-2021-44228"],
      severity: "CRITICAL",
      pointOfContact: "Jane Smith, Security",
      resources: "Security Team, DevOps",
      scheduledCompletionDate: "2026-04-15",
      milestones:
        "1) Identify affected systems (3/28) 2) Deploy patches (4/5) 3) Verify (4/15)",
      status: "In Progress",
      comments: "12 systems identified. 4 patched so far.",
    },
    {
      id: "poam-002",
      weakness: "Buffer Overflow in OpenSSL X.509 Verification",
      cveIds: ["CVE-2022-3602", "CVE-2022-3786"],
      severity: "CRITICAL",
      pointOfContact: "Bob Johnson, Infrastructure",
      resources: "Infrastructure Team",
      scheduledCompletionDate: "2026-04-20",
      milestones:
        "1) Inventory OpenSSL versions (3/25) 2) Stage updates (4/10) 3) Deploy (4/20)",
      status: "Planned",
      comments: "Awaiting change window approval.",
    },
    {
      id: "poam-003",
      weakness: "Spring Framework RCE via Data Binding (Spring4Shell)",
      cveIds: ["CVE-2022-22965"],
      severity: "HIGH",
      pointOfContact: "Bob Johnson, Infrastructure",
      resources: "App Dev Team",
      scheduledCompletionDate: "2026-04-25",
      milestones:
        "1) Assess impact (3/28) 2) Update Spring dependencies (4/15) 3) Test (4/25)",
      status: "In Progress",
      comments: "3 of 5 applications updated.",
    },
    {
      id: "poam-004",
      weakness: "Exchange Server Pre-Auth RCE (ProxyShell)",
      cveIds: ["CVE-2021-34473", "CVE-2021-34523"],
      severity: "HIGH",
      pointOfContact: "Jane Smith, Security",
      resources: "IT Operations",
      scheduledCompletionDate: "2026-04-30",
      milestones:
        "1) Apply CU patches (4/10) 2) Validate mail flow (4/20) 3) Close (4/30)",
      status: "In Progress",
      comments: "Exchange 2019 CU14 staged for deployment.",
    },
    {
      id: "poam-005",
      weakness: "PostgreSQL SQL Injection via Improper Quoting",
      cveIds: ["CVE-2025-1094"],
      severity: "HIGH",
      pointOfContact: "Alice Chen, Database",
      resources: "DBA Team, App Dev",
      scheduledCompletionDate: "2026-05-10",
      milestones:
        "1) Upgrade PostgreSQL (4/15) 2) Review app queries (4/30) 3) Pen test (5/10)",
      status: "Planned",
      comments: "Upgrade path identified. Downtime window TBD.",
    },
    {
      id: "poam-006",
      weakness: "HTTP/2 Rapid Reset DDoS (Nginx)",
      cveIds: ["CVE-2023-44487"],
      severity: "MEDIUM",
      pointOfContact: "Alice Chen, Database",
      resources: "DevOps",
      scheduledCompletionDate: "2026-05-15",
      milestones: "1) Update Nginx (5/1) 2) Configure rate limits (5/10) 3) Verify (5/15)",
      status: "Planned",
      comments: "Low urgency — WAF mitigates external exposure.",
    },
  ];
}

function sampleComplianceScores(): ComplianceScore[] {
  return [
    { framework: "NIST 800-53", score: 72, controlsPassed: 187, controlsTotal: 260 },
    { framework: "FedRAMP", score: 68, controlsPassed: 224, controlsTotal: 329 },
    { framework: "SOC 2", score: 85, controlsPassed: 51, controlsTotal: 60 },
    { framework: "ASVS 4.0", score: 61, controlsPassed: 178, controlsTotal: 292 },
  ];
}

// ── Route handlers ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as ExportRequest;

    // Validate type
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return NextResponse.json(
        {
          error: "Invalid report type",
          message: `type must be one of: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `cveriskpilot-${body.type}-report-${timestamp}.pdf`;

    const meta = buildMeta(body.type, body.dateRange);

    // Build the PDF document element for the requested report type.
    // TODO: Replace sample data with actual DB queries (Prisma) filtered
    // by orgId, severity, status, dateRange, and clientId.
    const doc = generatePdfDocument({
      type: body.type,
      meta,
      cases:
        body.type === "executive" || body.type === "cases"
          ? sampleCases()
          : undefined,
      findings: body.type === "findings" ? sampleFindings() : undefined,
      poamItems: body.type === "poam" ? samplePoamItems() : undefined,
      complianceScores:
        body.type === "executive" ? sampleComplianceScores() : undefined,
    });

    // Render the React PDF document to an in-memory buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeBuffer = await renderToBuffer(doc as any);

    // Return the PDF as a downloadable binary response
    return new Response(Buffer.from(nodeBuffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(nodeBuffer.byteLength),
        "Cache-Control": "no-store",
        "X-Report-Type": body.type,
        "X-Generated-At": now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[PDF Export] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF export",
        message:
          error instanceof Error ? error.message : "Unknown rendering error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json({
    availableTypes: VALID_TYPES,
    description:
      "POST a { type, orgId?, filters?, dateRange? } body to generate and download a PDF export.",
    usage: {
      method: "POST",
      contentType: "application/json",
      body: {
        type: "executive | findings | cases | poam (required)",
        orgId: "string (optional, defaults to session org)",
        dateRange: "{ from: string, to: string } (optional)",
        filters: {
          severity: "string[] (optional)",
          status: "string[] (optional)",
          dateFrom: "string (optional)",
          dateTo: "string (optional)",
          clientId: "string (optional)",
        },
      },
      response: "application/pdf binary download",
    },
    templates: {
      executive:
        "Executive summary with severity bar chart, EPSS/risk metrics, compliance status, top-10 priority cases, and actionable recommendations",
      findings:
        "Tabular findings index with severity distribution chart, plus detailed finding cards with CVE, CVSS, EPSS, asset, and remediation info",
      cases:
        "Case-centric report with linked findings, AI remediation advice, and SLA/KEV due dates",
      poam: "FedRAMP-style Plan of Action & Milestones table with summary metrics, severity breakdown, and overdue tracking",
    },
  });
}
