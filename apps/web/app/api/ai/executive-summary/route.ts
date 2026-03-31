import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { getOrgTier, checkBillingGate, trackAiCall } from '@/lib/billing';
import { getClient } from '@cveriskpilot/ai';
import { logAudit } from '@/lib/audit';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

/**
 * POST /api/ai/executive-summary — Generate a 1-page executive summary
 * of the org's security posture, trends, top risks, and recommendations.
 * PRO+ tier, counts as AI call.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'ai:advisory');
    if (permError) return permError;

    // Billing gate
    const tier = await getOrgTier(session.organizationId);
    const gate = await checkBillingGate(session.organizationId, tier, 'ai_remediation');
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: gate.reason ?? 'AI call limit reached',
          code: 'BILLING_LIMIT_EXCEEDED',
          upgradeRequired: gate.upgradeRequired,
          upgradeUrl: '/settings/billing',
        },
        { status: 402 },
      );
    }

    const body = (await request.json()) as {
      framework?: string;
      period?: string; // e.g., '30d', '7d', '90d'
    };

    const periodDays = parseInt(body.period?.replace('d', '') ?? '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Gather comprehensive org data
    const [
      severityCounts,
      statusCounts,
      totalCases,
      kevCases,
      topEpss,
      recentTrends,
      complianceScores,
      resolvedInPeriod,
      newInPeriod,
    ] = await Promise.all([
      prisma.vulnerabilityCase.groupBy({
        by: ['severity'],
        where: { organizationId: session.organizationId },
        _count: true,
      }),
      prisma.vulnerabilityCase.groupBy({
        by: ['status'],
        where: { organizationId: session.organizationId },
        _count: true,
      }),
      prisma.vulnerabilityCase.count({
        where: { organizationId: session.organizationId },
      }),
      prisma.vulnerabilityCase.count({
        where: { organizationId: session.organizationId, kevListed: true },
      }),
      prisma.vulnerabilityCase.findMany({
        where: {
          organizationId: session.organizationId,
          epssScore: { not: null },
        },
        orderBy: { epssScore: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          cveIds: true,
          severity: true,
          epssScore: true,
          kevListed: true,
          status: true,
        },
      }),
      prisma.findingTrend.findMany({
        where: {
          organizationId: session.organizationId,
          detectedAt: { gte: since },
        },
        orderBy: { detectedAt: 'desc' },
        take: 50,
      }),
      prisma.complianceSnapshot.findMany({
        where: {
          organizationId: session.organizationId,
          ...(body.framework && { framework: body.framework }),
        },
        orderBy: { snapshotAt: 'desc' },
        take: 20,
        distinct: ['framework'],
      }),
      prisma.vulnerabilityCase.count({
        where: {
          organizationId: session.organizationId,
          status: { in: ['VERIFIED_CLOSED', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'NOT_APPLICABLE'] },
          updatedAt: { gte: since },
        },
      }),
      prisma.vulnerabilityCase.count({
        where: {
          organizationId: session.organizationId,
          createdAt: { gte: since },
        },
      }),
    ]);

    const contextData = {
      period: `${periodDays} days`,
      totalCases,
      newInPeriod,
      resolvedInPeriod,
      severityBreakdown: Object.fromEntries(
        severityCounts.map((s) => [s.severity, s._count]),
      ),
      statusBreakdown: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count]),
      ),
      kevCases,
      topEpssCases: topEpss.map((c) => ({
        title: c.title,
        cveIds: c.cveIds,
        severity: c.severity,
        epssScore: c.epssScore,
        kevListed: c.kevListed,
        status: c.status,
      })),
      recentTrends: recentTrends.map((t) => ({
        metric: t.metric,
        cveId: t.cveId,
        previousValue: t.previousValue,
        currentValue: t.currentValue,
        delta: t.delta,
        detectedAt: t.detectedAt.toISOString(),
      })),
      complianceScores: complianceScores.map((c) => ({
        framework: c.framework,
        score: c.score,
        controlsMet: c.controlsMet,
        controlsTotal: c.controlsTotal,
      })),
    };

    // Generate executive summary with Claude
    const client = getClient();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: `You are a senior security consultant generating an executive summary for a CISO or compliance officer.

Write a concise, professional 1-page executive summary covering:

1. **Security Posture Overview** — Total vulnerabilities, severity distribution, open vs resolved
2. **Top Risks** — Highest EPSS scores, KEV-listed CVEs, critical findings that need immediate attention
3. **Trends** — New CVEs discovered, EPSS score changes, severity upgrades in the period
4. **Compliance Status** — Framework scores, gaps, areas needing attention
5. **Recommendations** — Top 3-5 prioritized actions the team should take

Format with clear headers and bullet points. Use specific numbers and CVE IDs.
Be direct — this is for decision makers who want signal, not noise.
Do NOT add any disclaimers about data limitations.`,
      messages: [
        {
          role: 'user',
          content: `Generate an executive security summary for the last ${periodDays} days.
${body.framework ? `Focus on ${body.framework} compliance.` : 'Cover all compliance frameworks.'}

Organization data:
${JSON.stringify(contextData, null, 2)}`,
        },
      ],
    });

    const summary =
      response.content[0]?.type === 'text' ? response.content[0].text : 'No summary generated.';

    // Track AI usage
    const clientId = (session as unknown as Record<string, string>).clientId ?? session.organizationId;
    await trackAiCall(session.organizationId, clientId);

    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'READ',
      entityType: 'AiExecutiveSummary',
      entityId: session.organizationId,
      details: { framework: body.framework, period: body.period },
    });

    return NextResponse.json({
      summary,
      metadata: {
        period: `${periodDays}d`,
        framework: body.framework ?? 'all',
        totalCases,
        newInPeriod,
        resolvedInPeriod,
        generatedAt: new Date().toISOString(),
      },
      model: MODEL,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error('[API] POST /api/ai/executive-summary error:', error);
    return NextResponse.json({ error: 'Failed to generate executive summary' }, { status: 500 });
  }
}
