import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkCsrf, getSensitiveWriteLimiter, requirePerm } from '@cveriskpilot/auth';
import { onboardTenant } from '@cveriskpilot/auth/org/onboarding';

/**
 * POST /api/admin/onboard
 * Admin-only endpoint to onboard a new tenant.
 * Body: { orgName, ownerEmail, ownerName, ownerPassword?, tier?, features?, defaultClientName? }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit — sensitive write endpoint
    try {
      const limiter = getSensitiveWriteLimiter();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const allowed = await limiter.check(ip);
      if (!allowed.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch { /* Redis unavailable — don't block */ }

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'platform:admin');
    if (permError) return permError;

    const body = await request.json();
    const { orgName, ownerEmail, ownerName, ownerPassword, tier, features, defaultClientName } = body;

    if (!orgName || !ownerEmail || !ownerName) {
      return NextResponse.json(
        { error: 'orgName, ownerEmail, and ownerName are required' },
        { status: 400 },
      );
    }

    // Check for duplicate email
    const existingUser = await prisma.user.findFirst({
      where: { email: ownerEmail.toLowerCase().trim() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    const result = await onboardTenant(prisma as any, {
      orgName,
      ownerEmail,
      ownerName,
      ownerPassword,
      tier,
      features,
      defaultClientName,
    });

    return NextResponse.json(
      {
        message: 'Tenant onboarded successfully',
        orgId: result.orgId,
        userId: result.userId,
        clientId: result.clientId,
        slug: result.slug,
        apiKey: result.apiKey,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] POST /api/admin/onboard error:', error);
    return NextResponse.json(
      { error: 'Failed to onboard tenant' },
      { status: 500 },
    );
  }
}
