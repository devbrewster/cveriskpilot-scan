import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/auth';
import { goToUpload, goToDashboard, waitForPageLoad } from './helpers/navigation';
import { createNessusFile, cleanupTestFiles } from './helpers/fixtures';

// Free-tier smoke test user
const FREE_USER_EMAIL = process.env.SMOKE_TEST_EMAIL || 'test@cveriskpilot.dev';
const FREE_USER_PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'TestPass123!';

// Pro-tier test user (set via env for real runs)
const PRO_USER_EMAIL = process.env.PRO_TEST_EMAIL || 'pro-test@cveriskpilot.dev';
const PRO_USER_PASSWORD = process.env.PRO_TEST_PASSWORD || 'ProTest123!';

test.describe('Billing: Upgrade + Limits', () => {
  test.afterAll(() => {
    cleanupTestFiles();
  });

  // -----------------------------------------------------------------------
  // Free tier indicators
  // -----------------------------------------------------------------------

  test('free tier shows upgrade prompts', async ({ page }) => {
    await loginAsUser(page, FREE_USER_EMAIL, FREE_USER_PASSWORD);

    // Navigate to settings/billing or look in sidebar
    await page.goto('/settings/billing');
    await waitForPageLoad(page);

    // Expect "Free" tier badge
    const freeBadge = page
      .getByText(/free\s*(tier|plan)?/i)
      .or(page.locator('[data-testid="tier-badge"]'));
    await expect(freeBadge).toBeVisible({ timeout: 10000 });

    // Expect upgrade CTA
    const upgradeCta = page
      .getByRole('button', { name: /upgrade/i })
      .or(page.getByRole('link', { name: /upgrade/i }))
      .or(page.locator('[data-testid="upgrade-cta"]'));
    await expect(upgradeCta).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Upload limit enforcement
  // -----------------------------------------------------------------------

  test('upload limit enforced on free tier', async ({ page }) => {
    await loginAsUser(page, FREE_USER_EMAIL, FREE_USER_PASSWORD);
    await goToUpload(page);

    const nessusPath = createNessusFile();
    const fileInput = page.locator('input[type="file"]');

    // Attempt to upload beyond the free-tier limit.
    // The exact limit depends on configuration; we try 4 uploads and expect
    // the last one to be blocked.
    for (let i = 0; i < 4; i++) {
      // Check if we hit the limit before uploading
      const limitReached = page.getByText(/limit reached|upload limit|maximum.*uploads/i);
      if (await limitReached.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Limit message appeared -- verify upgrade prompt is shown
        const upgradePrompt = page
          .getByRole('button', { name: /upgrade/i })
          .or(page.getByRole('link', { name: /upgrade/i }))
          .or(page.locator('[data-testid="upgrade-cta"]'));
        await expect(upgradePrompt).toBeVisible();
        return; // Test passes
      }

      await fileInput.setInputFiles(nessusPath);

      // Wait for this upload to process
      await expect(
        page
          .getByText(/complete|success|uploaded|processed|limit reached/i)
          .or(page.locator('[data-testid="upload-complete"]')),
      ).toBeVisible({ timeout: 30000 });

      // If we need to reset the input for the next upload, navigate again
      if (i < 3) {
        await goToUpload(page);
      }
    }

    // After all uploads, verify limit message
    const limitMessage = page.getByText(/limit reached|upload limit|maximum.*uploads/i);
    await expect(limitMessage).toBeVisible({ timeout: 10000 });

    // Upgrade prompt should be visible
    const upgradePrompt = page
      .getByRole('button', { name: /upgrade/i })
      .or(page.getByRole('link', { name: /upgrade/i }))
      .or(page.locator('[data-testid="upgrade-cta"]'));
    await expect(upgradePrompt).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Stripe checkout navigation
  // -----------------------------------------------------------------------

  test('user can navigate to Stripe checkout', async ({ page }) => {
    await loginAsUser(page, FREE_USER_EMAIL, FREE_USER_PASSWORD);

    // Navigate to billing settings
    await page.goto('/settings/billing');
    await waitForPageLoad(page);

    // Click upgrade button
    const upgradeButton = page
      .getByRole('button', { name: /upgrade.*pro|upgrade/i })
      .or(page.getByRole('link', { name: /upgrade.*pro|upgrade/i }))
      .or(page.locator('[data-testid="upgrade-cta"]'));
    await expect(upgradeButton).toBeVisible({ timeout: 10000 });

    // Listen for navigation to Stripe
    const navigationPromise = page.waitForURL(/checkout\.stripe\.com|stripe/, { timeout: 15000 }).catch(() => null);

    await upgradeButton.click();

    // Verify that we either redirect to Stripe or open a new tab with Stripe URL
    const stripeNavigation = await navigationPromise;
    if (stripeNavigation === null) {
      // Stripe may have opened in a new tab -- check popup
      const popup = await page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
      if (popup) {
        const popupUrl = popup.url();
        expect(popupUrl).toMatch(/checkout\.stripe\.com|stripe/);
        await popup.close();
      } else {
        // Check if there's a Stripe-related element on the current page (embedded checkout)
        const stripeElement = page.locator('iframe[src*="stripe"]').or(page.locator('[data-stripe]'));
        await expect(stripeElement).toBeVisible({ timeout: 5000 });
      }
    } else {
      // Successfully navigated to Stripe
      expect(page.url()).toMatch(/checkout\.stripe\.com|stripe/);
    }
  });

  // -----------------------------------------------------------------------
  // Pro features
  // -----------------------------------------------------------------------

  test('pro features unlocked after upgrade', async ({ page }) => {
    await loginAsUser(page, PRO_USER_EMAIL, PRO_USER_PASSWORD);

    // Navigate to billing/settings
    await page.goto('/settings/billing');
    await waitForPageLoad(page);

    // Expect "Pro" badge
    const proBadge = page
      .getByText(/pro\s*(tier|plan)?/i)
      .or(page.locator('[data-testid="tier-badge"]'));
    await expect(proBadge).toBeVisible({ timeout: 10000 });

    // Should not show upload limit warnings
    const limitWarning = page.getByText(/limit reached|upload limit/i);
    await expect(limitWarning).not.toBeVisible();

    // Navigate to upload page -- no limit banners
    await goToUpload(page);
    const uploadLimitBanner = page.getByText(/limit reached|maximum.*uploads/i);
    await expect(uploadLimitBanner).not.toBeVisible();

    // API access should be available
    await page.goto('/settings/api');
    await waitForPageLoad(page);
    const apiSection = page
      .getByText(/api key|api access|api token/i)
      .or(page.locator('[data-testid="api-access"]'));
    await expect(apiSection).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Usage counters
  // -----------------------------------------------------------------------

  test('usage counters displayed correctly', async ({ page }) => {
    await loginAsUser(page, FREE_USER_EMAIL, FREE_USER_PASSWORD);

    await page.goto('/settings/billing');
    await waitForPageLoad(page);

    // Expect usage stats showing uploads used / limit
    const uploadUsage = page
      .getByText(/uploads?\s*:?\s*\d+\s*\/\s*\d+/i)
      .or(page.locator('[data-testid="upload-usage"]'));
    await expect(uploadUsage).toBeVisible({ timeout: 10000 });

    // Expect AI calls usage
    const aiUsage = page
      .getByText(/ai\s*(calls?|requests?)\s*:?\s*\d+\s*\/\s*\d+/i)
      .or(page.locator('[data-testid="ai-usage"]'));
    await expect(aiUsage).toBeVisible({ timeout: 10000 });
  });
});
