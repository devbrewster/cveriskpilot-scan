import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  handleSSOCallback,
  getOrCreateSSOUser,
  isWorkOSConfigured,
  createSession,
  setSessionCookie,
} from '@cveriskpilot/auth';

/**
 * GET /api/auth/sso/callback — Handle the WorkOS SSO callback.
 *
 * WorkOS redirects here after a successful SSO login with a `code` query param.
 * This route exchanges the code for a profile, creates/finds the user,
 * creates a session, and redirects to the dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isWorkOSConfigured()) {
      return NextResponse.json(
        { error: 'SSO is not configured' },
        { status: 501 },
      );
    }

    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error(`[SSO Callback] Error from WorkOS: ${error} — ${errorDescription}`);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'sso_failed');
      loginUrl.searchParams.set('message', errorDescription ?? 'SSO authentication failed');
      return NextResponse.redirect(loginUrl);
    }

    if (!code) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'missing_code');
      return NextResponse.redirect(loginUrl);
    }

    // Exchange code for SSO profile
    const profile = await handleSSOCallback(code);

    // Determine the organization — use the WorkOS org ID or look up by domain
    let orgId: string | undefined;

    if (profile.organizationId) {
      // Look up org that has this WorkOS org ID in entitlements
      const org = await (prisma as any).organization.findFirst({
        where: {
          entitlements: {
            path: ['workosOrgId'],
            equals: profile.organizationId,
          },
          deletedAt: null,
        },
      });

      if (org) {
        orgId = org.id;
      }
    }

    // Fall back: find org by domain
    if (!orgId) {
      const domain = profile.email.split('@')[1];
      if (domain) {
        const org = await (prisma as any).organization.findFirst({
          where: {
            domain,
            deletedAt: null,
          },
        });

        if (org) {
          orgId = org.id;
        }
      }
    }

    if (!orgId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'org_not_found');
      loginUrl.searchParams.set(
        'message',
        'No organization found for your SSO account. Contact your administrator.',
      );
      return NextResponse.redirect(loginUrl);
    }

    // Find or create the user
    const { userId } = await getOrCreateSSOUser(prisma, profile, orgId);

    // Look up full user for session data
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, organizationId: true },
    });

    // Create session
    let sessionId: string | null = null;
    try {
      sessionId = await createSession({
        userId,
        organizationId: user.organizationId,
        role: user.role,
        email: user.email,
      });
    } catch {
      // Redis unavailable — session will not be persisted server-side
    }

    const dashboardUrl = new URL('/app/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);

    if (sessionId) {
      setSessionCookie(response, sessionId);
    } else {
      response.cookies.set('crp_session', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      });
    }

    return response;
  } catch (error) {
    console.error('[API] GET /api/auth/sso/callback error:', error);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_failed');
    loginUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'SSO authentication failed',
    );
    return NextResponse.redirect(loginUrl);
  }
}
