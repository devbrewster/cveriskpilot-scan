import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkCsrf, requireRole, ADMIN_ROLES } from '@cveriskpilot/auth';
import {
  STRIPE_PRICES,
  getEntitlements,
  createCheckoutSession,
  createSetupCheckoutSession,
} from '@cveriskpilot/billing';

/**
 * POST /api/billing/upgrade
 * Upgrade or downgrade the authenticated user's organization billing tier.
 * Body: { targetTier, billingInterval }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const session = auth;

    // CSRF protection
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    const roleError = requireRole(session.role, ADMIN_ROLES);
    if (roleError) return roleError;

    const body = await request.json();
    const { targetTier, billingInterval = 'monthly' } = body;
    const organizationId = session.organizationId;

    if (!targetTier) {
      return NextResponse.json(
        { error: 'targetTier is required' },
        { status: 400 },
      );
    }

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true,
        tier: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        users: { select: { email: true }, take: 1 },
      },
    });

    const tier = targetTier.toUpperCase();

    const VALID_TIERS = new Set(['FREE', 'FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP']);
    if (!VALID_TIERS.has(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const email = org.users[0]?.email ?? '';

    // FREE tier handling
    if (tier === 'FREE') {
      // If they have an existing subscription, cancel it (downgrade)
      if (org.stripeSubscriptionId) {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-02-24.acacia',
        });
        await stripe.subscriptions.update(org.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        return NextResponse.json({
          tier: 'FREE',
          message: 'Subscription will be cancelled at end of current period.',
        });
      }

      // New Free signup — collect payment method via Stripe setup mode
      if (!org.stripeCustomerId) {
        const { url } = await createSetupCheckoutSession({
          organizationId,
          email,
        });
        return NextResponse.json({
          tier: 'FREE',
          checkoutUrl: url,
          message: 'Redirect to Stripe to add payment method.',
        });
      }

      return NextResponse.json({
        tier: 'FREE',
        message: 'Already on Free tier with payment method on file.',
      });
    }

    // Resolve the Stripe price ID
    const priceKey = billingInterval === 'annual'
      ? `${tier}_ANNUAL`
      : `${tier}_MONTHLY`;

    const priceGetter = (STRIPE_PRICES as Record<string, (() => string) | undefined>)[priceKey];
    const priceId = priceGetter?.();

    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for ${tier} ${billingInterval}` },
        { status: 400 },
      );
    }

    // If they already have a subscription, update it via Stripe portal
    if (org.stripeSubscriptionId && org.stripeCustomerId) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-02-24.acacia',
      });

      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        items: [
          {
            id: (await stripe.subscriptions.retrieve(org.stripeSubscriptionId)).items.data[0]?.id,
            price: priceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: { organizationId },
      });

      // Update local tier immediately
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          tier: tier as any,
          entitlements: getEntitlements(tier) as any,
        },
      });

      return NextResponse.json({
        tier,
        message: `Subscription updated to ${tier}.`,
      });
    }

    // No existing subscription — create a new checkout session
    const { url } = await createCheckoutSession({
      organizationId,
      email,
      priceId,
    });

    return NextResponse.json({
      tier,
      checkoutUrl: url,
      message: 'Redirect to Stripe Checkout to complete upgrade.',
    });
  } catch (error) {
    console.error('[API] POST /api/billing/upgrade error:', error);
    return NextResponse.json(
      { error: 'Failed to process upgrade' },
      { status: 500 },
    );
  }
}
