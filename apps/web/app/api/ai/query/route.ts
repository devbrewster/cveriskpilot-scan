import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { getOrgTier, checkBillingGate, trackAiCall } from '@/lib/billing';
import { getClient } from '@cveriskpilot/ai';
import { logAudit } from '@/lib/audit';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;

/**
 * POST /api/ai/query — Natural language query over org's vulnerability data.
 * Claude converts the question to structured queries and returns results + narrative.
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

    const body = (await request.json()) as { question: string };
    if (!body.question || body.question.length < 3) {
      return NextResponse.json({ error: 'Question is required (min 3 chars)' }, { status: 400 });
    }

    if (body.question.length > 500) {
      return NextResponse.json({ error: 'Question too long (max 500 chars)' }, { status: 400 });
    }

    // Gather context: org stats for the AI to work with
    const [severityCounts, totalCases, totalFindings, recentCases, frameworks] = await Promise.all([
      prisma.vulnerabilityCase.groupBy({
        by: ['severity'],
        where: { organizationId: session.organizationId },
        _count: true,
      }),
      prisma.vulnerabilityCase.count({
        where: { organizationId: session.organizationId },
      }),
      prisma.finding.count({
        where: { organizationId: session.organizationId },
      }),
      prisma.vulnerabilityCase.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          cveIds: true,
          severity: true,
          status: true,
          epssScore: true,
          kevListed: true,
          triageVerdict: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.complianceSnapshot.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { snapshotAt: 'desc' },
        take: 20,
        distinct: ['framework'],
      }),
    ]);

    const contextData = {
      totalCases,
      totalFindings,
      severityCounts: Object.fromEntries(
        severityCounts.map((s) => [s.severity, s._count]),
      ),
      recentCases: recentCases.map((c) => ({
        id: c.id,
        title: c.title,
        cveIds: c.cveIds,
        severity: c.severity,
        status: c.status,
        epssScore: c.epssScore,
        kevListed: c.kevListed,
        triageVerdict: c.triageVerdict,
      })),
      complianceScores: frameworks.map((f) => ({
        framework: f.framework,
        score: f.score,
        controlsMet: f.controlsMet,
        controlsTotal: f.controlsTotal,
      })),
    };

    // Call Claude for NL query interpretation
    const client = getClient();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: `You are a vulnerability management analyst assistant for CVERiskPilot.
You answer questions about the organization's security posture based on the provided data.

Rules:
- Answer based ONLY on the provided data context. Do not invent data.
- Be concise and specific. Include CVE IDs, severity levels, and counts.
- If the data doesn't contain enough information, say so.
- Format numbers clearly. Use bullet points for lists.
- Reference specific cases by their title when relevant.

Available severity levels: CRITICAL, HIGH, MEDIUM, LOW, INFO
Available statuses: NEW, OPEN, IN_PROGRESS, RESOLVED, CLOSED, FALSE_POSITIVE
Triage verdicts: TRUE_POSITIVE, FALSE_POSITIVE, NEEDS_REVIEW`,
      messages: [
        {
          role: 'user',
          content: `Organization data context:
${JSON.stringify(contextData, null, 2)}

User question: ${body.question}`,
        },
      ],
    });

    const answer =
      response.content[0]?.type === 'text' ? response.content[0].text : 'No response generated.';

    // Track AI usage
    const clientId = (session as unknown as Record<string, string>).clientId ?? session.organizationId;
    await trackAiCall(session.organizationId, clientId);

    logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: 'READ',
      entityType: 'AiQuery',
      entityId: 'nl-query',
      details: { question: body.question.slice(0, 100) },
    });

    return NextResponse.json({
      answer,
      context: {
        totalCases,
        totalFindings,
        casesAnalyzed: recentCases.length,
        frameworksIncluded: frameworks.length,
      },
      model: MODEL,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    });
  } catch (error) {
    console.error('[API] POST /api/ai/query error:', error);
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }
}
