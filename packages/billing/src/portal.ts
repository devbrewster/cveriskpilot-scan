// @cveriskpilot/billing — subscription status and management

import Stripe from 'stripe';
import type { SubscriptionStatus } from './types';
import { getUsageSummary } from './usage';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

interface OrgRecord {
  id: string;
  tier: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface PrismaClient {
  organization: {
    findUniqueOrThrow: (args: Record<string, unknown>) => Promise<OrgRecord>;
  };
}

/**
 * Fetch subscription status for an organization.
 * Combines local DB tier with live Stripe subscription data.
 */
export async function getSubscriptionStatus(
  prisma: unknown,
  organizationId: string,
): Promise<SubscriptionStatus> {
  const db = prisma as PrismaClient;
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      id: true,
      tier: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  let isActive = true;
  let currentPeriodEnd: Date | null = null;
  let cancelAtPeriodEnd = false;

  if (org.stripeSubscriptionId) {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    isActive = sub.status === 'active' || sub.status === 'trialing';
    currentPeriodEnd = new Date(sub.current_period_end * 1000);
    cancelAtPeriodEnd = sub.cancel_at_period_end;
  }

  const usage = await getUsageSummary(organizationId, org.tier);

  return {
    tier: org.tier,
    isActive,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    stripeCustomerId: org.stripeCustomerId,
    usage: {
      uploads: usage.uploads.current,
      aiCalls: usage.aiCalls.current,
    },
  };
}

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscription(
  prisma: unknown,
  organizationId: string,
): Promise<void> {
  const db = prisma as PrismaClient;
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      stripeSubscriptionId: true,
    } as Record<string, unknown>,
  }) as unknown as OrgRecord;

  if (!org.stripeSubscriptionId) {
    throw new Error('Organization does not have an active subscription');
  }

  const stripe = getStripe();
  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate a subscription that was scheduled for cancellation.
 */
export async function reactivateSubscription(
  prisma: unknown,
  organizationId: string,
): Promise<void> {
  const db = prisma as PrismaClient;
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      stripeSubscriptionId: true,
    } as Record<string, unknown>,
  }) as unknown as OrgRecord;

  if (!org.stripeSubscriptionId) {
    throw new Error('Organization does not have an active subscription');
  }

  const stripe = getStripe();
  await stripe.subscriptions.update(org.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
}
