import { NextRequest, NextResponse } from 'next/server';
import { initiateSSO, isWorkOSConfigured } from '@cveriskpilot/auth';

/**
 * GET /api/auth/sso — Redirect the user to the WorkOS SSO login page.
 *
 * Query params:
 *   - organizationId: WorkOS organization ID (required)
 *   - redirectUri: Optional override for the callback URI
 */
export async function GET(request: NextRequest) {
  try {
    if (!isWorkOSConfigured()) {
      return NextResponse.json(
        { error: 'SSO is not configured for this instance' },
        { status: 501 },
      );
    }

    const { searchParams } = request.nextUrl;
    const organizationId = searchParams.get('organizationId');
    const redirectUri = searchParams.get('redirectUri') ?? undefined;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId query parameter is required' },
        { status: 400 },
      );
    }

    const authorizationUrl = await initiateSSO(organizationId, redirectUri);

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error('[API] GET /api/auth/sso error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate SSO' },
      { status: 500 },
    );
  }
}
