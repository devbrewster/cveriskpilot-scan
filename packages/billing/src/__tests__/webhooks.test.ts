import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleWebhookEvent } from '../webhooks';
import type Stripe from 'stripe';

// Minimal mock Prisma client
function createMockPrisma() {
  return {
    organization: {
      update: vi.fn(async () => ({})),
    },
  };
}

function makeEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type,
    data: { object: data },
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;
}

describe('webhooks', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_monthly_test';
    process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_annual_test';
    process.env.STRIPE_PRICE_MSSP_MONTHLY = 'price_mssp_monthly';
    process.env.STRIPE_PRICE_MSSP_METERED = 'price_mssp_metered';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('handleWebhookEvent', () => {
    it('handles checkout.session.completed — upgrades org to PRO', async () => {
      const prisma = createMockPrisma();
      const event = makeEvent('checkout.session.completed', {
        metadata: { organizationId: 'org_123' },
        subscription: 'sub_abc',
        customer: 'cus_xyz',
      });

      await handleWebhookEvent(event, prisma);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_123' },
        data: expect.objectContaining({
          stripeCustomerId: 'cus_xyz',
          stripeSubscriptionId: 'sub_abc',
          tier: 'PRO',
        }),
      });
    });

    it('handles checkout.session.completed — skips when no orgId in metadata', async () => {
      const prisma = createMockPrisma();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const event = makeEvent('checkout.session.completed', {
        metadata: {},
        subscription: 'sub_abc',
        customer: 'cus_xyz',
      });

      await handleWebhookEvent(event, prisma);

      expect(prisma.organization.update).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('handles customer.subscription.updated — syncs tier from price', async () => {
      const prisma = createMockPrisma();
      const event = makeEvent('customer.subscription.updated', {
        metadata: { organizationId: 'org_123' },
        items: {
          data: [{ price: { id: 'price_monthly_test' } }],
        },
      });

      await handleWebhookEvent(event, prisma);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_123' },
        data: expect.objectContaining({
          tier: 'PRO',
          stripeMeteredItemId: null, // no metered item for PRO
        }),
      });
    });

    it('handles customer.subscription.updated — persists metered item ID for MSSP', async () => {
      const prisma = createMockPrisma();
      const event = makeEvent('customer.subscription.updated', {
        metadata: { organizationId: 'org_mssp' },
        items: {
          data: [
            { id: 'si_base', price: { id: 'price_mssp_monthly' } },
            { id: 'si_metered_abc', price: { id: 'price_mssp_metered' } },
          ],
        },
      });

      await handleWebhookEvent(event, prisma);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_mssp' },
        data: expect.objectContaining({
          tier: 'MSSP',
          stripeMeteredItemId: 'si_metered_abc',
        }),
      });
    });

    it('handles customer.subscription.updated — skips unknown price', async () => {
      const prisma = createMockPrisma();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const event = makeEvent('customer.subscription.updated', {
        metadata: { organizationId: 'org_123' },
        items: {
          data: [{ price: { id: 'price_unknown_999' } }],
        },
      });

      await handleWebhookEvent(event, prisma);

      expect(prisma.organization.update).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('handles customer.subscription.deleted — downgrades to FREE', async () => {
      const prisma = createMockPrisma();
      const event = makeEvent('customer.subscription.deleted', {
        metadata: { organizationId: 'org_123' },
      });

      await handleWebhookEvent(event, prisma);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org_123' },
        data: expect.objectContaining({
          tier: 'FREE',
          stripeSubscriptionId: null,
        }),
      });
    });

    it('handles invoice.payment_failed — logs warning', async () => {
      const prisma = createMockPrisma();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const event = makeEvent('invoice.payment_failed', {
        id: 'inv_failed_123',
        customer: 'cus_xyz',
      });

      await handleWebhookEvent(event, prisma);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment failed'),
      );
      // Should NOT update the organization
      expect(prisma.organization.update).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('ignores unhandled event types gracefully', async () => {
      const prisma = createMockPrisma();
      const event = makeEvent('some.unknown.event', {});

      // Should not throw
      await expect(handleWebhookEvent(event, prisma)).resolves.toBeUndefined();
      expect(prisma.organization.update).not.toHaveBeenCalled();
    });
  });
});
