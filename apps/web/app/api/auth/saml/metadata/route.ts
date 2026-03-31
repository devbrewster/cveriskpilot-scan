import { NextResponse } from 'next/server';
import { generateSPMetadata } from '@cveriskpilot/auth';

/**
 * GET /api/auth/saml/metadata — SAML Service Provider Metadata
 *
 * Returns the SP metadata XML that IdP admins use to configure their side
 * of the SSO connection (Okta, Azure AD, OneLogin, etc).
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cveriskpilot.com';

  const metadata = generateSPMetadata({
    entityId: `${baseUrl}/api/auth/saml/metadata`,
    acsUrl: `${baseUrl}/api/auth/saml/acs`,
    sloUrl: `${baseUrl}/api/auth/logout`,
    nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  });

  return new NextResponse(metadata, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
