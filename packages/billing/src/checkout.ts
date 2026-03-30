// @cveriskpilot/billing — Stripe Checkout session creation

import Stripe from 'stripe';
import type { CheckoutParams } from './types';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

function defaultBillingUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base}/billing`;
}

/**
 * Creates a Stripe Checkout Session in subscription mode.
 */
export async function createCheckoutSession(
  params: CheckoutParams,
): Promise<{ url: string }> {
  const stripe = getStripe();

  const successUrl = params.successUrl ?? `${defaultBillingUrl()}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = params.cancelUrl ?? defaultBillingUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: params.email,
    line_items: [{ price: params.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { organizationId: params.organizationId },
    },
    metadata: { organizationId: params.organizationId },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return { url: session.url };
}

/**
 * Creates a Stripe Checkout Session in setup mode (collects payment method without charging).
 * Used for the Free tier so we have payment info on file for future upgrades.
 */
export async function createSetupCheckoutSession(
  params: Omit<CheckoutParams, 'priceId'>,
): Promise<{ url: string }> {
  const stripe = getStripe();

  const successUrl = params.successUrl ?? `${defaultBillingUrl()}?setup=complete`;
  const cancelUrl = params.cancelUrl ?? defaultBillingUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer_email: params.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { organizationId: params.organizationId },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }

  return { url: session.url };
}

/**
 * Creates a Stripe Customer Portal session so a customer can manage their subscription.
 */
export async function createCustomerPortalSession(
  customerId: string,
): Promise<{ url: string }> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: defaultBillingUrl(),
  });

  return { url: session.url };
}
