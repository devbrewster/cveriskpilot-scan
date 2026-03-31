import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { initiateSSO, isWorkOSConfigured } from '@cveriskpilot/auth';
import { prisma } from '@/lib/prisma';

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
 *   - organizationId: WorkOS organization ID (required unless domain is provided)
 *   - domain: Company email domain (e.g. acme.com) — looks up the org
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
    let organizationId = searchParams.get('organizationId');
    const domain = searchParams.get('domain');
    const redirectUri = getSafeRedirectUri(searchParams.get('redirectUri'));

    // Domain→org lookup: find org by verified domain
    if (!organizationId && domain) {
      const org = await prisma.organization.findFirst({
        where: { domain: domain.toLowerCase(), deletedAt: null },
        select: { id: true },
      });

      if (!org) {
        return NextResponse.json(
          { error: `No organization found for domain "${domain}". Contact your IT administrator.` },
          { status: 404 },
        );
      }

      organizationId = org.id;
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId or domain query parameter is required' },
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
