import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getGitHubOAuthConfig } from '@cveriskpilot/auth';
import { checkAuthRateLimit } from '@/lib/auth-rate-limit';

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
 * GET /api/auth/github
 * Initiates GitHub OAuth authorization code flow.
 * Redirects the user to GitHub's authorization screen.
 */
export async function GET(request: NextRequest) {
  // IP-based auth rate limit (10 req/min) — runs before any other logic
  const rateLimited = await checkAuthRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    const config = getGitHubOAuthConfig();

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');

    // Capture plan from query string (e.g. /api/auth/github?plan=founders_beta)
    const plan = request.nextUrl.searchParams.get('plan') || '';

    const origin = getSafeOrigin(request);
    const redirectUri = `${origin}/api/auth/github/callback`;

    // Build GitHub authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    // Set state cookie for CSRF validation in callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('crp_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    // Persist selected plan so the callback can create the right Stripe session
    if (plan) {
      response.cookies.set('crp_oauth_plan', plan, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      });
    }

    return response;
  } catch (error) {
    console.error('[API] GET /api/auth/github error:', error);
    const fallbackOrigin = getSafeOrigin(request);
    return NextResponse.redirect(
      new URL('/login?error=github_config', fallbackOrigin),
    );
  }
}
