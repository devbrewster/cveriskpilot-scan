import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  authenticateWithGoogle,
  createSession,
  setSessionCookie,
  getGoogleOIDCConfig,
} from '@cveriskpilot/auth';

export const dynamic = 'force-dynamic';

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

    // Handle Google-side errors (user denied, etc.)
    if (error) {
      console.warn('[Google OAuth] Authorization error:', error);
      return NextResponse.redirect(
        new URL('/login?error=google_denied', request.url),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/login?error=google_invalid', request.url),
      );
    }

    // Validate CSRF state
    const savedState = request.cookies.get('crp_oauth_state')?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL('/login?error=google_state', request.url),
      );
    }

    const config = getGoogleOIDCConfig();
    const origin = request.nextUrl.origin;
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
        new URL('/login?error=google_token', request.url),
      );
    }

    const tokens = (await tokenResponse.json()) as {
      id_token?: string;
      access_token?: string;
    };

    if (!tokens.id_token) {
      console.error('[Google OAuth] No id_token in response');
      return NextResponse.redirect(
        new URL('/login?error=google_token', request.url),
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

    const response = NextResponse.redirect(
      new URL('/dashboard', request.url),
    );

    // Set session cookie
    if (sessionId) {
      setSessionCookie(response, sessionId);
    } else {
      response.cookies.set('crp_session', result.userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      });
    }

    // Clear the OAuth state cookie
    response.cookies.delete('crp_oauth_state');

    return response;
  } catch (error) {
    console.error('[API] GET /api/auth/google/callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=google_fail', request.url),
    );
  }
}
