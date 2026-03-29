import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getGoogleOIDCConfig } from '@cveriskpilot/auth';

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
 * GET /api/auth/google
 * Initiates Google OAuth2 authorization code flow.
 * Redirects the user to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  try {
    const config = getGoogleOIDCConfig();

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');

    const origin = getSafeOrigin(request);
    const redirectUri = `${origin}/api/auth/google/callback`;

    // Build Google authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Set state cookie for CSRF validation in callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('crp_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('[API] GET /api/auth/google error:', error);
    const fallbackOrigin = getSafeOrigin(request);
    return NextResponse.redirect(
      new URL('/login?error=google_config', fallbackOrigin),
    );
  }
}
