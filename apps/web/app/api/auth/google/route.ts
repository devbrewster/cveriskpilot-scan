import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getGoogleOIDCConfig } from '@cveriskpilot/auth';

export const dynamic = 'force-dynamic';

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

    // Determine callback URL from the request origin
    const origin = request.nextUrl.origin;
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
    return NextResponse.redirect(
      new URL('/login?error=google_config', request.url),
    );
  }
}
