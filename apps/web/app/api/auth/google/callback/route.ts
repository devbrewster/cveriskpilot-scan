import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authenticateWithGoogle,
  createSession,
  setSessionCookie,
  getGoogleOIDCConfig,
} from '@cveriskpilot/auth';
import {
  STRIPE_PRICES,
  createCheckoutSession,
} from '@cveriskpilot/billing';

export const dynamic = 'force-dynamic';

/** Allowlist of valid origins to prevent host header poisoning. */
const ALLOWED_ORIGINS = [
  process.env.APP_BASE_URL,
  'http://localhost:3000',
].filter(Boolean) as string[];

function getSafeOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const candidate = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : request.nextUrl.origin;

  if (ALLOWED_ORIGINS.includes(candidate)) return candidate;
  return ALLOWED_ORIGINS[0] || request.nextUrl.origin;
}

/**
 * GET /api/auth/google/callback
 * Handles the OAuth2 callback from Google.
 * Exchanges the authorization code for tokens, authenticates/provisions the user,
 * creates a session, and redirects to the dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const origin = getSafeOrigin(request);

    // Handle Google-side errors (user denied, etc.)
    if (error) {
      console.warn('[Google OAuth] Authorization error:', error);
      return NextResponse.redirect(
        new URL('/login?error=google_denied', origin),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/login?error=google_invalid', origin),
      );
    }

    // Validate CSRF state
    const savedState = request.cookies.get('crp_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL('/login?error=google_state', origin),
      );
    }

    const config = getGoogleOIDCConfig();
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('[Google OAuth] Token exchange failed:', err);
      return NextResponse.redirect(
        new URL('/login?error=google_token', origin),
      );
    }

    const tokens = (await tokenResponse.json()) as {
      id_token?: string;
      access_token?: string;
    };

    if (!tokens.id_token) {
      console.error('[Google OAuth] No id_token in response');
      return NextResponse.redirect(
        new URL('/login?error=google_token', origin),
      );
    }

    // Authenticate with Google (verifies ID token + JIT provisions user/org)
    const result = await authenticateWithGoogle(prisma, tokens.id_token, config);

    // Look up user details for session
    const user = await (prisma as any).user.findUnique({
      where: { id: result.userId },
      select: { role: true, email: true },
    });

    // Create server-side session
    let sessionId: string | null = null;
    try {
      sessionId = await createSession({
        userId: result.userId,
        organizationId: result.organizationId,
        role: user.role,
        email: user.email,
      });
    } catch {
      // Redis not available — fallback below
    }

    // Session creation is required — no insecure fallback
    if (!sessionId) {
      console.error('[API] Google OAuth callback: Redis unavailable, cannot create session');
      return NextResponse.redirect(
        new URL('/login?error=session_unavailable', origin),
      );
    }

    // Determine post-auth destination: Stripe checkout (new signup) or dashboard (returning user)
    let redirectUrl = new URL('/dashboard', origin);

    if (result.isNewUser) {
      const plan = request.cookies.get('crp_oauth_plan')?.value?.toUpperCase() || '';
      const VALID_PAID_PLANS = new Set(['FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP']);

      // Only redirect to Stripe for paid plans — FREE goes straight to dashboard
      if (VALID_PAID_PLANS.has(plan)) {
        try {
          const priceKey = `${plan}_MONTHLY`;
          const priceGetter = (STRIPE_PRICES as Record<string, (() => string) | undefined>)[priceKey];
          const priceId = priceGetter?.();

          if (priceId) {
            const checkout = await createCheckoutSession({
              organizationId: result.organizationId,
              email: user.email,
              priceId,
            });
            redirectUrl = new URL(checkout.url);
          }
        } catch (stripeErr) {
          console.error('[Google OAuth] Stripe checkout creation failed:', stripeErr);
          // Fall through to dashboard — user can upgrade later
        }
      }
    }

    const response = NextResponse.redirect(redirectUrl);

    setSessionCookie(response, sessionId);

    // Clear OAuth cookies
    response.cookies.delete('crp_oauth_state');
    response.cookies.delete('crp_oauth_plan');

    return response;
  } catch (error) {
    console.error('[API] GET /api/auth/google/callback error:', error);
    const fallbackOrigin = getSafeOrigin(request);
    return NextResponse.redirect(
      new URL('/login?error=google_fail', fallbackOrigin),
    );
  }
}
