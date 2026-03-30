import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, generateApiKey } from '@cveriskpilot/auth';

/**
 * POST /api/billing/quick-purchase/provision
 *
 * Called by the /buy/success page after Stripe checkout completes (or for free plans).
 * Generates an auto-provisioned API key for the authenticated user's org.
 *
 * Body: { sessionId: string } | { plan: 'free' }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    const body = await request.json();
    const { sessionId, plan } = body as { sessionId?: string; plan?: string };

    if (!sessionId && plan !== 'free') {
      return NextResponse.json(
        { error: 'Missing sessionId or plan' },
        { status: 400 },
      );
    }

    // Check if an auto-provisioned key already exists for this org
    const existingKey = await (prisma as any).apiKey.findFirst({
      where: {
        organizationId: session.organizationId,
        name: 'CLI Scanner Key (auto-provisioned)',
      },
    });

    if (existingKey) {
      return NextResponse.json(
        { error: 'API key already provisioned for this account. If you lost your key, create a new one from Settings > API Keys.' },
        { status: 409 },
      );
    }

    // For paid plans, verify the Stripe session completed
    if (sessionId && plan !== 'free') {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-02-24.acacia',
        });

        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

        if (checkoutSession.payment_status !== 'paid') {
          return NextResponse.json(
            { error: 'Payment not completed. Please complete checkout first.' },
            { status: 402 },
          );
        }

        // Verify the session belongs to this org
        if (checkoutSession.metadata?.organizationId !== session.organizationId) {
          return NextResponse.json(
            { error: 'Checkout session does not match your account' },
            { status: 403 },
          );
        }
      } catch (stripeErr) {
        console.error('[API] quick-purchase/provision Stripe verification failed:', stripeErr);
        return NextResponse.json(
          { error: 'Failed to verify payment. Please try again or contact support.' },
          { status: 500 },
        );
      }
    }

    // Get org slug for key generation
    const org = await (prisma as any).organization.findUnique({
      where: { id: session.organizationId },
      select: { slug: true, tier: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Generate the API key
    const generated = generateApiKey(org.slug);

    const rotationDays = (org.tier === 'ENTERPRISE' || org.tier === 'MSSP') ? 180 : 90;
    const rotationRequiredBy = new Date(Date.now() + rotationDays * 24 * 60 * 60 * 1000);

    const apiKey = await (prisma as any).apiKey.create({
      data: {
        organizationId: session.organizationId,
        name: 'CLI Scanner Key (auto-provisioned)',
        keyHash: generated.keyHash,
        scope: 'read,upload',
        assignedClients: [],
        rotationRequiredBy,
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorId: session.userId,
          action: 'CREATE',
          entityType: 'ApiKey',
          entityId: apiKey.id,
          details: { name: 'CLI Scanner Key (auto-provisioned)', scope: 'read,upload', source: 'quick-purchase' },
          hash: `create-apikey-${apiKey.id}-${Date.now()}`,
        },
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      key: generated.key,
      keyPreview: generated.keyPrefix,
      tier: org.tier,
      orgSlug: org.slug,
    });
  } catch (error) {
    console.error('[API] POST /api/billing/quick-purchase/provision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
