import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

/**
 * POST /api/soc2-readiness/pdf
 *
 * Public endpoint. Generates a branded SOC 2 Readiness Report PDF from
 * the analysis results returned by /api/soc2-readiness.
 *
 * Body: AnalysisResult JSON (as returned by the analysis endpoint)
 *
 * Returns: application/pdf binary
 */

// ── Rate limiter (shared concept with analysis endpoint) ───────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

// ── Types ──────────────────────────────────────────────────────────────

interface AffectedCriterion {
  controlId: string;
  controlTitle: string;
  category: string;
  affectedBy: string[];
  highestSeverity: string;
}

interface RemediationPriority {
  priority: number;
  controlId: string;
  controlTitle: string;
  severity: string;
  findingCount: number;
  recommendation: string;
}

interface AnalysisResult {
  email: string;
  totalFindings: number;
  severityBreakdown: Record<string, number>;
  affectedCriteria: AffectedCriterion[];
  totalCriteriaAssessed: number;
  totalCriteriaAffected: number;
  gapPercentage: number;
  remediationPriorities: RemediationPriority[];
}

// ── Color palette ──────────────────────────────────────────────────────

const colors = {
  primary: "#1e40af",
  critical: "#991b1b",
  high: "#c2410c",
  medium: "#a16207",
  low: "#15803d",
  info: "#1d4ed8",
  muted: "#6b7280",
  border: "#e5e7eb",
  headerBg: "#1e293b",
  headerText: "#ffffff",
  rowAlt: "#f9fafb",
  green: "#15803d",
  red: "#dc2626",
};

// ── Styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  coverPage: {
    padding: 60,
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Helvetica",
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 40,
    textAlign: "center",
  },
  coverDate: { fontSize: 12, color: colors.muted },
  coverEmail: { fontSize: 11, color: "#374151", marginTop: 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 8,
    borderBottom: `1 solid ${colors.border}`,
  },
  headerTitle: { fontSize: 12, fontWeight: "bold", color: colors.primary },
  headerDate: { fontSize: 8, color: colors.muted },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  text: { fontSize: 10, lineHeight: 1.5, color: "#374151" },
  textSmall: { fontSize: 8, color: colors.muted },
  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 8, color: colors.muted, marginTop: 2 },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.headerBg,
    padding: 6,
    borderRadius: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.headerText,
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: `0.5 solid ${colors.border}`,
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 6,
    borderBottom: `0.5 solid ${colors.border}`,
    backgroundColor: colors.rowAlt,
  },
  tableCell: { fontSize: 8 },
  // Priorities
  priorityRow: {
    flexDirection: "row",
    padding: 8,
    marginBottom: 4,
    borderLeft: `3 solid ${colors.primary}`,
    backgroundColor: "#f8fafc",
    borderRadius: 2,
  },
  priorityNum: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
    width: 24,
  },
  priorityContent: { flex: 1 },
  priorityTitle: { fontSize: 9, fontWeight: "bold", color: "#1f2937" },
  priorityRec: { fontSize: 8, color: "#4b5563", marginTop: 2, lineHeight: 1.4 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: colors.muted,
  },
  // CTA
  ctaBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    border: `1 solid #bfdbfe`,
  },
  ctaTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  ctaText: { fontSize: 9, color: "#374151", lineHeight: 1.5 },
  ctaUrl: { fontSize: 9, color: colors.primary, marginTop: 4 },
});

// ── Helpers ────────────────────────────────────────────────────────────

function sevColor(sev: string): string {
  switch (sev.toUpperCase()) {
    case "CRITICAL": return colors.critical;
    case "HIGH": return colors.high;
    case "MEDIUM": return colors.medium;
    case "LOW": return colors.low;
    default: return colors.info;
  }
}

// ── PDF Document ───────────────────────────────────────────────────────

function Soc2ReadinessPdf({ data }: { data: AnalysisResult }) {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  return React.createElement(
    Document,
    {},
    // Cover page
    React.createElement(
      Page,
      { size: "A4", style: s.coverPage },
      React.createElement(Text, { style: s.coverTitle }, "SOC 2 Readiness Report"),
      React.createElement(
        Text,
        { style: s.coverSubtitle },
        "Trust Service Criteria Gap Analysis"
      ),
      React.createElement(
        View,
        { style: { alignItems: "center", marginTop: 20 } },
        React.createElement(Text, { style: { fontSize: 48, fontWeight: "bold", color: data.gapPercentage > 50 ? colors.red : data.gapPercentage > 25 ? colors.medium : colors.green } }, `${data.gapPercentage}%`),
        React.createElement(Text, { style: { fontSize: 12, color: colors.muted, marginTop: 4 } }, "Gap Rate"),
      ),
      React.createElement(
        View,
        { style: { marginTop: 40, alignItems: "center" } },
        React.createElement(Text, { style: s.coverEmail }, `Prepared for: ${data.email}`),
        React.createElement(Text, { style: s.coverDate }, `Generated: ${now}`),
      ),
      React.createElement(
        View,
        { style: { marginTop: 60, alignItems: "center" } },
        React.createElement(Text, { style: { fontSize: 10, color: colors.primary, fontWeight: "bold" } }, "CVERiskPilot"),
        React.createElement(Text, { style: { fontSize: 8, color: colors.muted, marginTop: 2 } }, "AI-Powered Compliance Intelligence Platform"),
        React.createElement(Text, { style: { fontSize: 8, color: colors.muted } }, "100% Veteran Owned | cveriskpilot.com"),
      ),
    ),

    // Executive Summary
    React.createElement(
      Page,
      { size: "A4", style: s.page },
      React.createElement(
        View,
        { style: s.header },
        React.createElement(Text, { style: s.headerTitle }, "SOC 2 Readiness Report"),
        React.createElement(Text, { style: s.headerDate }, now),
      ),
      React.createElement(Text, { style: s.sectionTitle }, "Executive Summary"),
      React.createElement(
        Text,
        { style: s.text },
        `This report analyzes ${data.totalFindings} vulnerability findings against the ${data.totalCriteriaAssessed} SOC 2 Type II Trust Service Criteria. ${data.totalCriteriaAffected} criteria (${data.gapPercentage}%) have identified gaps that require attention before audit.`
      ),

      // Stats
      React.createElement(
        View,
        { style: { ...s.statsRow, marginTop: 16 } },
        React.createElement(
          View,
          { style: s.statCard },
          React.createElement(Text, { style: s.statValue }, String(data.totalFindings)),
          React.createElement(Text, { style: s.statLabel }, "Total Findings"),
        ),
        React.createElement(
          View,
          { style: s.statCard },
          React.createElement(Text, { style: { ...s.statValue, color: colors.red } }, String(data.totalCriteriaAffected)),
          React.createElement(Text, { style: s.statLabel }, "Criteria Affected"),
        ),
        React.createElement(
          View,
          { style: s.statCard },
          React.createElement(Text, { style: { ...s.statValue, color: colors.green } }, String(data.totalCriteriaAssessed - data.totalCriteriaAffected)),
          React.createElement(Text, { style: s.statLabel }, "Criteria Clean"),
        ),
        React.createElement(
          View,
          { style: s.statCard },
          React.createElement(Text, { style: { ...s.statValue, color: data.gapPercentage > 50 ? colors.red : colors.medium } }, `${data.gapPercentage}%`),
          React.createElement(Text, { style: s.statLabel }, "Gap Rate"),
        ),
      ),

      // Severity breakdown
      React.createElement(Text, { style: s.sectionTitle }, "Findings by Severity"),
      React.createElement(
        View,
        { style: s.statsRow },
        ...Object.entries(data.severityBreakdown).map(([sev, count]) =>
          React.createElement(
            View,
            { key: sev, style: s.statCard },
            React.createElement(Text, { style: { ...s.statValue, color: sevColor(sev) } }, String(count)),
            React.createElement(Text, { style: s.statLabel }, sev),
          )
        ),
      ),

      React.createElement(
        View,
        { style: s.footer },
        React.createElement(Text, {}, "CVERiskPilot | SOC 2 Readiness Report"),
        React.createElement(Text, {}, `Page 2 | ${now}`),
      ),
    ),

    // Trust Service Criteria Gap Matrix
    React.createElement(
      Page,
      { size: "A4", style: s.page },
      React.createElement(
        View,
        { style: s.header },
        React.createElement(Text, { style: s.headerTitle }, "SOC 2 Readiness Report"),
        React.createElement(Text, { style: s.headerDate }, now),
      ),
      React.createElement(Text, { style: s.sectionTitle }, "Trust Service Criteria Gap Matrix"),
      React.createElement(
        Text,
        { style: { ...s.text, marginBottom: 12 } },
        "The following SOC 2 criteria have gaps identified from your scan data. Criteria are sorted by highest severity."
      ),

      // Table header
      React.createElement(
        View,
        { style: s.tableHeader },
        React.createElement(Text, { style: { ...s.tableHeaderCell, width: 50 } }, "Control"),
        React.createElement(Text, { style: { ...s.tableHeaderCell, flex: 1 } }, "Title"),
        React.createElement(Text, { style: { ...s.tableHeaderCell, width: 70 } }, "Category"),
        React.createElement(Text, { style: { ...s.tableHeaderCell, width: 55 } }, "Severity"),
        React.createElement(Text, { style: { ...s.tableHeaderCell, width: 40 } }, "CWEs"),
      ),

      // Table rows (first 25)
      ...data.affectedCriteria.slice(0, 25).map((c, idx) =>
        React.createElement(
          View,
          { key: c.controlId, style: idx % 2 === 0 ? s.tableRow : s.tableRowAlt },
          React.createElement(Text, { style: { ...s.tableCell, width: 50, fontWeight: "bold", color: colors.primary } }, c.controlId),
          React.createElement(Text, { style: { ...s.tableCell, flex: 1 } }, c.controlTitle.length > 45 ? c.controlTitle.substring(0, 45) + "..." : c.controlTitle),
          React.createElement(Text, { style: { ...s.tableCell, width: 70, color: colors.muted } }, c.category.length > 15 ? c.category.substring(0, 15) + "..." : c.category),
          React.createElement(Text, { style: { ...s.tableCell, width: 55, fontWeight: "bold", color: sevColor(c.highestSeverity) } }, c.highestSeverity),
          React.createElement(Text, { style: { ...s.tableCell, width: 40, color: colors.muted } }, String(c.affectedBy.length)),
        )
      ),

      data.affectedCriteria.length > 25
        ? React.createElement(
            Text,
            { style: { ...s.textSmall, marginTop: 8 } },
            `...and ${data.affectedCriteria.length - 25} more affected criteria.`
          )
        : null,

      React.createElement(
        View,
        { style: s.footer },
        React.createElement(Text, {}, "CVERiskPilot | SOC 2 Readiness Report"),
        React.createElement(Text, {}, `Page 3 | ${now}`),
      ),
    ),

    // Remediation Priorities
    React.createElement(
      Page,
      { size: "A4", style: s.page },
      React.createElement(
        View,
        { style: s.header },
        React.createElement(Text, { style: s.headerTitle }, "SOC 2 Readiness Report"),
        React.createElement(Text, { style: s.headerDate }, now),
      ),
      React.createElement(Text, { style: s.sectionTitle }, "Remediation Priorities"),
      React.createElement(
        Text,
        { style: { ...s.text, marginBottom: 12 } },
        "Prioritized remediation actions ranked by severity and compliance impact. Address these items to improve your SOC 2 readiness posture."
      ),

      ...data.remediationPriorities.map((p) =>
        React.createElement(
          View,
          { key: p.controlId, style: s.priorityRow },
          React.createElement(Text, { style: s.priorityNum }, String(p.priority)),
          React.createElement(
            View,
            { style: s.priorityContent },
            React.createElement(
              Text,
              { style: s.priorityTitle },
              `${p.controlId} — ${p.controlTitle} (${p.severity}, ${p.findingCount} findings)`
            ),
            React.createElement(Text, { style: s.priorityRec }, p.recommendation),
          ),
        )
      ),

      // CTA
      React.createElement(
        View,
        { style: s.ctaBox },
        React.createElement(Text, { style: s.ctaTitle }, "Track Remediation with CVERiskPilot Pro"),
        React.createElement(
          Text,
          { style: s.ctaText },
          "This report shows where you stand. CVERiskPilot Pro helps you close the gaps with AI-powered triage, team workflows, POAM generation, Jira integration, and real-time compliance scores across 13 frameworks."
        ),
        React.createElement(
          Text,
          { style: s.ctaText },
          "Features include: AI risk triage with source citations, automated compliance mapping, POAM auto-generation, executive PDF reports, team collaboration with SLA tracking, and 11 scanner format support."
        ),
        React.createElement(Text, { style: s.ctaUrl }, "https://cveriskpilot.com/pricing?ref=soc2-report"),
      ),

      React.createElement(
        View,
        { style: s.footer },
        React.createElement(Text, {}, "CVERiskPilot | SOC 2 Readiness Report"),
        React.createElement(Text, {}, `Page 4 | ${now}`),
      ),
    ),
  );
}

// ── Route handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  let data: AnalysisResult;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  // Basic validation
  if (
    !data.email ||
    typeof data.totalFindings !== "number" ||
    !Array.isArray(data.affectedCriteria)
  ) {
    return NextResponse.json(
      { error: "Invalid analysis data. Run the analysis endpoint first." },
      { status: 400 }
    );
  }

  try {
    const doc = React.createElement(Soc2ReadinessPdf, { data });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeBuffer = await renderToBuffer(doc as any);

    return new Response(Buffer.from(nodeBuffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="soc2-readiness-report.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[soc2-readiness/pdf] PDF generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed. Please try again." },
      { status: 500 }
    );
  }
}
