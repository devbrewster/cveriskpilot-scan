// POST /api/cron/report-usage — Daily cron to report metered usage to Stripe
//
// Called by Cloud Scheduler (or any cron) with Bearer token auth.
// Reports MSSP metered usage for all orgs with active Stripe subscriptions.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reportUsageToStripe, STRIPE_PRICES } from '@cveriskpilot/billing';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const maxDuration = 120; // allow up to 2 min for many orgs

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
}

export async function POST(request: NextRequest) {
  // --- Auth: Bearer token must match CRON_SECRET ---
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{ orgId: string; reported: boolean; totalQuantity: number }> = [];
  const errors: Array<{ orgId: string; error: string }> = [];

  try {
    // Find all MSSP orgs with active Stripe subscriptions
    const msspOrgs = await prisma.organization.findMany({
      where: {
        tier: 'MSSP',
        stripeSubscriptionId: { not: null },
      },
      select: {
        id: true,
        stripeSubscriptionId: true,
        stripeMeteredItemId: true,
      },
    });

    const meteredPriceId = STRIPE_PRICES.MSSP_METERED();
    const stripe = getStripe();

    for (const org of msspOrgs) {
      try {
        let meteredItemId = org.stripeMeteredItemId;

        // If not cached, resolve from Stripe and cache it
        if (!meteredItemId) {
          if (!meteredPriceId) {
            errors.push({ orgId: org.id, error: 'STRIPE_PRICE_MSSP_METERED not configured' });
            continue;
          }

          const subscription = await stripe.subscriptions.retrieve(
            org.stripeSubscriptionId!,
          );

          const meteredItem = subscription.items.data.find(
            (item) => item.price.id === meteredPriceId,
          );

          if (!meteredItem) {
            errors.push({
              orgId: org.id,
              error: `No metered line item found for price ${meteredPriceId}`,
            });
            continue;
          }

          meteredItemId = meteredItem.id;

          // Cache for future runs
          await prisma.organization.update({
            where: { id: org.id },
            data: { stripeMeteredItemId: meteredItemId },
          });
        }

        // Report usage to Stripe
        const result = await reportUsageToStripe(org.id, meteredItemId);
        results.push({ orgId: org.id, ...result });
      } catch (err) {
        errors.push({
          orgId: org.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      processed: msspOrgs.length,
      reported: results.filter((r) => r.reported).length,
      results,
      errors,
    });
  } catch (error) {
    console.error('[cron/report-usage] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to report usage' },
      { status: 500 },
    );
  }
}
