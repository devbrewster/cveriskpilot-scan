#!/usr/bin/env node
/**
 * Creates a Product Hunt launch promo code in Stripe.
 *
 * - 50% off first 3 months
 * - One-time use per customer (first_time_transaction restriction)
 * - Limited total redemptions (default 100)
 *
 * Usage:
 *   node scripts/stripe-create-promo.mjs
 *   node scripts/stripe-create-promo.mjs --limit 50        # custom redemption cap
 *   node scripts/stripe-create-promo.mjs --code LAUNCH2026  # custom code
 *
 * Requires STRIPE_SECRET_KEY in .env.local
 */

import Stripe from 'stripe';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

// Parse CLI args
const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const CODE = getArg('--code', 'PRODUCTHUNT');
const MAX_REDEMPTIONS = parseInt(getArg('--limit', '100'), 10);

async function main() {
  console.log('=== CVERiskPilot — Stripe Promo Code Setup ===\n');

  // Step 1: Create a coupon — 50% off, repeating for 3 months
  console.log('Creating coupon: 50% off for 3 months...');
  const coupon = await stripe.coupons.create({
    name: 'Product Hunt Launch — 50% Off',
    percent_off: 50,
    duration: 'repeating',
    duration_in_months: 3,
    metadata: {
      campaign: 'product-hunt-launch',
      created_by: 'stripe-create-promo.mjs',
    },
  });
  console.log(`  Coupon created: ${coupon.id}`);
  console.log(`  Discount: ${coupon.percent_off}% off for ${coupon.duration_in_months} months\n`);

  // Step 2: Create a promotion code with restrictions
  console.log(`Creating promotion code: ${CODE}...`);
  const promoCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: CODE,
    max_redemptions: MAX_REDEMPTIONS,
    restrictions: {
      first_time_transaction: true,
    },
    metadata: {
      campaign: 'product-hunt-launch',
      created_by: 'stripe-create-promo.mjs',
    },
  });
  console.log(`  Promotion code created: ${promoCode.id}`);
  console.log(`  Code: ${promoCode.code}`);
  console.log(`  Max redemptions: ${promoCode.max_redemptions}`);
  console.log(`  First-time customers only: ${promoCode.restrictions.first_time_transaction}`);
  console.log(`  Active: ${promoCode.active}\n`);

  console.log('=== Summary ===\n');
  console.log(`  Promo code:    ${CODE}`);
  console.log(`  Discount:      50% off first 3 months`);
  console.log(`  Restriction:   New customers only (first-time transaction)`);
  console.log(`  Claim limit:   ${MAX_REDEMPTIONS} total redemptions`);
  console.log(`  Coupon ID:     ${coupon.id}`);
  console.log(`  Promo ID:      ${promoCode.id}`);
  console.log('');
  console.log('  Customers will see "Add promotion code" at Stripe Checkout.');
  console.log(`  allow_promotion_codes: true is already set in checkout.ts.`);
  console.log('');
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.message.includes('STRIPE_SECRET_KEY')) {
    console.error('\nMake sure STRIPE_SECRET_KEY is set in .env.local');
  }
  process.exit(1);
});
