import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TIER_ENTITLEMENTS,
  getEntitlements,
  getTierFromPriceId,
} from '../config.js';

describe('config', () => {
  describe('TIER_ENTITLEMENTS', () => {
    it('has correct FREE entitlements', () => {
      expect(TIER_ENTITLEMENTS.FREE).toEqual({
        max_users: 1,
        max_assets: 50,
        max_monthly_uploads: 3,
        max_ai_calls: 50,
      });
    });

    it('has correct PRO entitlements', () => {
      expect(TIER_ENTITLEMENTS.PRO).toEqual({
        max_users: 10,
        max_assets: 500,
        max_monthly_uploads: 'unlimited',
        max_ai_calls: 500,
      });
    });

    it('has correct ENTERPRISE entitlements', () => {
      expect(TIER_ENTITLEMENTS.ENTERPRISE).toEqual({
        max_users: 50,
        max_assets: 5000,
        max_monthly_uploads: 'unlimited',
        max_ai_calls: 5000,
      });
    });

    it('has correct MSSP entitlements', () => {
      expect(TIER_ENTITLEMENTS.MSSP).toEqual({
        max_users: 200,
        max_assets: 'unlimited',
        max_monthly_uploads: 'unlimited',
        max_ai_calls: 10000,
      });
    });
  });

  describe('getEntitlements', () => {
    it('returns entitlements for a valid tier', () => {
      expect(getEntitlements('PRO')).toEqual(TIER_ENTITLEMENTS.PRO);
    });

    it('is case-insensitive', () => {
      expect(getEntitlements('pro')).toEqual(TIER_ENTITLEMENTS.PRO);
      expect(getEntitlements('Enterprise')).toEqual(TIER_ENTITLEMENTS.ENTERPRISE);
    });

    it('falls back to FREE for unknown tier', () => {
      expect(getEntitlements('UNKNOWN')).toEqual(TIER_ENTITLEMENTS.FREE);
    });
  });

  describe('getTierFromPriceId', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_monthly_123';
      process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_annual_456';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('maps monthly price to PRO', () => {
      expect(getTierFromPriceId('price_monthly_123')).toBe('PRO');
    });

    it('maps annual price to PRO', () => {
      expect(getTierFromPriceId('price_annual_456')).toBe('PRO');
    });

    it('returns null for unknown price ID', () => {
      expect(getTierFromPriceId('price_unknown')).toBeNull();
    });

    it('returns null when env vars are not set', () => {
      delete process.env.STRIPE_PRICE_PRO_MONTHLY;
      delete process.env.STRIPE_PRICE_PRO_ANNUAL;
      expect(getTierFromPriceId('price_monthly_123')).toBeNull();
    });
  });
});
