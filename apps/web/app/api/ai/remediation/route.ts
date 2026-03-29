// ---------------------------------------------------------------------------
// POST /api/ai/remediation — AI-powered remediation guidance
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, getSensitiveWriteLimiter } from '@cveriskpilot/auth';
import { getOrgTier, checkBillingGate, trackAiCall } from '@/lib/billing';
import type { RemediationRequest, RemediationResult } from '@cveriskpilot/ai';

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

  // Rate limiting — 10 req/min per user
  try {
    const limiter = getSensitiveWriteLimiter();
    const rl = await limiter.check(`ai_remediation:${session.userId}`);
    if (!rl.allowed) {
      return errorResponse(429, 'Too many requests. Please try again later.');
    }
  } catch {
    // Redis not available — skip rate limiting
  }

  let body: { caseId?: string; caseData?: Partial<RemediationRequest> };
  try {
    body = (await request.json()) as { caseId?: string; caseData?: Partial<RemediationRequest> };
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  const { caseId, caseData: rawCaseData } = body;
  if (!rawCaseData) {
    return errorResponse(400, 'Missing caseData in request body');
  }
  if (!rawCaseData.title) {
    return errorResponse(400, 'Missing title in caseData');
  }
  if (!rawCaseData.severity) {
    return errorResponse(400, 'Missing severity in caseData');
  }

  // Merge caseId into caseData and apply defaults for optional arrays
  const caseData: RemediationRequest = {
    caseId: caseId ?? rawCaseData.caseId ?? 'unknown',
    title: rawCaseData.title,
    description: rawCaseData.description,
    cveIds: rawCaseData.cveIds ?? [],
    cweIds: rawCaseData.cweIds ?? [],
    severity: rawCaseData.severity,
    cvssScore: rawCaseData.cvssScore ?? null,
    cvssVector: rawCaseData.cvssVector ?? null,
    epssScore: rawCaseData.epssScore ?? null,
    epssPercentile: rawCaseData.epssPercentile ?? null,
    kevListed: rawCaseData.kevListed ?? false,
    kevDueDate: rawCaseData.kevDueDate ?? null,
    assets: rawCaseData.assets,
    findings: rawCaseData.findings,
    packageName: rawCaseData.packageName,
    packageVersion: rawCaseData.packageVersion,
  };

  try {
    const {
      generateRemediation,
      parseRemediationResponse,
      checkAiRateLimit,
      incrementAiUsage,
    } = await import('@cveriskpilot/ai');

    // --- Billing gate + rate limiting ---
    const orgId = session.organizationId;
    const tier = await getOrgTier(orgId);

    const gate = await checkBillingGate(orgId, tier, 'ai_remediation');
    if (!gate.allowed) {
      return errorResponse(403, gate.reason ?? 'AI call limit reached');
    }

    const limit = await checkAiRateLimit(orgId, tier);
    if (!limit.allowed) {
      return errorResponse(429, `AI rate limit exceeded. Resets at ${limit.resetAt.toISOString()}`);
    }

    const response = await generateRemediation(caseData);
    const result: RemediationResult = parseRemediationResponse(
      response.content,
      response.model,
    );

    // Increment usage counter + MSSP metering
    await incrementAiUsage(orgId);
    const clientId = (session as unknown as Record<string, unknown>).clientId as string ?? orgId;
    await trackAiCall(orgId, clientId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[AI Remediation] Error:', err);

    const message =
      err instanceof Error ? err.message : 'Unknown error generating remediation';

    // Surface specific error types
    if (message.includes('ANTHROPIC_API_KEY')) {
      return errorResponse(500, 'AI service not configured');
    }

    return errorResponse(500, 'Failed to generate remediation guidance');
  }
}
