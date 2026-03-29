/**
 * Signup → Stripe payment flow stress test
 * Tests 100 signups across all plan types to verify Stripe redirect works.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: any) => cb({
      organization: {
        create: vi.fn(async () => ({ id: 'org-test', slug: 'test' })),
        findUnique: vi.fn(async () => null),
      },
      user: {
        create: vi.fn(async () => ({ id: 'usr-test' })),
      },
    })),
    organization: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock('@cveriskpilot/auth', () => ({
  createOrganization: vi.fn(async () => ({
    organizationId: 'org-test',
    userId: 'usr-test',
    slug: 'test',
  })),
  validatePassword: vi.fn(() => ({ valid: true, errors: [] })),
  validateEmail: vi.fn(() => true),
  createSession: vi.fn(async () => 'session-test'),
  setSessionCookie: vi.fn(),
  getSignupLimiter: vi.fn(() => ({
    check: vi.fn(async () => ({ allowed: true })),
  })),
}));

vi.mock('@cveriskpilot/domain', () => ({
  UserRole: { ORG_OWNER: 'ORG_OWNER' },
}));

const checkoutSpy = vi.fn(async (params: any) => ({
  url: `https://checkout.stripe.com/pay/${params.priceId}`,
}));
const setupSpy = vi.fn(async () => ({
  url: 'https://checkout.stripe.com/setup/test',
}));

vi.mock('@cveriskpilot/billing', () => ({
  STRIPE_PRICES: {
    FOUNDERS_BETA_MONTHLY: () => process.env.STRIPE_PRICE_FOUNDERS_BETA_MONTHLY || '',
    FOUNDERS_BETA_ANNUAL: () => process.env.STRIPE_PRICE_FOUNDERS_BETA_ANNUAL || '',
    PRO_MONTHLY: () => process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    PRO_ANNUAL: () => process.env.STRIPE_PRICE_PRO_ANNUAL || '',
    ENTERPRISE_MONTHLY: () => process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    ENTERPRISE_ANNUAL: () => process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || '',
    MSSP_MONTHLY: () => process.env.STRIPE_PRICE_MSSP_MONTHLY || '',
    MSSP_ANNUAL: () => process.env.STRIPE_PRICE_MSSP_ANNUAL || '',
    MSSP_METERED: () => process.env.STRIPE_PRICE_MSSP_METERED || '',
  },
  createCheckoutSession: (...args: any[]) => checkoutSpy(...args),
  createSetupCheckoutSession: (...args: any[]) => setupSpy(...args),
}));

import { POST } from '../apps/web/app/api/auth/signup/route';

function makeReq(body: Record<string, string | undefined>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const baseBody = {
  name: 'Test User',
  password: 'SecureP@ss123!',
  orgName: 'Test Org',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Signup → Stripe payment flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_FOUNDERS_BETA_MONTHLY = 'price_founders_monthly';
    process.env.STRIPE_PRICE_FOUNDERS_BETA_ANNUAL = 'price_founders_annual';
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_pro_monthly';
    process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_pro_annual';
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = 'price_enterprise_monthly';
    process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL = 'price_enterprise_annual';
    process.env.STRIPE_PRICE_MSSP_MONTHLY = 'price_mssp_monthly';
    process.env.STRIPE_PRICE_MSSP_ANNUAL = 'price_mssp_annual';
  });

  // ---- Per-plan Stripe redirect ----

  it('free plan → Stripe setup session', async () => {
    const res = await POST(makeReq({ ...baseBody, email: 'free@test.com', plan: 'free' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toContain('stripe.com');
    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(checkoutSpy).not.toHaveBeenCalled();
  });

  it('founders_beta → Stripe subscription checkout', async () => {
    const res = await POST(makeReq({ ...baseBody, email: 'fb@test.com', plan: 'founders_beta' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toContain('stripe.com');
    expect(checkoutSpy).toHaveBeenCalledWith(expect.objectContaining({ priceId: 'price_founders_monthly' }));
  });

  it('pro → Stripe subscription checkout', async () => {
    const res = await POST(makeReq({ ...baseBody, email: 'pro@test.com', plan: 'pro' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toContain('stripe.com');
    expect(checkoutSpy).toHaveBeenCalledWith(expect.objectContaining({ priceId: 'price_pro_monthly' }));
  });

  it('enterprise → Stripe subscription checkout', async () => {
    const res = await POST(makeReq({ ...baseBody, email: 'ent@test.com', plan: 'enterprise' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toContain('stripe.com');
    expect(checkoutSpy).toHaveBeenCalledWith(expect.objectContaining({ priceId: 'price_enterprise_monthly' }));
  });

  it('mssp → Stripe subscription checkout', async () => {
    const res = await POST(makeReq({ ...baseBody, email: 'mssp@test.com', plan: 'mssp' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toContain('stripe.com');
    expect(checkoutSpy).toHaveBeenCalledWith(expect.objectContaining({ priceId: 'price_mssp_monthly' }));
  });

  it('no plan → Stripe setup session (free default)', async () => {
    const res = await POST(makeReq({ ...baseBody, email: 'noplan@test.com' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toBeDefined();
    expect(setupSpy).toHaveBeenCalledTimes(1);
  });

  // ---- Missing price env var → 503 error (fixed) ----

  it('founders_beta with missing price → 503 error', async () => {
    delete process.env.STRIPE_PRICE_FOUNDERS_BETA_MONTHLY;
    const res = await POST(makeReq({ ...baseBody, email: 'noprice@test.com', plan: 'founders_beta' }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('Payment configuration unavailable');
  });

  it('pro with missing price → 503 error', async () => {
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
    const res = await POST(makeReq({ ...baseBody, email: 'noprice2@test.com', plan: 'pro' }));
    expect(res.status).toBe(503);
  });

  // ---- Stripe error → 500 error (no longer swallowed) ----

  it('Stripe checkout error → 500 (not silent free account)', async () => {
    checkoutSpy.mockRejectedValueOnce(new Error('Stripe API error'));
    const res = await POST(makeReq({ ...baseBody, email: 'stripeerr@test.com', plan: 'pro' }));
    expect(res.status).toBe(500);
  });

  it('Stripe setup error → 500 (not silent skip)', async () => {
    setupSpy.mockRejectedValueOnce(new Error('Stripe API error'));
    const res = await POST(makeReq({ ...baseBody, email: 'setuperr@test.com', plan: 'free' }));
    expect(res.status).toBe(500);
  });

  // ---- Unknown plan → falls to free setup session ----

  it('unknown plan "government" → free setup session', async () => {
    const res = await POST(makeReq({ ...baseBody, email: 'gov@test.com', plan: 'government' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toBeDefined();
    expect(setupSpy).toHaveBeenCalledTimes(1);
  });

  // ---- Case sensitivity ----

  it.each(['Pro', 'PRO', 'pro'])('plan="%s" all work', async (plan) => {
    const res = await POST(makeReq({ ...baseBody, email: `case-${plan}@test.com`, plan }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toBeDefined();
    expect(checkoutSpy).toHaveBeenCalled();
  });

  it.each(['Founders_Beta', 'FOUNDERS_BETA', 'founders_beta'])('plan="%s" all work', async (plan) => {
    const res = await POST(makeReq({ ...baseBody, email: `case-${plan}@test.com`, plan }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.checkoutUrl).toBeDefined();
    expect(checkoutSpy).toHaveBeenCalled();
  });

  // ---- Stress test: 100 concurrent signups ----

  it('100 concurrent signups all return checkoutUrl', async () => {
    const plans = [
      ...Array(20).fill('free'),
      ...Array(25).fill('founders_beta'),
      ...Array(30).fill('pro'),
      ...Array(15).fill('enterprise'),
      ...Array(10).fill('mssp'),
    ];

    const results = await Promise.all(
      plans.map(async (plan, i) => {
        const res = await POST(makeReq({
          ...baseBody,
          email: `stress-${i}@test.com`,
          orgName: `Stress Org ${i}`,
          plan,
        }));
        const data = await res.json();
        return { i, plan, status: res.status, hasUrl: !!data.checkoutUrl };
      }),
    );

    const byPlan: Record<string, { total: number; ok: number; missing: number }> = {};
    for (const r of results) {
      byPlan[r.plan] ??= { total: 0, ok: 0, missing: 0 };
      byPlan[r.plan].total++;
      if (r.hasUrl) byPlan[r.plan].ok++;
      else byPlan[r.plan].missing++;
    }

    console.log('\n=== 100-Signup Stress Results ===');
    for (const [plan, stats] of Object.entries(byPlan)) {
      console.log(`  ${plan.padEnd(20)} ${stats.ok}/${stats.total} with checkoutUrl  (${stats.missing} missing)`);
    }

    expect(results.filter((r) => !r.hasUrl)).toHaveLength(0);
    expect(results.filter((r) => r.status !== 201)).toHaveLength(0);
  });
});
