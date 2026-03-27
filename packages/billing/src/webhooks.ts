// @cveriskpilot/billing — Stripe webhook handling

import Stripe from 'stripe';
import { getEntitlements, getTierFromPriceId } from './config';

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

  const db = prisma as {
    organization: {
      update: (args: Record<string, unknown>) => Promise<unknown>;
    };
  };

  await db.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: subscriptionId ?? null,
      tier: 'PRO',
      entitlements: getEntitlements('PRO'),
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
