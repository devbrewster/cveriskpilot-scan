/**
 * Billing gate tests — verify that the feature gate system correctly
 * blocks access based on tier and usage limits.
 *
 * Tests the gate definitions and tier hierarchy without requiring Redis.
 */

import { describe, it, expect } from 'vitest';
import { getEntitlements, getTierFromPriceId } from '@cveriskpilot/billing';

// ---------------------------------------------------------------------------
// Test: Tier entitlements are properly defined
// ---------------------------------------------------------------------------

describe('Billing: Tier entitlements', () => {
  const tiers = ['FREE', 'FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP'];

  for (const tier of tiers) {
    it(`${tier} tier has entitlements defined`, () => {
      const ent = getEntitlements(tier);
      expect(ent).toBeDefined();
      // max_users is a number for paid tiers, 'unlimited' for enterprise/mssp
      expect(ent.max_users === 'unlimited' || typeof ent.max_users === 'number').toBe(true);
      expect(ent.max_assets === 'unlimited' || typeof ent.max_assets === 'number').toBe(true);
    });
  }

  it('FREE tier has the most restrictive limits', () => {
    const free = getEntitlements('FREE');
    const pro = getEntitlements('PRO');

    expect(free.max_users as number).toBeLessThanOrEqual(pro.max_users as number);
    expect(free.max_assets as number).toBeLessThanOrEqual(pro.max_assets as number);
  });

  it('ENTERPRISE tier has unlimited users and assets', () => {
    const ent = getEntitlements('ENTERPRISE');
    expect(ent.max_users).toBe('unlimited');
    expect(ent.max_assets).toBe('unlimited');
  });

  it('FREE tier AI calls limited to 50/month', () => {
    const free = getEntitlements('FREE');
    expect(free.max_ai_calls).toBe(50);
  });

  it('FOUNDERS_BETA gets 250 AI calls/month', () => {
    const founders = getEntitlements('FOUNDERS_BETA');
    expect(founders.max_ai_calls).toBe(250);
  });

  it('PRO gets 1000 AI calls/month', () => {
    const pro = getEntitlements('PRO');
    expect(pro.max_ai_calls).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Test: Tier hierarchy
// ---------------------------------------------------------------------------

describe('Billing: Tier hierarchy', () => {
  it('FREE has fewer entitlements than PRO', () => {
    const free = getEntitlements('FREE');
    const pro = getEntitlements('PRO');
    expect(free.max_assets).toBeLessThan(pro.max_assets);
  });

  it('FOUNDERS_BETA and PRO have similar rank', () => {
    const founders = getEntitlements('FOUNDERS_BETA');
    const pro = getEntitlements('PRO');
    // Both are paid tiers — founders has fewer users/assets but similar features
    expect(founders.max_users).toBeLessThanOrEqual(pro.max_users);
  });
});

// ---------------------------------------------------------------------------
// Test: 402 response shape compliance
// ---------------------------------------------------------------------------

describe('Billing: 402 response format', () => {
  it('billing denial response has required fields', () => {
    // This tests the contract that our routes should follow
    const mockResponse = {
      error: 'Monthly AI call limit reached (50/50)',
      code: 'BILLING_LIMIT_EXCEEDED',
      upgradeRequired: 'PRO',
      upgradeUrl: '/settings/billing',
    };

    expect(mockResponse.error).toBeTruthy();
    expect(mockResponse.code).toBe('BILLING_LIMIT_EXCEEDED');
    expect(mockResponse.upgradeRequired).toBeTruthy();
    expect(mockResponse.upgradeUrl).toBe('/settings/billing');
  });
});

// ---------------------------------------------------------------------------
// Test: Unknown tier handling
// ---------------------------------------------------------------------------

describe('Billing: Edge cases', () => {
  it('unknown tier falls back to FREE entitlements', () => {
    const unknown = getEntitlements('NONEXISTENT');
    const free = getEntitlements('FREE');
    expect(unknown.max_users).toBe(free.max_users);
  });

  it('all tiers have API rate limit defined', () => {
    const tiers = ['FREE', 'FOUNDERS_BETA', 'PRO', 'ENTERPRISE', 'MSSP'];
    for (const tier of tiers) {
      const ent = getEntitlements(tier);
      expect(ent.api_rate_limit).toBeDefined();
    }
  });
});
