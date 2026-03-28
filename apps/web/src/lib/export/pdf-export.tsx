/**
 * PDF export templates using @react-pdf/renderer.
 *
 * Provides four report templates:
 *   - Executive Report: severity breakdown with bar chart, top-risk cases,
 *     KEV/EPSS highlights, compliance status, recommendations
 *   - Findings Report:  tabular summary + full finding detail list
 *   - Case Report:      case-centric view with linked findings
 *   - POAM Export:      Plan of Action & Milestones table (FedRAMP-style)
 *
 * Ported from legacy 1.x (src/lib/export/pdf-export.tsx), adapted to current
 * domain types from @/lib/types.
 *
 * NOTE: @react-pdf/renderer must be installed before this module can be imported.
 *   npm install @react-pdf/renderer
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import type {
  Severity,
  VulnerabilityCase,
  ApiFinding,
} from "@/lib/types";

// ── Extended types for PDF data ────────────────────────────────────────

export interface PdfReportMeta {
  orgName: string;
  generatedAt: string;
  reportTitle?: string;
  dateRange?: { from: string; to: string };
  totalScans?: number;
}

/** Compliance framework score for the executive summary. */
export interface ComplianceScore {
  framework: string;
  score: number; // 0-100
  controlsPassed: number;
  controlsTotal: number;
}

/** Enriched case shape for PDF reports (superset of VulnerabilityCase). */
export interface PdfCase extends VulnerabilityCase {
  description?: string;
  solution?: string;
  affectedAssets?: string[];
  remediations?: { content: string; isApproved: boolean }[];
}

/** Enriched finding shape for PDF reports (superset of ApiFinding). */
export interface PdfFinding extends ApiFinding {
  title: string;
  cveId: string | null;
  description: string;
  severity: Severity;
  cvssScore: number | null;
  riskScore: number | null;
  status: string;
  solution: string | null;
  affectedHost: string;
  affectedPort: number | null;
  assignedTo?: { name: string | null; email: string } | null;
  remediations?: { content: string; isApproved: boolean }[];
}

/** POAM line-item. */
export interface PoamItem {
  id: string;
  weakness: string;
  cveIds: string[];
  severity: Severity;
  pointOfContact: string;
  resources: string;
  scheduledCompletionDate: string | null;
  milestones: string;
  status: string;
  comments: string;
}

// ── Report type union ──────────────────────────────────────────────────

export type PdfReportType = "executive" | "findings" | "cases" | "poam";

export interface GeneratePdfInput {
  type: PdfReportType;
  meta: PdfReportMeta;
  cases?: PdfCase[];
  findings?: PdfFinding[];
  poamItems?: PoamItem[];
  complianceScores?: ComplianceScore[];
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
};

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  coverPage: {
    padding: 40,
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
  },
  coverOrg: { fontSize: 18, color: "#1f2937", marginBottom: 4 },
  coverDate: { fontSize: 12, color: colors.muted },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 8,
    borderBottom: `1 solid ${colors.border}`,
  },
  headerTitle: { fontSize: 14, fontWeight: "bold", color: colors.primary },
  headerDate: { fontSize: 8, color: colors.muted },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 4,
    marginTop: 8,
  },
  text: { fontSize: 10, lineHeight: 1.5, color: "#374151" },
  textSmall: { fontSize: 8, color: colors.muted },
  // Stats row
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
  },
  statValue: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 8, color: colors.muted, marginTop: 2 },
  // Table
  table: { marginTop: 8, marginBottom: 12 },
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
  // Severity badges
  severityCritical: { color: colors.critical, fontWeight: "bold" },
  severityHigh: { color: colors.high, fontWeight: "bold" },
  severityMedium: { color: colors.medium, fontWeight: "bold" },
  severityLow: { color: colors.low, fontWeight: "bold" },
  severityInfo: { color: colors.info, fontWeight: "bold" },
  // Detail card
  detailCard: {
    marginBottom: 12,
    padding: 10,
    border: `0.5 solid ${colors.border}`,
    borderRadius: 4,
  },
  detailTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  detailMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 6,
    fontSize: 8,
    color: colors.muted,
  },
  detailBody: { fontSize: 9, lineHeight: 1.5, color: "#374151" },
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
});

// ── Helpers ────────────────────────────────────────────────────────────

function severityStyle(severity: string) {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return styles.severityCritical;
    case "HIGH":
      return styles.severityHigh;
    case "MEDIUM":
      return styles.severityMedium;
    case "LOW":
      return styles.severityLow;
    default:
      return styles.severityInfo;
  }
}

function severityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return colors.critical;
    case "HIGH":
      return colors.high;
    case "MEDIUM":
      return colors.medium;
    case "LOW":
      return colors.low;
    default:
      return colors.info;
  }
}

function severityOrder(s: string): number {
  const order: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  };
  return order[s.toUpperCase()] ?? 5;
}

function countBySeverity(
  items: Array<{ severity: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  for (const v of items) {
    const key = v.severity.toUpperCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function countByStatus(
  items: Array<{ status: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of items) {
    counts[v.status] = (counts[v.status] || 0) + 1;
  }
  return counts;
}

// ── Shared components ──────────────────────────────────────────────────

function CoverPage({
  title,
  meta,
}: {
  title: string;
  meta: PdfReportMeta;
}) {
  return (
    <Page size="A4" style={styles.coverPage}>
      {/* Brand accent bar */}
      <View
        style={{
          width: 60,
          height: 4,
          backgroundColor: colors.primary,
          marginBottom: 24,
          borderRadius: 2,
        }}
      />
      <Text style={styles.coverTitle}>CVERiskPilot</Text>
      <Text style={styles.coverSubtitle}>{title}</Text>
      <View style={{ marginTop: 40 }}>
        <Text style={styles.coverOrg}>{meta.orgName}</Text>
        <Text style={styles.coverDate}>Generated: {meta.generatedAt}</Text>
        {meta.dateRange && (
          <Text style={[styles.textSmall, { marginTop: 8 }]}>
            Period: {meta.dateRange.from} — {meta.dateRange.to}
          </Text>
        )}
      </View>
      <Text
        style={{
          fontSize: 8,
          color: colors.muted,
          position: "absolute",
          bottom: 40,
        }}
      >
        CONFIDENTIAL — For authorized recipients only
      </Text>
    </Page>
  );
}

/** Horizontal bar chart for severity distribution (react-pdf compatible). */
function SeverityBarChart({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const maxCount = Math.max(...Object.values(counts), 1);
  const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;

  return (
    <View style={{ marginTop: 8, marginBottom: 16 }}>
      {severities.map((sev) => {
        const count = counts[sev] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return (
          <View
            key={sev}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                width: 60,
                fontSize: 8,
                fontWeight: "bold",
                color: severityColor(sev),
              }}
            >
              {sev}
            </Text>
            <View
              style={{
                flex: 1,
                height: 14,
                backgroundColor: "#f1f5f9",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.max(barWidth, 1)}%`,
                  height: "100%",
                  backgroundColor: severityColor(sev),
                  borderRadius: 2,
                }}
              />
            </View>
            <Text
              style={{
                width: 55,
                fontSize: 8,
                textAlign: "right",
                color: "#374151",
              }}
            >
              {count} ({pct.toFixed(1)}%)
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Compliance framework scores with progress bars. */
function ComplianceSummary({
  scores,
}: {
  scores: ComplianceScore[];
}) {
  if (scores.length === 0) return null;

  return (
    <View style={{ marginTop: 8, marginBottom: 12 }}>
      {scores.map((s) => (
        <View
          key={s.framework}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ width: 80, fontSize: 9, fontWeight: "bold", color: "#374151" }}>
            {s.framework}
          </Text>
          <View
            style={{
              flex: 1,
              height: 12,
              backgroundColor: "#f1f5f9",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.max(s.score, 1)}%`,
                height: "100%",
                backgroundColor:
                  s.score >= 80
                    ? colors.low
                    : s.score >= 60
                      ? colors.medium
                      : colors.high,
                borderRadius: 2,
              }}
            />
          </View>
          <Text style={{ width: 70, fontSize: 8, textAlign: "right", color: "#374151" }}>
            {s.score}% ({s.controlsPassed}/{s.controlsTotal})
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Recommendations section based on data analysis. */
function Recommendations({
  cases,
  kevCount,
  sevCounts,
}: {
  cases: PdfCase[];
  kevCount: number;
  sevCounts: Record<string, number>;
}) {
  const critHigh = (sevCounts.CRITICAL || 0) + (sevCounts.HIGH || 0);
  const epssAboveThreshold = cases.filter(
    (c) => c.epssScore !== null && c.epssScore > 0.5,
  ).length;
  const overdueKev = cases.filter(
    (c) => c.kevListed && c.kevDueDate && new Date(c.kevDueDate) < new Date(),
  ).length;

  const recs: string[] = [];

  if (overdueKev > 0) {
    recs.push(
      `URGENT: ${overdueKev} KEV-listed vulnerabilit${overdueKev === 1 ? "y has" : "ies have"} passed their CISA due date. Immediate remediation is required to maintain compliance.`,
    );
  }
  if (kevCount > 0) {
    recs.push(
      `Prioritize all ${kevCount} KEV-listed vulnerabilit${kevCount === 1 ? "y" : "ies"} — these are actively exploited in the wild and have mandatory remediation deadlines.`,
    );
  }
  if (critHigh > 0) {
    recs.push(
      `Address ${critHigh} Critical/High severity case${critHigh === 1 ? "" : "s"} as the next priority. Focus on those with the highest CVSS and EPSS scores.`,
    );
  }
  if (epssAboveThreshold > 0) {
    recs.push(
      `${epssAboveThreshold} case${epssAboveThreshold === 1 ? " has" : "s have"} an EPSS score above 0.5, indicating high exploitation probability in the next 30 days. Fast-track remediation for these.`,
    );
  }
  recs.push(
    "Establish a recurring scan cadence (weekly for critical assets, monthly for others) to detect new vulnerabilities early.",
  );
  recs.push(
    "Review accepted-risk exceptions quarterly to ensure the risk posture remains within organizational tolerance.",
  );

  return (
    <View style={{ marginTop: 4 }}>
      {recs.map((rec, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            marginBottom: 6,
            paddingLeft: 4,
          }}
        >
          <Text style={{ fontSize: 9, color: colors.primary, width: 16, fontWeight: "bold" }}>
            {i + 1}.
          </Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#374151", flex: 1 }}>
            {rec}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerTitle}>{title}</Text>
      <Text style={styles.headerDate}>CVERiskPilot</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>CVERiskPilot — Confidential</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Executive Report
// ═══════════════════════════════════════════════════════════════════════

export function ExecutiveReportPdf({
  cases,
  meta,
  complianceScores = [],
}: {
  cases: PdfCase[];
  meta: PdfReportMeta;
  complianceScores?: ComplianceScore[];
}) {
  const sevCounts = countBySeverity(cases);
  const statusCounts = countByStatus(cases);
  const kevCount = cases.filter((c) => c.kevListed).length;
  const epssScores = cases
    .map((c) => c.epssScore)
    .filter((s): s is number => s !== null);
  const avgEpss =
    epssScores.length > 0
      ? epssScores.reduce((a, b) => a + b, 0) / epssScores.length
      : 0;
  const maxEpss = epssScores.length > 0 ? Math.max(...epssScores) : 0;
  const sorted = [...cases].sort(
    (a, b) =>
      severityOrder(a.severity) - severityOrder(b.severity) ||
      (b.cvssScore || 0) - (a.cvssScore || 0),
  );
  const top10 = sorted.slice(0, 10);

  return (
    <Document>
      <CoverPage title="Executive Summary Report" meta={meta} />

      {/* Page 1: Overview + Severity Chart */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Executive Summary" />
        <PageFooter />

        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {cases.length}
            </Text>
            <Text style={styles.statLabel}>Total Cases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.critical }]}>
              {sevCounts.CRITICAL}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.high }]}>
              {sevCounts.HIGH}
            </Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                { color: kevCount > 0 ? colors.critical : colors.low },
              ]}
            >
              {kevCount}
            </Text>
            <Text style={styles.statLabel}>KEV Listed</Text>
          </View>
        </View>

        {/* EPSS / Risk Score row */}
        <View style={[styles.statsRow, { marginTop: 4 }]}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary, fontSize: 16 }]}>
              {avgEpss.toFixed(3)}
            </Text>
            <Text style={styles.statLabel}>Avg EPSS Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                { color: maxEpss > 0.5 ? colors.critical : colors.primary, fontSize: 16 },
              ]}
            >
              {maxEpss.toFixed(3)}
            </Text>
            <Text style={styles.statLabel}>Max EPSS Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.medium, fontSize: 16 }]}>
              {sevCounts.MEDIUM}
            </Text>
            <Text style={styles.statLabel}>Medium</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.low, fontSize: 16 }]}>
              {sevCounts.LOW + sevCounts.INFO}
            </Text>
            <Text style={styles.statLabel}>Low / Info</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Severity Distribution</Text>
        <SeverityBarChart counts={sevCounts} total={cases.length} />

        <Text style={styles.sectionTitle}>Status Summary</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "50%" }]}>
              Status
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "25%" }]}>
              Count
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "25%" }]}>
              % of Total
            </Text>
          </View>
          {Object.entries(statusCounts).map(([status, count], i) => (
            <View
              key={status}
              style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={[styles.tableCell, { width: "50%" }]}>
                {status.replace(/_/g, " ")}
              </Text>
              <Text style={[styles.tableCell, { width: "25%" }]}>
                {count}
              </Text>
              <Text style={[styles.tableCell, { width: "25%" }]}>
                {cases.length > 0
                  ? ((count / cases.length) * 100).toFixed(1)
                  : "0"}
                %
              </Text>
            </View>
          ))}
        </View>

        {/* Compliance scores if available */}
        {complianceScores.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Compliance Status</Text>
            <ComplianceSummary scores={complianceScores} />
          </>
        )}
      </Page>

      {/* Page 2: Top 10 + Recommendations */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Executive Summary — Priority Cases" />
        <PageFooter />

        <Text style={styles.sectionTitle}>Top 10 Highest Priority Cases</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "6%" }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: "25%" }]}>
              Title
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "14%" }]}>CVE</Text>
            <Text style={[styles.tableHeaderCell, { width: "11%" }]}>
              Severity
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "9%" }]}>
              CVSS
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "9%" }]}>
              EPSS
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "7%" }]}>KEV</Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>
              Status
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "9%" }]}>
              Due
            </Text>
          </View>
          {top10.map((c, i) => (
            <View
              key={c.id}
              style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={[styles.tableCell, { width: "6%" }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: "25%" }]}>
                {c.title.slice(0, 35)}
              </Text>
              <Text style={[styles.tableCell, { width: "14%" }]}>
                {c.cveIds?.[0] || "—"}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  severityStyle(c.severity),
                  { width: "11%" },
                ]}
              >
                {c.severity}
              </Text>
              <Text style={[styles.tableCell, { width: "9%" }]}>
                {c.cvssScore?.toFixed(1) || "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "9%" }]}>
                {c.epssScore?.toFixed(3) || "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "7%" }]}>
                {c.kevListed ? "Yes" : "No"}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {c.status.replace(/_/g, " ")}
              </Text>
              <Text style={[styles.tableCell, { width: "9%" }]}>
                {c.kevDueDate
                  ? c.kevDueDate.slice(0, 10)
                  : c.dueAt
                    ? c.dueAt.slice(0, 10)
                    : "—"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Recommendations
        </Text>
        <Recommendations
          cases={cases}
          kevCount={kevCount}
          sevCounts={sevCounts}
        />
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Findings Report (detailed)
// ═══════════════════════════════════════════════════════════════════════

export function FindingsReportPdf({
  findings,
  meta,
}: {
  findings: PdfFinding[];
  meta: PdfReportMeta;
}) {
  const sorted = [...findings].sort(
    (a, b) =>
      severityOrder(a.severity) - severityOrder(b.severity) ||
      (b.riskScore || 0) - (a.riskScore || 0),
  );
  const sevCounts = countBySeverity(findings);

  return (
    <Document>
      <CoverPage title="Findings Detail Report" meta={meta} />

      {/* Page 1: Summary table */}
      <Page size="A4" style={styles.page} wrap>
        <PageHeader title="Findings Summary" />
        <PageFooter />

        <Text style={styles.text}>
          Total: {findings.length} findings across{" "}
          {meta.totalScans || "all"} scans.
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
          Severity Distribution
        </Text>
        <SeverityBarChart counts={sevCounts} total={findings.length} />

        <Text style={styles.sectionTitle}>Findings Index</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "5%" }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: "13%" }]}>CVE</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>
              Title
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>
              Severity
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "8%" }]}>
              CVSS
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "8%" }]}>
              EPSS
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "16%" }]}>
              Asset
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>
              Status
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "8%" }]}>
              Risk
            </Text>
          </View>
          {sorted.map((f, i) => (
            <View
              key={f.id}
              style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              wrap={false}
            >
              <Text style={[styles.tableCell, { width: "5%" }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: "13%" }]}>
                {f.cveId || "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "22%" }]}>
                {f.title.slice(0, 30)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  severityStyle(f.severity),
                  { width: "10%" },
                ]}
              >
                {f.severity}
              </Text>
              <Text style={[styles.tableCell, { width: "8%" }]}>
                {f.cvssScore?.toFixed(1) || "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "8%" }]}>
                {f.riskScore?.toFixed(1) || "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "16%" }]}>
                {f.affectedHost.slice(0, 20)}
                {f.affectedPort ? `:${f.affectedPort}` : ""}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {f.status.replace(/_/g, " ")}
              </Text>
              <Text style={[styles.tableCell, { width: "8%" }]}>
                {f.riskScore?.toFixed(1) || "—"}
              </Text>
            </View>
          ))}
        </View>
      </Page>

      {/* Page 2+: Detail cards */}
      <Page size="A4" style={styles.page} wrap>
        <PageHeader title="Findings Detail" />
        <PageFooter />

        {sorted.map((f) => (
          <View key={f.id} style={styles.detailCard} wrap={false}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text style={styles.detailTitle}>{f.title}</Text>
              <Text style={severityStyle(f.severity)}>{f.severity}</Text>
            </View>
            <View style={styles.detailMeta}>
              {f.cveId && <Text>CVE: {f.cveId}</Text>}
              <Text>
                Host: {f.affectedHost}
                {f.affectedPort ? `:${f.affectedPort}` : ""}
              </Text>
              <Text>Risk: {f.riskScore?.toFixed(1) || "N/A"}</Text>
              <Text>CVSS: {f.cvssScore ?? "N/A"}</Text>
              <Text>Status: {f.status.replace(/_/g, " ")}</Text>
            </View>
            {f.description && (
              <>
                <Text style={styles.subsectionTitle}>Description</Text>
                <Text style={styles.detailBody}>
                  {f.description.slice(0, 500)}
                  {f.description.length > 500 ? "..." : ""}
                </Text>
              </>
            )}
            {f.solution && (
              <>
                <Text style={styles.subsectionTitle}>Solution</Text>
                <Text style={styles.detailBody}>
                  {f.solution.slice(0, 300)}
                  {f.solution.length > 300 ? "..." : ""}
                </Text>
              </>
            )}
            {f.assignedTo && (
              <Text style={[styles.textSmall, { marginTop: 4 }]}>
                Assigned to: {f.assignedTo.name || f.assignedTo.email}
              </Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Case Report
// ═══════════════════════════════════════════════════════════════════════

export function CaseReportPdf({
  cases,
  meta,
}: {
  cases: PdfCase[];
  meta: PdfReportMeta;
}) {
  const sorted = [...cases].sort(
    (a, b) =>
      severityOrder(a.severity) - severityOrder(b.severity) ||
      (b.cvssScore || 0) - (a.cvssScore || 0),
  );

  return (
    <Document>
      <CoverPage title="Vulnerability Case Report" meta={meta} />

      <Page size="A4" style={styles.page} wrap>
        <PageHeader title="Case Report" />
        <PageFooter />

        <Text style={styles.text}>
          Total: {cases.length} vulnerability cases.
        </Text>

        {sorted.map((c, idx) => (
          <View key={c.id} style={styles.detailCard} wrap={false}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text style={styles.detailTitle}>
                {idx + 1}. {c.title}
              </Text>
              <Text style={severityStyle(c.severity)}>{c.severity}</Text>
            </View>
            <View style={styles.detailMeta}>
              {c.cveIds.length > 0 && (
                <Text>CVEs: {c.cveIds.join(", ")}</Text>
              )}
              <Text>CVSS: {c.cvssScore?.toFixed(1) || "N/A"}</Text>
              <Text>EPSS: {c.epssScore?.toFixed(3) || "N/A"}</Text>
              <Text>KEV: {c.kevListed ? "Yes" : "No"}</Text>
              <Text>Findings: {c.findingCount}</Text>
              <Text>Status: {c.status.replace(/_/g, " ")}</Text>
            </View>
            {c.description && (
              <>
                <Text style={styles.subsectionTitle}>Description</Text>
                <Text style={styles.detailBody}>
                  {c.description.slice(0, 500)}
                  {c.description.length > 500 ? "..." : ""}
                </Text>
              </>
            )}
            {c.solution && (
              <>
                <Text style={styles.subsectionTitle}>Solution</Text>
                <Text style={styles.detailBody}>
                  {c.solution.slice(0, 300)}
                  {c.solution.length > 300 ? "..." : ""}
                </Text>
              </>
            )}
            {c.remediations && c.remediations.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>
                  AI Remediation{" "}
                  {c.remediations[0].isApproved ? "(Approved)" : "(Pending)"}
                </Text>
                <Text style={styles.detailBody}>
                  {c.remediations[0].content.slice(0, 500)}
                  {c.remediations[0].content.length > 500 ? "..." : ""}
                </Text>
              </>
            )}
            {c.assignedTo && (
              <Text style={[styles.textSmall, { marginTop: 4 }]}>
                Assigned to: {c.assignedTo.name || c.assignedTo.email}
              </Text>
            )}
            {c.kevDueDate && (
              <Text style={[styles.textSmall, { marginTop: 2 }]}>
                KEV due: {c.kevDueDate}
              </Text>
            )}
            {c.dueAt && (
              <Text style={[styles.textSmall, { marginTop: 2 }]}>
                SLA due: {c.dueAt}
              </Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4. POAM Export
// ═══════════════════════════════════════════════════════════════════════

export function PoamExportPdf({
  items,
  meta,
}: {
  items: PoamItem[];
  meta: PdfReportMeta;
}) {
  const sevCounts = countBySeverity(items);
  const statusCounts = countByStatus(items);
  const overdue = items.filter(
    (i) =>
      i.scheduledCompletionDate &&
      new Date(i.scheduledCompletionDate) < new Date(),
  ).length;

  return (
    <Document>
      <CoverPage title="Plan of Action & Milestones (POA&M)" meta={meta} />

      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <PageHeader title="POA&M" />
        <PageFooter />

        {/* Summary header */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {items.length}
            </Text>
            <Text style={styles.statLabel}>Total Action Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.critical }]}>
              {sevCounts.CRITICAL + sevCounts.HIGH}
            </Text>
            <Text style={styles.statLabel}>Critical / High</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                { color: overdue > 0 ? colors.critical : colors.low },
              ]}
            >
              {overdue}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.low }]}>
              {statusCounts["Completed"] || statusCounts["COMPLETED"] || 0}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <Text style={[styles.text, { marginBottom: 8 }]}>
          {items.length} action items as of {meta.generatedAt}.
          {overdue > 0 &&
            ` ${overdue} item${overdue === 1 ? " is" : "s are"} past the scheduled completion date.`}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "5%" }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: "18%" }]}>
              Weakness
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>CVE</Text>
            <Text style={[styles.tableHeaderCell, { width: "8%" }]}>
              Severity
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>POC</Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>
              Resources
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>
              Due Date
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "12%" }]}>
              Milestones
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "7%" }]}>
              Status
            </Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>
              Comments
            </Text>
          </View>
          {items.map((item, i) => (
            <View
              key={item.id}
              style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              wrap={false}
            >
              <Text style={[styles.tableCell, { width: "5%" }]}>
                {i + 1}
              </Text>
              <Text style={[styles.tableCell, { width: "18%" }]}>
                {item.weakness.slice(0, 50)}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {item.cveIds[0] || "—"}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  severityStyle(item.severity),
                  { width: "8%" },
                ]}
              >
                {item.severity}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {item.pointOfContact.slice(0, 20)}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {item.resources.slice(0, 20)}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {item.scheduledCompletionDate || "TBD"}
              </Text>
              <Text style={[styles.tableCell, { width: "12%" }]}>
                {item.milestones.slice(0, 30)}
              </Text>
              <Text style={[styles.tableCell, { width: "7%" }]}>
                {item.status}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {item.comments.slice(0, 30)}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════

/**
 * Select the appropriate PDF Document component based on report type.
 *
 * Usage with @react-pdf/renderer:
 *   import { renderToStream } from "@react-pdf/renderer";
 *   const doc = generatePdfDocument({ type: "executive", meta, cases });
 *   const stream = await renderToStream(doc);
 */
export function generatePdfDocument(input: GeneratePdfInput): React.ReactElement {
  const { type, meta } = input;

  switch (type) {
    case "executive":
      return (
        <ExecutiveReportPdf
          cases={input.cases || []}
          meta={meta}
          complianceScores={input.complianceScores}
        />
      );
    case "findings":
      return <FindingsReportPdf findings={input.findings || []} meta={meta} />;
    case "cases":
      return <CaseReportPdf cases={input.cases || []} meta={meta} />;
    case "poam":
      return <PoamExportPdf items={input.poamItems || []} meta={meta} />;
    default:
      throw new Error(`Unknown PDF report type: ${type}`);
  }
}
