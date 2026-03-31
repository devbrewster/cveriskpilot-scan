import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCsrfToken } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

/**
 * Helper: attach a CSRF token cookie + include the token in the JSON body
 * so the frontend can send it back as X-CSRF-Token on mutations.
 */
function withCsrf(payload: Record<string, unknown>): NextResponse {
  const csrf = generateCsrfToken();
  const response = NextResponse.json({ ...payload, csrfToken: csrf.token });
  response.headers.append('Set-Cookie', csrf.cookie);
  return response;
}

export async function GET(request: NextRequest) {
  // Try Redis-backed session first
  try {
    const { requireAuth } = await import('@cveriskpilot/auth');
    const auth = await requireAuth(request);
    if (!(auth instanceof NextResponse)) {
      const session = auth;
      // Look up the org's actual tier from the database
      let tier = 'FREE';
      let trialEndsAt: string | null = null;
      try {
        const org = await prisma.organization.findUnique({
          where: { id: session.organizationId },
          select: { tier: true, trialEndsAt: true },
        });
        if (org?.tier) tier = org.tier;
        if (org?.trialEndsAt) trialEndsAt = org.trialEndsAt.toISOString();
      } catch {
        // DB unavailable — default to FREE
      }
      return withCsrf({
        authenticated: true,
        userId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        email: session.email,
        clientId: session.clientId ?? null,
        clientName: session.clientName ?? null,
        tier,
        trialEndsAt,
      });
    }
  } catch {
    // Redis unavailable — fall through to dev cookie check
  }

  // Dev-mode fallback: decode dev session from cookie
  if (process.env.NODE_ENV !== 'production') {
    const cookie = request.cookies.get('crp_session')?.value;
    if (cookie?.startsWith('dev:')) {
      try {
        const data = JSON.parse(
          Buffer.from(cookie.slice(4), 'base64').toString('utf-8'),
        );
        // Look up org tier from DB for dev sessions too
        let devTier = data.tier ?? 'FREE';
        let devTrialEndsAt: string | null = null;
        try {
          const org = await prisma.organization.findUnique({
            where: { id: data.organizationId },
            select: { tier: true, trialEndsAt: true },
          });
          if (org?.tier) devTier = org.tier;
          if (org?.trialEndsAt) devTrialEndsAt = org.trialEndsAt.toISOString();
        } catch {
          // DB unavailable — use cookie value
        }
        return withCsrf({
          authenticated: true,
          userId: data.userId,
          organizationId: data.organizationId,
          role: data.role,
          email: data.email,
          clientId: data.clientId ?? null,
          clientName: data.clientName ?? null,
          tier: devTier,
          trialEndsAt: devTrialEndsAt,
        });
      } catch {
        // Invalid dev cookie — fall through
      }
    }
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
