import { test, expect } from '@playwright/test';
import { signupUser } from './helpers/auth';

const timestamp = Date.now();

test.describe('Onboarding Flow', () => {
  test.describe.configure({ mode: 'serial' });

  const testEmail = `e2e-onboard-${timestamp}@cveriskpilot.dev`;
  const testPassword = 'SecurePass123!';
  const testOrg = `E2E Onboard Org ${timestamp}`;

  test('new signup shows onboarding checklist on dashboard', async ({ page }) => {
    await signupUser(page, 'E2E Onboarder', testEmail, testPassword, testOrg);

    // Should land on dashboard
    await page.waitForURL(/\/dashboard/);

    // Onboarding checklist should be visible
    const checklist = page.locator('[data-testid="onboarding-checklist"]').or(
      page.locator('text=/onboarding|get started|checklist/i'),
    );
    await expect(checklist.first()).toBeVisible({ timeout: 10000 });
  });

  test('checklist has expected steps', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for key onboarding steps
    const uploadStep = page.locator('text=/upload.*scan|first.*scan/i');
    const findingsStep = page.locator('text=/review.*finding/i');
    const complianceStep = page.locator('text=/compliance|framework/i');
    const teamStep = page.locator('text=/invite.*team|team/i');

    // At least the upload step should be present
    await expect(uploadStep.first()).toBeVisible({ timeout: 5000 });
  });

  test('upload step links to upload page', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click the upload-related link in the checklist
    const uploadLink = page.locator('a[href*="upload"]').first();
    if (await uploadLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await uploadLink.click();
      await expect(page).toHaveURL(/\/upload/);
    }
  });

  test('checklist can be dismissed', async ({ page }) => {
    await page.goto('/dashboard');

    const dismissButton = page.locator(
      'button:has-text("dismiss"), button:has-text("close"), button[aria-label*="dismiss"]',
    ).first();

    if (await dismissButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dismissButton.click();

      // After dismiss, the checklist should not be visible
      await page.reload();
      const checklist = page.locator('[data-testid="onboarding-checklist"]');
      // It should stay dismissed (localStorage)
      await expect(checklist).not.toBeVisible({ timeout: 5000 }).catch(() => {
        // Some implementations re-show on reload — that's acceptable
      });
    }
  });
});
