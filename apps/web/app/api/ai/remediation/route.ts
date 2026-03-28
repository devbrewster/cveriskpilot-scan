// ---------------------------------------------------------------------------
// POST /api/ai/remediation — AI-powered remediation guidance
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from '@cveriskpilot/auth';
import type { RemediationRequest, RemediationResult } from '@cveriskpilot/ai';

// ---------- helpers --------------------------------------------------------

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// ---------- handler --------------------------------------------------------

export async function POST(request: NextRequest) {
  // --- Auth check ---
  const session = await getServerSession(request);
  if (!session) return errorResponse(401, 'Unauthorized');

  let body: { caseId?: string; caseData?: RemediationRequest };
  try {
    body = (await request.json()) as { caseId?: string; caseData?: RemediationRequest };
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  const { caseData } = body;
  if (!caseData) {
    return errorResponse(400, 'Missing caseData in request body');
  }

  try {
    const {
      generateRemediation,
      parseRemediationResponse,
      checkAiRateLimit,
      incrementAiUsage,
    } = await import('@cveriskpilot/ai');

    // --- Rate limiting ---
    const orgId = session.organizationId;
    const tier = (session as Record<string, unknown>).tier as string ?? 'FREE';
    const limit = await checkAiRateLimit(orgId, tier);
    if (!limit.allowed) {
      return errorResponse(429, `AI rate limit exceeded. Resets at ${limit.resetAt.toISOString()}`);
    }

    const response = await generateRemediation(caseData);
    const result: RemediationResult = parseRemediationResponse(
      response.content,
      response.model,
    );

    // Increment usage counter
    await incrementAiUsage(orgId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[AI Remediation] Error:', err);

    const message =
      err instanceof Error ? err.message : 'Unknown error generating remediation';

    // Surface specific error types
    if (message.includes('ANTHROPIC_API_KEY')) {
      return errorResponse(500, 'AI service not configured');
    }

    return errorResponse(500, message);
  }
}
