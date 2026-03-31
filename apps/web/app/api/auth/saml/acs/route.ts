import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  handleTenantSSOCallback,
  getOrCreateTenantSSOUser,
  getTenantIdPConfig,
  createSession,
  setSessionCookie,
} from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/saml/acs — SAML Assertion Consumer Service
 *
 * Receives the IdP's POST-binding SAMLResponse, validates the assertion,
 * creates/finds the user, creates a session, and redirects to the dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string | null;
    const relayState = formData.get('RelayState') as string | null;

    if (!samlResponse) {
      return NextResponse.json(
        { error: 'Missing SAMLResponse in form body' },
        { status: 400 },
      );
    }

    // RelayState format: "clientId:state"
    if (!relayState) {
      return NextResponse.json(
        { error: 'Missing RelayState — cannot determine tenant' },
        { status: 400 },
      );
    }

    const [clientId] = relayState.split(':');
    if (!clientId) {
      return NextResponse.json(
        { error: 'Invalid RelayState format' },
        { status: 400 },
      );
    }

    // Look up tenant IdP config
    const config = await getTenantIdPConfig(prisma, clientId);
    if (!config || !config.enabled) {
      return NextResponse.json(
        { error: 'SSO is not configured for this tenant' },
        { status: 404 },
      );
    }

    if (config.provider !== 'saml') {
      return NextResponse.json(
        { error: 'SAML ACS endpoint received request for non-SAML provider' },
        { status: 400 },
      );
    }

    // Look up the client's organization
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { organizationId: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 },
      );
    }

    // Parse and validate the SAML assertion
    const profile = await handleTenantSSOCallback(samlResponse, clientId, config);

    // Find or create user
    const { userId, organizationId } = await getOrCreateTenantSSOUser(
      prisma,
      profile,
      client.organizationId,
    );

    // Get user for session
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found after provisioning' },
        { status: 500 },
      );
    }

    // Create session
    const sessionId = await createSession({
      userId,
      organizationId,
      role: user.role,
      email: user.email,
    });

    // Audit log
    await logAudit({
      organizationId,
      entityType: 'user',
      entityId: userId,
      action: 'LOGIN',
      actorId: userId,
      actorIp: request.headers.get('x-forwarded-for') ?? 'unknown',
      details: { method: 'saml', clientId, issuer: profile.sub },
    });

    // Set session cookie and redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    setSessionCookie(response, sessionId);

    return response;
  } catch (error) {
    console.error('[SAML ACS] Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const errorMsg = encodeURIComponent(
      error instanceof Error ? error.message : 'SAML authentication failed',
    );
    return NextResponse.redirect(`${baseUrl}/login?error=${errorMsg}`);
  }
}
