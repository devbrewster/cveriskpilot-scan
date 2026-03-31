#!/usr/bin/env node
/**
 * Creates CVERiskPilot products and prices in Stripe.
 * Run: node scripts/stripe-setup-products.mjs
 *
 * Outputs env vars to paste into .env.local
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

const TIERS = [
  {
    name: 'CVERiskPilot — Founders Beta',
    tier: 'FOUNDERS_BETA',
    monthlyPrice: 2900,  // $29 in cents
    annualPrice: 27800,  // $278 in cents
    description: 'Early adopter pricing. Locked in forever. 5 users, 250 assets, unlimited uploads.',
  },
  {
    name: 'CVERiskPilot — Pro',
    tier: 'PRO',
    monthlyPrice: 14900,
    annualPrice: 142800,
    description: 'Full compliance automation. 10 users, 1,000 assets, unlimited uploads, priority support.',
  },
  {
    name: 'CVERiskPilot — Enterprise',
    tier: 'ENTERPRISE',
    monthlyPrice: 19900,
    annualPrice: 191000,
    description: 'Advanced security & compliance. 50 users, 5000 assets, SSO/SAML, dedicated support.',
  },
  {
    name: 'CVERiskPilot — MSSP',
    tier: 'MSSP',
    monthlyPrice: 49900,
    annualPrice: 479000,
    description: 'Multi-tenant managed security provider. Unlimited everything + white-label.',
  },
];

async function main() {
  const envLines = [];

  for (const t of TIERS) {
    console.log(`\nCreating product: ${t.name}...`);

    // Check if product already exists by metadata
    const existing = await stripe.products.search({
      query: `metadata["tier"]:"${t.tier}"`,
    });

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log(`  Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: t.name,
        description: t.description,
        metadata: { tier: t.tier },
      });
      console.log(`  Created product: ${product.id}`);
    }

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: t.monthlyPrice,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { tier: t.tier, interval: 'monthly' },
    });
    console.log(`  Monthly price: ${monthlyPrice.id} ($${t.monthlyPrice / 100}/mo)`);
    envLines.push(`STRIPE_PRICE_${t.tier}_MONTHLY=${monthlyPrice.id}`);

    // Create annual price
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: t.annualPrice,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { tier: t.tier, interval: 'annual' },
    });
    console.log(`  Annual price: ${annualPrice.id} ($${t.annualPrice / 100}/yr)`);
    envLines.push(`STRIPE_PRICE_${t.tier}_ANNUAL=${annualPrice.id}`);

    // MSSP metered price for per-client usage
    if (t.tier === 'MSSP') {
      const meteredPrice = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        recurring: {
          interval: 'month',
          usage_type: 'metered',
        },
        billing_scheme: 'per_unit',
        unit_amount: 10, // $0.10 per unit
        metadata: { tier: 'MSSP', interval: 'metered' },
      });
      console.log(`  Metered price: ${meteredPrice.id}`);
      envLines.push(`STRIPE_PRICE_MSSP_METERED=${meteredPrice.id}`);
    }
  }

  console.log('\n\n=== Add these to .env.local ===\n');
  console.log(envLines.join('\n'));
  console.log('\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
