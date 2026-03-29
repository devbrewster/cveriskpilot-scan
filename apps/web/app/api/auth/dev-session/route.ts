// ---------------------------------------------------------------------------
// POST /api/auth/dev-session — Development-only session bootstrap
// Creates a session cookie backed by REAL database records.
// Seeds the database with dev data if no organization exists yet.
// This endpoint is development-only. The NODE_ENV check is the sole gate.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  // Block in non-development environments.
  // Requires BOTH NODE_ENV=development AND explicit DEV_SESSION_ENABLED=true.
  // This double-gate prevents accidental activation if NODE_ENV is misconfigured
  // in a Cloud Run or staging environment.
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.DEV_SESSION_ENABLED !== 'true'
  ) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const email = (body.email as string) || 'george.ontiveros@cveriskpilot.com';
  const role = (body.role as string) || 'PLATFORM_ADMIN';
  const tier = (body.tier as string) || 'MSSP';

  // -------------------------------------------------------------------------
  // 1. Find or seed the organization
  // -------------------------------------------------------------------------
  let org = await prisma.organization.findFirst({
    where: {
      OR: [{ slug: 'cveriskpilot' }, { domain: 'cveriskpilot.com' }],
    },
  });

  if (!org) {
    // No org exists — run the full dev seed to create org, users, assets, etc.
    console.log('[dev-session] No org found, running seedDevData...');
    const { seedDevData } = await import('@cveriskpilot/storage/seed/seed');
    await seedDevData(prisma);

    org = await prisma.organization.findFirstOrThrow({
      where: { slug: 'cveriskpilot' },
    });
  }

  const organizationId = org.id;

  // -------------------------------------------------------------------------
  // 2. Find or create the user for this session
  // -------------------------------------------------------------------------
  let user = await prisma.user.findFirst({
    where: { email, organizationId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        organizationId,
        email,
        name: email.split('@')[0].replace(/\./g, ' '),
        role: role as any,
        status: 'ACTIVE',
      },
    });
    console.log(`[dev-session] Created user ${user.email} (${user.id})`);
  }

  const userId = user.id;

  // -------------------------------------------------------------------------
  // 3. Find the default client for this org
  // -------------------------------------------------------------------------
  const client = await prisma.client.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const clientId = client?.id ?? undefined;
  const clientName = client?.name ?? undefined;

  // -------------------------------------------------------------------------
  // 4. Create session with real database IDs
  // -------------------------------------------------------------------------
  try {
    const { createSession } = await import('@cveriskpilot/auth');
    const sessionId = await createSession({
      userId,
      organizationId,
      role: role as any,
      email,
      clientId,
      clientName,
    });

    const response = NextResponse.json({
      success: true,
      email,
      role,
      organizationId,
      userId,
      clientId,
      clientName,
      tier,
      sessionId: sessionId.slice(0, 8) + '...',
      backend: 'redis',
    });

    response.cookies.set('crp_session', sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });

    return response;
  } catch {
    // Redis not available — use a dev-only encoded cookie
    const devSession = Buffer.from(
      JSON.stringify({
        userId,
        organizationId,
        role,
        email,
        clientId,
        clientName,
        tier,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).toString('base64');

    const response = NextResponse.json({
      success: true,
      email,
      role,
      organizationId,
      userId,
      clientId,
      clientName,
      tier,
      backend: 'cookie-fallback',
    });

    response.cookies.set('crp_session', `dev:${devSession}`, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });

    return response;
  }
}
