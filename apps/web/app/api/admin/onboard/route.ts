import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { onboardTenant } from '@cveriskpilot/auth/org/onboarding';

/**
 * POST /api/admin/onboard
 * Admin-only endpoint to onboard a new tenant.
 * Body: { orgName, ownerEmail, ownerName, ownerPassword?, tier?, features?, defaultClientName? }
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Replace with real admin auth check (e.g., session role === PLATFORM_ADMIN)
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminToken && authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
