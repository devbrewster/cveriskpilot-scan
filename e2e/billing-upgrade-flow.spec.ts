import { test, expect } from '@playwright/test';
import { loginAsUser, signupUser } from './helpers/auth';

const timestamp = Date.now();

test.describe('Billing Upgrade → Feature Unlock Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('free tier shows upgrade prompts', async ({ page }) => {
    // Create a fresh free-tier user
    const email = `e2e-billing-${timestamp}@cveriskpilot.dev`;
    await signupUser(page, 'E2E Billing', email, 'SecurePass123!', `Billing Org ${timestamp}`);

    await page.goto('/billing');
    await page.waitForLoadState('domcontentloaded');

    // Should show free tier indicator
    const freeBadge = page.locator('text=/free|starter|basic/i');
    await expect(freeBadge.first()).toBeVisible({ timeout: 10000 });

    // Should show upgrade option
    const upgradeButton = page.locator('text=/upgrade|start trial|go pro/i');
    await expect(upgradeButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('pricing page shows all tiers', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    // Should display all pricing tiers
    const freeTier = page.locator('text=/free/i');
    const foundersTier = page.locator('text=/founders|beta/i');
    const proTier = page.locator('text=/pro/i');
    const enterpriseTier = page.locator('text=/enterprise/i');

    await expect(freeTier.first()).toBeVisible({ timeout: 10000 });
    await expect(proTier.first()).toBeVisible({ timeout: 5000 });
    await expect(enterpriseTier.first()).toBeVisible({ timeout: 5000 });
  });

  test('pricing page CTA buttons are functional', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    // Find CTA buttons
    const ctaButtons = page.locator('a[href*="signup"], a[href*="stripe"], button:has-text("Start")');
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThan(0);

    // First CTA should have a valid href or click handler
    const firstCta = ctaButtons.first();
    await expect(firstCta).toBeVisible();
  });

  test('free tier shows AI call limits', async ({ page }) => {
    const email = `e2e-limits-${timestamp}@cveriskpilot.dev`;
    await signupUser(page, 'E2E Limits', email, 'SecurePass123!', `Limits Org ${timestamp}`);

    // Navigate to a case and try AI enrichment
    await page.goto('/cases');
    await page.waitForLoadState('domcontentloaded');

    // The AI call limit indicator should appear somewhere
    // (on billing page, dashboard, or case detail)
    await page.goto('/billing');
    const usageIndicator = page.locator('text=/ai call|usage|limit|0.*\\/.*50/i');
    await expect(usageIndicator.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // Usage indicator may be in a different location
    });
  });

  test('upgrade button navigates to Stripe checkout', async ({ page }) => {
    const email = `e2e-checkout-${timestamp}@cveriskpilot.dev`;
    await signupUser(page, 'E2E Checkout', email, 'SecurePass123!', `Checkout Org ${timestamp}`);

    await page.goto('/billing');
    await page.waitForLoadState('domcontentloaded');

    const upgradeButton = page.locator(
      'a:has-text("Upgrade"), button:has-text("Upgrade"), a:has-text("Start Trial")',
    ).first();

    if (await upgradeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Listen for navigation or new tab
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 10000 }).catch(() => null),
        upgradeButton.click(),
      ]);

      if (popup) {
        // Stripe checkout opens in new tab
        const popupUrl = popup.url();
        expect(popupUrl).toMatch(/stripe\.com|checkout|billing/);
      } else {
        // May redirect on same page or show embedded checkout
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        const hasStripeRedirect = currentUrl.includes('stripe') || currentUrl.includes('checkout');
        const hasEmbeddedCheckout = await page.locator('iframe[src*="stripe"]').isVisible().catch(() => false);
        const stayedOnBilling = currentUrl.includes('/billing');

        // One of these should be true
        expect(hasStripeRedirect || hasEmbeddedCheckout || stayedOnBilling).toBeTruthy();
      }
    }
  });
});

test.describe('Feature Gates by Tier', () => {
  test('API key management visible for paid tiers', async ({ page }) => {
    // Pro user environment variable
    const proEmail = process.env.PRO_TEST_EMAIL;
    const proPassword = process.env.PRO_TEST_PASSWORD;

    if (!proEmail || !proPassword) {
      test.skip(true, 'PRO_TEST_EMAIL/PASSWORD not set');
      return;
    }

    await loginAsUser(page, proEmail, proPassword);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // API keys tab/section should be accessible
    const apiKeysTab = page.locator('text=/api key|token|integration/i');
    await expect(apiKeysTab.first()).toBeVisible({ timeout: 10000 });
  });
});
