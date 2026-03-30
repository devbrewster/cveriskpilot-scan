import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { initiateSSO, isWorkOSConfigured } from '@cveriskpilot/auth';

/**
 * Only allow redirect URIs on our own domain to prevent open redirect attacks.
 */
function getSafeRedirectUri(uri: string | null): string | undefined {
  if (!uri) return undefined;
  try {
    const appOrigin = process.env.NEXTAUTH_URL || 'https://cveriskpilot.com';
    const parsed = new URL(uri, appOrigin);
    const allowed = new URL(appOrigin);
    if (parsed.origin === allowed.origin) return uri;
  } catch {
    // Malformed URI — ignore
  }
  return undefined;
}

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
    const redirectUri = getSafeRedirectUri(searchParams.get('redirectUri'));

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
