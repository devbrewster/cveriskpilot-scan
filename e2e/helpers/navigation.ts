import { type Page, expect } from '@playwright/test';

/**
 * Wait for any loading spinners / skeleton screens to disappear,
 * indicating the page content has fully rendered.
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  // Wait for network to settle
  await page.waitForLoadState('domcontentloaded');

  // Wait for common loading indicators to disappear
  const spinners = page.locator(
    '[data-testid="loading"], [role="progressbar"], .animate-spin, .skeleton',
  );

  // Give spinners a moment to appear, then wait for them to vanish
  await page.waitForTimeout(300);
  if (await spinners.first().isVisible({ timeout: 500 }).catch(() => false)) {
    await spinners.first().waitFor({ state: 'hidden', timeout: 15000 });
  }
}

/** Navigate to the dashboard and wait for it to load. */
export async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await waitForPageLoad(page);
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Navigate to the findings list page. */
export async function goToFindings(page: Page): Promise<void> {
  await page.goto('/findings');
  await waitForPageLoad(page);
  await expect(page).toHaveURL(/\/findings/);
}

/** Navigate to the cases list page. */
export async function goToCases(page: Page): Promise<void> {
  await page.goto('/cases');
  await waitForPageLoad(page);
  await expect(page).toHaveURL(/\/cases/);
}

/** Navigate to the upload page. */
export async function goToUpload(page: Page): Promise<void> {
  await page.goto('/upload');
  await waitForPageLoad(page);
  await expect(page).toHaveURL(/\/upload/);
}

/** Navigate to the reports page. */
export async function goToReports(page: Page): Promise<void> {
  await page.goto('/reports');
  await waitForPageLoad(page);
  await expect(page).toHaveURL(/\/reports/);
}
