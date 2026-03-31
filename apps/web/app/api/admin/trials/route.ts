import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requirePerm, checkCsrf } from '@cveriskpilot/auth';
import { logAudit } from '@/lib/audit';
import { getEntitlements } from '@cveriskpilot/billing';

const VALID_TRIAL_TIERS = ['PRO', 'ENTERPRISE'] as const;

/**
 * POST /api/admin/trials
 * Platform-admin endpoint to extend or grant a trial for an organization.
 * Body: { organizationId: string, days: number, tier?: 'PRO' | 'ENTERPRISE' }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const permError = requirePerm(session.role, 'platform:admin');
    if (permError) return permError;

    let body: { organizationId: string; days: number; tier?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.organizationId || !body.days || body.days < 1 || body.days > 90) {
      return NextResponse.json(
        { error: 'organizationId and days (1-90) required' },
        { status: 400 },
      );
    }

    const tier = (body.tier ?? 'PRO') as string;
    if (!VALID_TRIAL_TIERS.includes(tier as (typeof VALID_TRIAL_TIERS)[number])) {
      return NextResponse.json(
        { error: `Invalid tier. Must be: ${VALID_TRIAL_TIERS.join(', ')}` },
        { status: 400 },
      );
    }

    // Verify org exists
    const org = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true, name: true, tier: true, trialEndsAt: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Calculate new trial end date — extend from current end if still active, otherwise from now
    const now = new Date();
    const currentEnd = org.trialEndsAt && org.trialEndsAt > now ? org.trialEndsAt : now;
    const newEnd = new Date(currentEnd.getTime() + body.days * 24 * 60 * 60 * 1000);

    const entitlements = getEntitlements(tier);

    await prisma.organization.update({
      where: { id: body.organizationId },
      data: {
        tier: tier as any,
        trialEndsAt: newEnd,
        entitlements: entitlements as any,
      },
    });

    // Audit log (best-effort)
    try {
      await logAudit({
        action: 'UPDATE',
        entityType: 'organization',
        entityId: body.organizationId,
        actorId: session.userId,
        organizationId: session.organizationId,
        details: {
          description: `Extended trial: ${tier} tier for ${body.days} days (expires ${newEnd.toISOString()})`,
          tier,
          days: body.days,
          previousTier: org.tier,
          previousTrialEnd: org.trialEndsAt?.toISOString() ?? null,
        },
      });
    } catch { /* audit logging is best-effort */ }

    return NextResponse.json({
      organizationId: org.id,
      organizationName: org.name,
      tier,
      trialEndsAt: newEnd.toISOString(),
      previousTier: org.tier,
      previousTrialEnd: org.trialEndsAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[API] POST /api/admin/trials error:', error);
    return NextResponse.json(
      { error: 'Failed to extend trial' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/trials
 * Platform-admin endpoint to list organizations with active or expired trials.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const permError = requirePerm(session.role, 'platform:admin');
    if (permError) return permError;

    const trials = await prisma.organization.findMany({
      where: {
        trialEndsAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tier: true,
        trialEndsAt: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { trialEndsAt: 'asc' },
      take: 100,
    });

    return NextResponse.json({ trials });
  } catch (error) {
    console.error('[API] GET /api/admin/trials error:', error);
    return NextResponse.json(
      { error: 'Failed to list trials' },
      { status: 500 },
    );
  }
}
