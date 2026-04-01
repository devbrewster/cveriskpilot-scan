import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  SOC2_FRAMEWORK,
  mapFindingsToComplianceImpact,
} from "@cveriskpilot/compliance";
import type { CanonicalFinding } from "@cveriskpilot/parsers";

/**
 * POST /api/soc2-readiness
 *
 * Public endpoint (no auth required). Accepts email + scan data, maps findings
 * to SOC 2 Trust Service Criteria, returns gap analysis JSON.
 *
 * Rate limited to prevent abuse (10 requests per hour per IP).
 *
 * Body: { email: string, scanData: string }
 */

// ── Simple in-memory rate limiter ──────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// ── Email validation ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// ── Severity ranking ───────────────────────────────────────────────────

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

function highestSeverity(sevs: string[]): string {
  let max = "INFO";
  let maxRank = 0;
  for (const s of sevs) {
    const rank = SEVERITY_RANK[s.toUpperCase()] ?? 0;
    if (rank > maxRank) {
      maxRank = rank;
      max = s.toUpperCase();
    }
  }
  return max;
}

// ── Parse scan data into CanonicalFinding[] ────────────────────────────

interface MinimalFinding {
  title?: string;
  description?: string;
  severity?: string;
  cveIds?: string[];
  cweIds?: string[];
  cvssScore?: number;
  scannerType?: string;
  scannerName?: string;
  assetName?: string;
  hostname?: string;
  packageName?: string;
  filePath?: string;
  discoveredAt?: string;
  rawObservations?: Record<string, unknown>;
}

function parseScanInput(raw: string): CanonicalFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "Invalid JSON. Paste the output from `npx @cveriskpilot/scan --output json` or an array of findings."
    );
  }

  // Handle ParseResult format: { findings: [...] }
  if (
    parsed &&
    typeof parsed === "object" &&
    "findings" in parsed &&
    Array.isArray((parsed as { findings: unknown }).findings)
  ) {
    parsed = (parsed as { findings: unknown[] }).findings;
  }

  // Handle pipeline scan result: { results: { findings: [...] } }
  if (
    parsed &&
    typeof parsed === "object" &&
    "results" in parsed &&
    typeof (parsed as Record<string, unknown>).results === "object"
  ) {
    const results = (parsed as { results: Record<string, unknown> }).results;
    if (Array.isArray(results.findings)) {
      parsed = results.findings;
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Expected a JSON array of findings, a ParseResult object with a `findings` array, or CVERiskPilot CLI output."
    );
  }

  if (parsed.length === 0) {
    throw new Error("No findings found in the scan data.");
  }

  if (parsed.length > 10000) {
    throw new Error("Too many findings (max 10,000). Please filter your scan data.");
  }

  return parsed.map((item: MinimalFinding, idx: number) => ({
    title: item.title || `Finding ${idx + 1}`,
    description: item.description || "",
    cveIds: Array.isArray(item.cveIds) ? item.cveIds : [],
    cweIds: Array.isArray(item.cweIds) ? item.cweIds : [],
    severity: (
      ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(
        String(item.severity).toUpperCase()
      )
        ? String(item.severity).toUpperCase()
        : "INFO"
    ) as CanonicalFinding["severity"],
    cvssScore: typeof item.cvssScore === "number" ? item.cvssScore : undefined,
    scannerType: item.scannerType || "unknown",
    scannerName: item.scannerName || "unknown",
    assetName: item.assetName || item.hostname || "unknown",
    hostname: item.hostname,
    packageName: item.packageName,
    filePath: item.filePath,
    rawObservations: item.rawObservations || {},
    discoveredAt: item.discoveredAt ? new Date(item.discoveredAt) : new Date(),
  })) as CanonicalFinding[];
}

// ── Remediation recommendations per SOC 2 control ──────────────────────

const REMEDIATION_RECOMMENDATIONS: Record<string, string> = {
  "CC6.1":
    "Implement or strengthen role-based access controls. Review authentication mechanisms and enforce least privilege across all systems.",
  "CC6.2":
    "Ensure all users are provisioned through a formal registration process with identity verification and MFA enabled.",
  "CC6.3":
    "Establish access provisioning and de-provisioning procedures. Implement periodic access reviews.",
  "CC6.6":
    "Deploy WAF and network segmentation. Review firewall rules and restrict external-facing services to minimum required.",
  "CC6.7":
    "Encrypt data in transit using TLS 1.2+. Ensure all internal and external communications use secure channels.",
  "CC6.8":
    "Implement vulnerability scanning and patch management processes. Track remediation SLAs.",
  "CC7.1":
    "Deploy continuous monitoring tools. Ensure infrastructure and application-level monitoring covers all critical systems.",
  "CC7.2":
    "Implement incident detection and response procedures. Enable audit logging across all systems.",
  "CC7.3":
    "Document and test incident response procedures. Ensure timely escalation and notification processes.",
  "CC7.4":
    "Establish incident response playbooks. Conduct tabletop exercises and post-incident reviews.",
  "CC8.1":
    "Implement change management processes with approval workflows, testing requirements, and rollback procedures.",
};

// ── Build SOC 2 control lookup ─────────────────────────────────────────

const SOC2_CONTROLS_BY_ID = new Map(
  SOC2_FRAMEWORK.controls.map((c) => [c.id, c])
);

// ── Route handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit by IP
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

  // Parse body
  let body: { email?: string; scanData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { email, scanData } = body;

  // Validate email
  if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  // Validate scan data
  if (!scanData || typeof scanData !== "string" || scanData.trim().length === 0) {
    return NextResponse.json(
      { error: "Scan data is required. Paste JSON output from your scanner." },
      { status: 400 }
    );
  }

  // Limit payload size (1 MB)
  if (scanData.length > 1_000_000) {
    return NextResponse.json(
      { error: "Scan data too large (max 1 MB). Please reduce the number of findings." },
      { status: 413 }
    );
  }

  // Parse findings
  let findings: CanonicalFinding[];
  try {
    findings = parseScanInput(scanData.trim());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse scan data." },
      { status: 400 }
    );
  }

  // Map findings to SOC 2 compliance impact
  const impact = mapFindingsToComplianceImpact(findings, ["soc2-type2"]);

  // Build severity breakdown
  const severityBreakdown: Record<string, number> = {};
  for (const f of findings) {
    const sev = f.severity || "INFO";
    severityBreakdown[sev] = (severityBreakdown[sev] ?? 0) + 1;
  }

  // Build per-finding severity index by CWE for "highest severity" computation
  const cweSeverities = new Map<string, string[]>();
  for (const f of findings) {
    for (const cwe of f.cweIds) {
      const normalized = cwe.replace(/^cwe-/i, "CWE-");
      const existing = cweSeverities.get(normalized) || [];
      existing.push(f.severity || "INFO");
      cweSeverities.set(normalized, existing);
    }
  }

  // Build affected criteria list with severity
  const affectedCriteria = impact.entries
    .filter((e) => e.framework === "SOC 2 Type II")
    .map((e) => {
      const control = SOC2_CONTROLS_BY_ID.get(e.controlId);
      // Collect severities from all CWEs that affect this control
      const allSevs: string[] = [];
      for (const cwe of e.affectedBy) {
        const sevs = cweSeverities.get(cwe);
        if (sevs) allSevs.push(...sevs);
      }

      return {
        controlId: e.controlId,
        controlTitle: e.controlTitle,
        category: control?.category || "Common Criteria",
        affectedBy: e.affectedBy,
        highestSeverity: highestSeverity(allSevs),
      };
    })
    .sort(
      (a, b) =>
        (SEVERITY_RANK[b.highestSeverity] ?? 0) -
        (SEVERITY_RANK[a.highestSeverity] ?? 0)
    );

  // Build remediation priorities
  const remediationPriorities = affectedCriteria
    .slice(0, 10)
    .map((c, idx) => ({
      priority: idx + 1,
      controlId: c.controlId,
      controlTitle: c.controlTitle,
      severity: c.highestSeverity,
      findingCount: c.affectedBy.length,
      recommendation:
        REMEDIATION_RECOMMENDATIONS[c.controlId] ||
        `Review and remediate findings affecting ${c.controlId} (${c.controlTitle}). Implement controls to address the identified CWEs.`,
    }));

  const totalCriteriaAssessed = SOC2_FRAMEWORK.controls.length;
  const totalCriteriaAffected = affectedCriteria.length;
  const gapPercentage =
    totalCriteriaAssessed > 0
      ? Math.round((totalCriteriaAffected / totalCriteriaAssessed) * 100)
      : 0;

  // Store lead capture (fire-and-forget, don't block response)
  // In production this would write to the database. For now, log it.
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LeadCapture" (id, email, source, metadata, "createdAt")
       VALUES (gen_random_uuid(), $1, 'soc2-readiness', $2::jsonb, NOW())
       ON CONFLICT (email, source) DO UPDATE SET metadata = $2::jsonb, "createdAt" = NOW()`,
      email.trim().toLowerCase(),
      JSON.stringify({
        totalFindings: findings.length,
        totalCriteriaAffected,
        gapPercentage,
        severityBreakdown,
        ip,
        userAgent: request.headers.get("user-agent") || "",
      })
    );
  } catch {
    // Lead capture is best-effort; don't fail the response
    console.warn("[soc2-readiness] Lead capture write failed (table may not exist yet)");
  }

  return NextResponse.json({
    email: email.trim(),
    totalFindings: findings.length,
    severityBreakdown,
    affectedCriteria,
    totalCriteriaAssessed,
    totalCriteriaAffected,
    gapPercentage,
    remediationPriorities,
  });
}
