// ---------------------------------------------------------------------------
// POST /api/ai/remediation — AI-powered remediation guidance
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { RemediationRequest, RemediationResult } from '@cveriskpilot/ai';

// ---------- helpers --------------------------------------------------------

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// ---------- handler --------------------------------------------------------

export async function POST(request: NextRequest) {
  // --- Auth check (placeholder — wire up real session later) ---------------
  // const session = await getServerSession();
  // if (!session) return errorResponse(401, 'Unauthorized');

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
    // Dynamic import to keep the route bundle small and allow tree-shaking.
    // When the AI package is fully wired the imports resolve at runtime.
    const { generateRemediation, parseRemediationResponse } = await import(
      '@cveriskpilot/ai'
    );

    // --- Rate limiting (placeholder — uncomment when Redis is available) ---
    // const { checkAiRateLimit, incrementAiUsage } = await import('@cveriskpilot/ai');
    // const orgId = session.user.organizationId;
    // const tier = session.user.tier ?? 'FREE';
    // const limit = await checkAiRateLimit(orgId, tier);
    // if (!limit.allowed) {
    //   return errorResponse(429, `AI rate limit exceeded. Resets at ${limit.resetAt.toISOString()}`);
    // }

    const response = await generateRemediation(caseData);
    const result: RemediationResult = parseRemediationResponse(
      response.content,
      response.model,
    );

    // --- Increment usage counter ---
    // await incrementAiUsage(orgId);

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
