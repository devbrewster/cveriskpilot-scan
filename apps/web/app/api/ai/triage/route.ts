// ---------------------------------------------------------------------------
// POST /api/ai/triage — AI-powered vulnerability triage with feedback loop
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, getSensitiveWriteLimiter, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { getOrgTier, checkBillingGate, trackAiCall } from '@/lib/billing';
import { prisma } from '@/lib/prisma';

// ---------- helpers --------------------------------------------------------

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// ---------- handler --------------------------------------------------------

export async function POST(request: NextRequest) {
  // --- Auth check ---
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const session = auth;

  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const permError = requirePerm(session.role, 'cases:triage');
  if (permError) return permError;

  // Rate limiting — 10 req/min per user
  try {
    const limiter = getSensitiveWriteLimiter();
    const rl = await limiter.check(`ai_triage:${session.userId}`);
    if (!rl.allowed) {
      return errorResponse(429, 'Too many requests. Please try again later.');
    }
  } catch {
    // Redis not available — skip rate limiting
  }

  let body: { caseId: string };
  try {
    body = (await request.json()) as { caseId: string };
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  if (!body.caseId) {
    return errorResponse(400, 'Missing caseId');
  }

  const orgId = session.organizationId;

  try {
    const {
      TriageAgent,
      aggregateFeedback,
      buildFeedbackContext,
      checkAiRateLimit,
      incrementAiUsage,
    } = await import('@cveriskpilot/ai');

    // --- Billing gate + rate limiting ---
    const tier = await getOrgTier(orgId);

    const gate = await checkBillingGate(orgId, tier, 'ai_remediation');
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

    const limit = await checkAiRateLimit(orgId, tier);
    if (!limit.allowed) {
      return errorResponse(429, `AI rate limit exceeded. Resets at ${limit.resetAt.toISOString()}`);
    }

    // --- Load the case with related findings + assets ---
    const vuln = await prisma.vulnerabilityCase.findFirst({
      where: { id: body.caseId, organizationId: orgId },
      include: {
        findings: {
          select: {
            scannerType: true,
            scannerName: true,
            asset: { select: { name: true, type: true, environment: true, criticality: true, internetExposed: true } },
          },
          take: 20,
        },
      },
    });

    if (!vuln) {
      return errorResponse(404, 'Case not found');
    }

    // Deduplicate assets from findings
    const assetMap = new Map<string, { name: string; type: string; environment: string; criticality: string; internetExposed: boolean }>();
    for (const f of vuln.findings) {
      if (f.asset && !assetMap.has(f.asset.name)) {
        assetMap.set(f.asset.name, f.asset);
      }
    }

    // --- Aggregate org-specific feedback for prompt enrichment ---
    const feedbackRows = await prisma.triageFeedback.findMany({
      where: { organizationId: orgId },
      select: {
        outcome: true,
        originalSeverity: true,
        correctedSeverity: true,
        originalVerdict: true,
        correctedVerdict: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // last 500 reviews — enough for patterns, bounded for perf
    });

    const feedbackStats = aggregateFeedback(feedbackRows);
    const feedbackContext = buildFeedbackContext(feedbackStats);

    // --- Run AI triage with feedback context ---
    const agent = new TriageAgent();
    const decision = await agent.triageCase(
      {
        caseId: vuln.id,
        title: vuln.title,
        description: vuln.description ?? undefined,
        cveIds: vuln.cveIds,
        cweIds: vuln.cweIds,
        severity: vuln.severity,
        cvssScore: vuln.cvssScore ? Number(vuln.cvssScore) : null,
        cvssVector: vuln.cvssVector ?? null,
        epssScore: vuln.epssScore ? Number(vuln.epssScore) : null,
        epssPercentile: vuln.epssPercentile ? Number(vuln.epssPercentile) : null,
        kevListed: vuln.kevListed,
        kevDueDate: vuln.kevDueDate?.toISOString() ?? null,
        assets: [...assetMap.values()].map((a) => ({
          name: a.name,
          type: a.type,
          environment: a.environment,
          criticality: a.criticality,
          internetExposed: a.internetExposed,
        })),
        existingFindings: vuln.findingCount,
      },
      { feedbackContext: feedbackContext || undefined },
    );

    // --- Persist triage results on the case ---
    await prisma.vulnerabilityCase.updateMany({
      where: { id: vuln.id, organizationId: orgId },
      data: {
        triageVerdict: decision.recommendedAction,
        triageConfidence: decision.confidenceScore,
        triageModel: decision.model,
        triageAt: decision.triagedAt,
        severityOverride: decision.severityOverride ?? undefined,
      },
    });

    // Increment usage counter
    await incrementAiUsage(orgId);
    const clientId = (session as unknown as Record<string, unknown>).clientId as string ?? orgId;
    await trackAiCall(orgId, clientId);

    return NextResponse.json({
      ...decision,
      feedbackEnriched: feedbackContext.length > 0,
      feedbackStats: {
        totalReviews: feedbackStats.totalReviews,
        accuracy: feedbackStats.accuracy,
      },
    });
  } catch (err: unknown) {
    console.error('[AI Triage] Error:', err);

    const message =
      err instanceof Error ? err.message : 'Unknown error during triage';

    if (message.includes('ANTHROPIC_API_KEY')) {
      return errorResponse(500, 'AI service temporarily unavailable');
    }

    return errorResponse(500, 'Failed to triage case');
  }
}
