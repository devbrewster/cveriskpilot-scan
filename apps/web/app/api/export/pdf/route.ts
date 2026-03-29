import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { requireAuth, getExportLimiter } from "@cveriskpilot/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
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
 */

const VALID_TYPES = ["executive", "findings", "cases", "poam"] as const;

interface ExportRequest {
  type: PdfReportType;
  filters?: {
    severity?: string[];
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
    clientId?: string;
  };
  dateRange?: { from: string; to: string };
}

// ── Data loaders (real Prisma queries) ───────────────────────────────

async function buildMeta(
  orgId: string,
  type: string,
  dateRange?: { from: string; to: string },
): Promise<PdfReportMeta> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const titles: Record<string, string> = {
    executive: "Executive Summary Report",
    findings: "Vulnerability Findings Report",
    cases: "Vulnerability Case Report",
    poam: "Plan of Action & Milestones",
  };

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  const totalScans = await prisma.uploadJob.count({
    where: {
      organizationId: orgId,
      status: "COMPLETED",
    },
  });

  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  return {
    orgName: org?.name ?? "Organization",
    generatedAt: now,
    reportTitle: titles[type] || "Report",
    dateRange: dateRange || {
      from: defaultFrom.toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    },
    totalScans,
  };
}

async function loadCases(
  orgId: string,
  filters?: ExportRequest["filters"],
): Promise<PdfCase[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId: orgId };
  if (filters?.severity?.length) {
    where.severity = { in: filters.severity };
  }
  if (filters?.status?.length) {
    where.status = { in: filters.status };
  }
  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  const cases = await prisma.vulnerabilityCase.findMany({
    where,
    orderBy: [{ severity: "asc" }, { epssScore: "desc" }],
    take: 200,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      findings: {
        select: {
          asset: { select: { name: true } },
        },
        take: 50,
      },
    },
  });

  return cases.map((c) => ({
    id: c.id,
    title: c.title,
    cveIds: c.cveIds,
    severity: c.severity,
    cvssScore: c.cvssScore,
    epssScore: c.epssScore,
    epssPercentile: c.epssPercentile,
    kevListed: c.kevListed,
    kevDueDate: c.kevDueDate?.toISOString().slice(0, 10) ?? null,
    status: c.status,
    findingCount: c.findingCount,
    assignedToId: c.assignedToId,
    assignedTo: c.assignedTo
      ? { id: c.assignedTo.id, name: c.assignedTo.name, email: c.assignedTo.email }
      : null,
    dueAt: c.dueAt?.toISOString().slice(0, 10) ?? null,
    firstSeenAt: c.firstSeenAt.toISOString(),
    lastSeenAt: c.lastSeenAt.toISOString(),
    description: c.description ?? undefined,
    solution: c.remediationNotes ?? undefined,
    affectedAssets: [
      ...new Set(c.findings.map((f) => f.asset.name)),
    ],
  }));
}

async function loadFindings(
  orgId: string,
  filters?: ExportRequest["filters"],
): Promise<PdfFinding[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { organizationId: orgId };
  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters?.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }
  // Severity and status live on the linked case
  if (filters?.severity?.length) {
    where.vulnerabilityCase = {
      ...where.vulnerabilityCase,
      severity: { in: filters.severity },
    };
  }
  if (filters?.status?.length) {
    where.vulnerabilityCase = {
      ...where.vulnerabilityCase,
      status: { in: filters.status },
    };
  }

  const findings = await prisma.finding.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      asset: {
        select: { id: true, name: true, type: true, environment: true, criticality: true },
      },
      vulnerabilityCase: {
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          cveIds: true,
          epssScore: true,
          kevListed: true,
          cvssScore: true,
          description: true,
          remediationNotes: true,
          assignedTo: { select: { name: true, email: true } },
        },
      },
    },
  });

  return findings.map((f) => ({
    id: f.id,
    organizationId: f.organizationId,
    clientId: f.clientId,
    assetId: f.assetId,
    scannerType: f.scannerType,
    scannerName: f.scannerName,
    discoveredAt: f.discoveredAt.toISOString(),
    createdAt: f.createdAt.toISOString(),
    asset: f.asset
      ? {
          id: f.asset.id,
          name: f.asset.name,
          type: f.asset.type,
          environment: f.asset.environment,
          criticality: f.asset.criticality,
        }
      : null,
    vulnerabilityCase: f.vulnerabilityCase
      ? {
          id: f.vulnerabilityCase.id,
          title: f.vulnerabilityCase.title,
          severity: f.vulnerabilityCase.severity,
          status: f.vulnerabilityCase.status,
          cveIds: f.vulnerabilityCase.cveIds,
          epssScore: f.vulnerabilityCase.epssScore,
          kevListed: f.vulnerabilityCase.kevListed,
        }
      : null,
    title: f.vulnerabilityCase?.title ?? f.scannerName + " finding",
    cveId: f.vulnerabilityCase?.cveIds?.[0] ?? null,
    description:
      f.vulnerabilityCase?.description ??
      `Finding detected by ${f.scannerName} on ${f.asset?.name ?? "unknown asset"}.`,
    severity: f.vulnerabilityCase?.severity ?? ("INFO" as const),
    cvssScore: f.vulnerabilityCase?.cvssScore ?? null,
    riskScore: f.vulnerabilityCase?.cvssScore
      ? f.vulnerabilityCase.cvssScore * (f.vulnerabilityCase.epssScore || 0.1) * 10
      : null,
    status: f.vulnerabilityCase?.status ?? "NEW",
    solution: f.vulnerabilityCase?.remediationNotes ?? null,
    affectedHost: f.asset?.name ?? "unknown",
    affectedPort: null,
    assignedTo: f.vulnerabilityCase?.assignedTo
      ? { name: f.vulnerabilityCase.assignedTo.name, email: f.vulnerabilityCase.assignedTo.email }
      : null,
  }));
}

async function loadPoamItems(
  orgId: string,
  filters?: ExportRequest["filters"],
): Promise<PoamItem[]> {
  // POAM items are derived from open vulnerability cases that need remediation
  // (status IN_REMEDIATION, TRIAGE, NEW, REOPENED) — these represent active
  // plans of action.
  const openStatuses = ["NEW", "TRIAGE", "IN_REMEDIATION", "REOPENED"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    organizationId: orgId,
    status: { in: filters?.status?.length ? filters.status : openStatuses },
  };
  if (filters?.severity?.length) {
    where.severity = { in: filters.severity };
  }
  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  const cases = await prisma.vulnerabilityCase.findMany({
    where,
    orderBy: [{ severity: "asc" }, { dueAt: "asc" }],
    take: 200,
    include: {
      assignedTo: { select: { name: true } },
    },
  });

  const statusMap: Record<string, string> = {
    NEW: "Planned",
    TRIAGE: "Planned",
    IN_REMEDIATION: "In Progress",
    REOPENED: "In Progress",
    FIXED_PENDING_VERIFICATION: "Completed - Pending Verification",
  };

  return cases.map((c) => ({
    id: c.id,
    weakness: c.title,
    cveIds: c.cveIds,
    severity: c.severity,
    pointOfContact: c.assignedTo?.name ?? "Unassigned",
    resources: "Security Team",
    scheduledCompletionDate: c.dueAt?.toISOString().slice(0, 10) ?? null,
    milestones: c.remediationNotes ?? "Remediation plan pending.",
    status: statusMap[c.status] ?? c.status,
    comments: c.description ?? "",
  }));
}

async function loadComplianceScores(
  _orgId: string,
): Promise<ComplianceScore[]> {
  // Compliance model not yet in Prisma schema — return empty array.
  // Will be wired once the compliance data model is added.
  return [];
}

// ── Route handlers ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // Rate limiting — 5 req/min per user
    try {
      const limiter = getExportLimiter();
      const rl = await limiter.check(`export_pdf:${session.userId}`);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Too many export requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } },
        );
      }
    } catch {
      // Redis not available — skip rate limiting
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

    const orgId = session.organizationId;
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `cveriskpilot-${body.type}-report-${timestamp}.pdf`;

    const meta = await buildMeta(orgId, body.type, body.dateRange);

    // Load real data from Prisma scoped to the user's organization
    const doc = generatePdfDocument({
      type: body.type,
      meta,
      cases:
        body.type === "executive" || body.type === "cases"
          ? await loadCases(orgId, body.filters)
          : undefined,
      findings:
        body.type === "findings"
          ? await loadFindings(orgId, body.filters)
          : undefined,
      poamItems:
        body.type === "poam"
          ? await loadPoamItems(orgId, body.filters)
          : undefined,
      complianceScores:
        body.type === "executive"
          ? await loadComplianceScores(orgId)
          : undefined,
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
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    availableTypes: VALID_TYPES,
    description:
      "POST a { type, filters?, dateRange? } body to generate and download a PDF export. Data is scoped to your organization.",
    usage: {
      method: "POST",
      contentType: "application/json",
      body: {
        type: "executive | findings | cases | poam (required)",
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
