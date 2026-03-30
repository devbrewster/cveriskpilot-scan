import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateApiKey, hasScope } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Tier limits — PR comments per month
// ---------------------------------------------------------------------------

const TIER_LIMITS: Record<string, number> = {
  FREE: 3,
  FOUNDERS_BETA: 100,
  PRO: -1,        // unlimited
  ENTERPRISE: -1,
  MSSP: -1,
};

// ---------------------------------------------------------------------------
// POST /api/pipeline/comment
//
// Accepts crp-scan JSON output, returns formatted PR comment markdown.
// Increments monthly usage counter, enforces tier limits.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Auth via API key
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing API key. Set --api-key or CRP_API_KEY.' },
        { status: 401 },
      );
    }

    const apiKey = authHeader.slice(7).trim();
    const keyResult = await validateApiKey(prisma, apiKey);

    if (!keyResult.valid) {
      return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 });
    }

    if (!hasScope(keyResult.scope ?? '', 'pipeline')) {
      return NextResponse.json(
        { error: 'API key lacks pipeline scope.' },
        { status: 403 },
      );
    }

    const orgId = keyResult.organizationId!;

    // Get org tier
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { tier: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    // Check monthly usage
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const limit = TIER_LIMITS[org.tier] ?? TIER_LIMITS['FREE'];

    // Parse scan results from body (before usage check to fail fast on bad input)
    const body = await req.json();

    if (!body || typeof body !== 'object' || !body.findings) {
      return NextResponse.json(
        { error: 'Invalid scan results. Expected crp-scan --ci JSON output.' },
        { status: 400 },
      );
    }

    // Format the PR comment
    const markdown = formatComment(body);

    // Atomic usage check + increment in a single transaction to prevent TOCTOU race
    let usageAfter: number | null = null;

    if (limit !== -1) {
      const result = await prisma.$transaction(async (tx) => {
        const usage = await tx.pipelineUsage.findUnique({
          where: { organizationId_month: { organizationId: orgId, month } },
        });

        const used = usage?.prCommentsUsed ?? 0;
        if (used >= limit) return null; // Over limit

        return tx.pipelineUsage.upsert({
          where: { organizationId_month: { organizationId: orgId, month } },
          create: {
            organizationId: orgId,
            month,
            prCommentsUsed: 1,
          },
          update: {
            prCommentsUsed: { increment: 1 },
          },
        });
      });

      if (!result) {
        return NextResponse.json(
          {
            error: `Monthly PR comment limit reached (${limit}/${limit}). Upgrade your plan for more.`,
            used: limit,
            limit,
            tier: org.tier,
          },
          { status: 429 },
        );
      }

      usageAfter = result.prCommentsUsed;
    } else {
      // Unlimited tier — still track usage, no limit check needed
      const result = await prisma.pipelineUsage.upsert({
        where: { organizationId_month: { organizationId: orgId, month } },
        create: {
          organizationId: orgId,
          month,
          prCommentsUsed: 1,
        },
        update: {
          prCommentsUsed: { increment: 1 },
        },
      });
      usageAfter = result.prCommentsUsed;
    }

    return NextResponse.json({
      markdown,
      usage: {
        month,
        prCommentsUsed: usageAfter ?? 1,
        limit: limit === -1 ? 'unlimited' : limit,
        tier: org.tier,
      },
    });
  } catch (err) {
    console.error('[pipeline/comment] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Comment formatter (server-side)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatComment(scan: any): string {
  const lines: string[] = [];
  const s = scan.summary ?? {};
  const v = scan.verdictSummary ?? {};
  const passed = scan.exitCode === 0;
  const findings = scan.findings ?? [];

  lines.push(`## ${passed ? '\u2705' : '\u274C'} CVERiskPilot Compliance Scan`);
  lines.push('');

  if (passed) {
    lines.push(`> **PASS** \u2014 No findings at or above **${scan.failOnSeverity ?? 'CRITICAL'}** severity.`);
  } else {
    const failCount = findings.filter((f: any) => f.verdict !== 'FALSE_POSITIVE').length;
    lines.push(`> **FAIL** \u2014 ${failCount} finding(s) at or above **${scan.failOnSeverity ?? 'CRITICAL'}** severity.`);
  }
  lines.push('');

  lines.push(
    `\uD83D\uDD34 **${s.CRITICAL ?? 0}** Critical \u00A0\u00A0 ` +
    `\uD83D\uDFE0 **${s.HIGH ?? 0}** High \u00A0\u00A0 ` +
    `\uD83D\uDFE1 **${s.MEDIUM ?? 0}** Medium \u00A0\u00A0 ` +
    `\uD83D\uDD35 **${s.LOW ?? 0}** Low \u00A0\u00A0 ` +
    `\u26AA **${s.INFO ?? 0}** Info`,
  );
  lines.push('');

  lines.push(
    `**Triage:** ${v.TRUE_POSITIVE ?? 0} actionable \u00B7 ` +
    `${v.NEEDS_REVIEW ?? 0} needs review \u00B7 ` +
    `${v.FALSE_POSITIVE ?? 0} auto-dismissed`,
  );
  lines.push('');

  const stats: string[] = [];
  if (scan.dependencies) stats.push(`${scan.dependencies} dependencies`);
  stats.push(`Scanners: ${(scan.scannersRun ?? []).join(', ')}`);
  stats.push(`Duration: ${scan.durationMs ?? 0}ms`);
  lines.push(`<sub>${stats.join(' \u00B7 ')}</sub>`);
  lines.push('');

  const actionable = findings
    .filter((f: any) => f.verdict !== 'FALSE_POSITIVE')
    .sort((a: any, b: any) => sevRank(a.severity) - sevRank(b.severity));

  if (actionable.length > 0) {
    lines.push('<details>');
    lines.push(`<summary><strong>\uD83D\uDD0D ${actionable.length} Findings Requiring Attention</strong></summary>`);
    lines.push('');
    lines.push('| Severity | Verdict | Finding | CWE | Location |');
    lines.push('|----------|---------|---------|-----|----------|');

    for (const f of actionable.slice(0, 25)) {
      const sev = `${sevEmoji(f.severity)} ${f.severity}`;
      const verdict = f.verdict === 'NEEDS_REVIEW' ? '\uD83D\uDFE1 Review' : '\uD83D\uDD34 TP';
      const cwe = f.cweIds?.[0] ?? '-';
      const loc = f.filePath
        ? `\`${f.filePath}${f.lineNumber ? ':' + f.lineNumber : ''}\``
        : f.packageName ? `\`${f.packageName}\`` : '-';
      lines.push(`| ${sev} | ${verdict} | ${f.title} | ${cwe} | ${loc} |`);
    }

    if (actionable.length > 25) {
      lines.push('');
      lines.push(`*... and ${actionable.length - 25} more findings*`);
    }
    lines.push('', '</details>', '');
  }

  if (scan.complianceImpact?.totalAffectedControls > 0) {
    const ci = scan.complianceImpact;
    lines.push('<details>');
    lines.push(`<summary><strong>\uD83C\uDFDB\uFE0F Compliance Impact \u2014 ${ci.totalAffectedControls} controls affected</strong></summary>`);
    lines.push('');
    lines.push('| Framework | Controls Affected | Control IDs |');
    lines.push('|-----------|:-----------------:|-------------|');

    for (const fw of ci.frameworkSummary ?? []) {
      const ids = fw.controlIds.length > 5
        ? fw.controlIds.slice(0, 5).join(', ') + ` (+${fw.controlIds.length - 5} more)`
        : fw.controlIds.join(', ');
      lines.push(`| **${fw.framework}** | ${fw.affectedControls} | ${ids} |`);
    }
    lines.push('', '</details>', '');
  }

  lines.push('---');
  lines.push(
    '<sub>\uD83D\uDEE1\uFE0F Scanned by <a href="https://cveriskpilot.com">CVERiskPilot</a> ' +
    '\u00B7 <a href="https://www.npmjs.com/package/@cveriskpilot/scan">CLI</a> ' +
    '\u00B7 <a href="https://cveriskpilot.com/docs/pipeline">Setup Guide</a></sub>',
  );

  return lines.join('\n');
}

function sevRank(severity: string): number {
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const idx = order.indexOf((severity ?? '').toUpperCase());
  return idx >= 0 ? idx : 99;
}

function sevEmoji(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: '\uD83D\uDD34', HIGH: '\uD83D\uDFE0', MEDIUM: '\uD83D\uDFE1',
    LOW: '\uD83D\uDD35', INFO: '\u26AA',
  };
  return map[severity] ?? '\u26AA';
}
