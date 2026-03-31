// @cveriskpilot/billing — Stripe webhook handling

import Stripe from 'stripe';
// createLogger reserved for future structured logging in this module
// import { createLogger } from '@cveriskpilot/shared';
import { getEntitlements, getTierFromPriceId, STRIPE_PRICES } from './config';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

/**
 * Verify a Stripe webhook signature and return the parsed event.
 * Throws if the signature is invalid.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }
  const stripe = getStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// ---------------------------------------------------------------------------
// Individual event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  event: Stripe.Event,
  prisma: unknown,
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const organizationId = session.metadata?.organizationId;

  if (!organizationId) {
    console.warn('[billing] checkout.session.completed missing organizationId in metadata');
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : (session.subscription as Stripe.Subscription | null)?.id;

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id;

  // Resolve tier from the subscription's price ID instead of hardcoding
  let tier = 'PRO'; // fallback
  let meteredItemId: string | null = null;

  if (subscriptionId) {
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      if (priceId) {
        tier = getTierFromPriceId(priceId) ?? 'PRO';
      }

      // Persist the metered subscription item ID for MSSP usage reporting
      const meteredPriceId = STRIPE_PRICES.MSSP_METERED();
      if (meteredPriceId) {
        const meteredItem = subscription.items.data.find(
          (item) => item.price.id === meteredPriceId,
        );
        meteredItemId = meteredItem?.id ?? null;
      }
    } catch {
      // If retrieval fails, fall back to PRO
    }
  }

  const db = prisma as {
    organization: {
      findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
      update: (args: Record<string, unknown>) => Promise<unknown>;
    };
  };

  // Verify that the Stripe customer matches the org to prevent metadata spoofing
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    console.error('[billing] Webhook org not found', { organizationId });
    return;
  }
  if (org.stripeCustomerId && customerId && org.stripeCustomerId !== customerId) {
    console.error('[billing] Webhook customer mismatch', { expected: org.stripeCustomerId, got: customerId });
    return;
  }

  await db.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: subscriptionId ?? null,
      stripeMeteredItemId: meteredItemId,
      tier,
      entitlements: getEntitlements(tier),
    },
  });
}

async function handleSubscriptionUpdated(
  event: Stripe.Event,
  prisma: unknown,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    console.warn('[billing] customer.subscription.updated missing organizationId in metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  if (!tier) {
    console.warn(`[billing] Unknown price ID: ${priceId}`);
    return;
  }

  // Resolve metered item ID for MSSP usage reporting
  const meteredPriceId = STRIPE_PRICES.MSSP_METERED();
  let meteredItemId: string | null = null;
  if (meteredPriceId) {
    const meteredItem = subscription.items.data.find(
      (item) => item.price.id === meteredPriceId,
    );
    meteredItemId = meteredItem?.id ?? null;
  }

  const db = prisma as {
    organization: {
      update: (args: Record<string, unknown>) => Promise<unknown>;
    };
  };

  await db.organization.update({
    where: { id: organizationId },
    data: {
      tier,
      entitlements: getEntitlements(tier),
      stripeMeteredItemId: meteredItemId,
    },
  });
}

async function handleSubscriptionDeleted(
  event: Stripe.Event,
  prisma: unknown,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const organizationId = subscription.metadata?.organizationId;

  if (!organizationId) {
    console.warn('[billing] customer.subscription.deleted missing organizationId in metadata');
    return;
  }

  const db = prisma as {
    organization: {
      update: (args: Record<string, unknown>) => Promise<unknown>;
    };
  };

  await db.organization.update({
    where: { id: organizationId },
    data: {
      tier: 'FREE',
      entitlements: getEntitlements('FREE'),
      stripeSubscriptionId: null,
    },
  });
}

async function handlePaymentFailed(
  event: Stripe.Event,
  _prisma: unknown,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer | null)?.id;

  console.warn(
    `[billing] Payment failed for customer ${customerId ?? 'unknown'}, invoice ${invoice.id}`,
  );

  // Future: send email notification, set a flag on org, etc.
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatches a verified Stripe event to the appropriate handler.
 */
export async function handleWebhookEvent(
  event: Stripe.Event,
  prisma: unknown,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event, prisma);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event, prisma);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event, prisma);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event, prisma);
      break;
    default:
      // Unhandled event type — no-op
      break;
  }
}
