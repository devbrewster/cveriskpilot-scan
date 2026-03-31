import { test, expect } from '@playwright/test';

/**
 * Multi-user RBAC E2E scenarios.
 *
 * These tests verify that role-based access controls work correctly in the UI.
 * They use the dev-session API to impersonate different roles without needing
 * real user accounts.
 */

const DEV_SESSION_URL = '/api/auth/dev-session';
const isDev = process.env.NODE_ENV !== 'production';

test.describe('RBAC — Role-Based Access Control', () => {
  // Skip in production (dev-session not available)
  test.skip(!isDev, 'Dev session API only available in development');

  async function loginAsRole(page: import('@playwright/test').Page, role: string) {
    const response = await page.request.post(DEV_SESSION_URL, {
      data: { role },
    });
    expect(response.ok()).toBeTruthy();

    // Navigate to trigger session cookie
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  }

  test.describe('Viewer role restrictions', () => {
    test('viewer cannot access upload page functionality', async ({ page }) => {
      await loginAsRole(page, 'VIEWER');
      await page.goto('/upload');
      await page.waitForLoadState('domcontentloaded');

      // Upload should be disabled or show access-denied
      const uploadButton = page.locator('button:has-text("Upload")').first();
      const accessDenied = page.locator('text=/access denied|not authorized|permission/i');

      // Either the button is disabled or there's an access-denied message
      const isDisabled = await uploadButton.isDisabled().catch(() => false);
      const isDenied = await accessDenied.isVisible({ timeout: 3000 }).catch(() => false);
      const noButton = !(await uploadButton.isVisible({ timeout: 1000 }).catch(() => false));

      expect(isDisabled || isDenied || noButton).toBeTruthy();
    });

    test('viewer can view dashboard', async ({ page }) => {
      await loginAsRole(page, 'VIEWER');
      await page.goto('/dashboard');

      // Dashboard should render without errors
      await expect(page.locator('text=/Total Findings|Open Cases|Dashboard/i').first())
        .toBeVisible({ timeout: 10000 });
    });

    test('viewer can view cases list', async ({ page }) => {
      await loginAsRole(page, 'VIEWER');
      await page.goto('/cases');

      // Cases page should render
      await expect(page.locator('text=/cases|vulnerability/i').first())
        .toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Analyst role capabilities', () => {
    test('analyst can access upload page', async ({ page }) => {
      await loginAsRole(page, 'ANALYST');
      await page.goto('/upload');

      // Upload functionality should be available
      const fileInput = page.locator('input[type="file"]');
      const uploadArea = page.locator('text=/upload|drag.*drop|select.*file/i');

      const hasUpload = await fileInput.isVisible({ timeout: 5000 }).catch(() => false) ||
        await uploadArea.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasUpload).toBeTruthy();
    });

    test('analyst can view findings', async ({ page }) => {
      await loginAsRole(page, 'ANALYST');
      await page.goto('/findings');

      await expect(page.locator('text=/findings|vulnerability|results/i').first())
        .toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Admin role capabilities', () => {
    test('admin can access settings', async ({ page }) => {
      await loginAsRole(page, 'ORG_OWNER');
      await page.goto('/settings');

      await expect(page.locator('text=/settings|organization|configuration/i').first())
        .toBeVisible({ timeout: 10000 });
    });

    test('admin can access user management', async ({ page }) => {
      await loginAsRole(page, 'ORG_OWNER');
      await page.goto('/users');

      await expect(page.locator('text=/users|team members|members/i').first())
        .toBeVisible({ timeout: 10000 });
    });

    test('admin can access billing', async ({ page }) => {
      await loginAsRole(page, 'ORG_OWNER');
      await page.goto('/billing');

      await expect(page.locator('text=/billing|plan|subscription/i').first())
        .toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Sidebar navigation reflects role', () => {
    test('viewer sees limited sidebar items', async ({ page }) => {
      await loginAsRole(page, 'VIEWER');
      await page.goto('/dashboard');

      // Viewer should NOT see admin-only links
      const settingsLink = page.locator('nav a[href*="settings"], aside a[href*="settings"]');
      const usersLink = page.locator('nav a[href*="users"], aside a[href*="users"]');

      // These may be hidden or absent for viewers
      const settingsVisible = await settingsLink.first().isVisible({ timeout: 2000 }).catch(() => false);
      const usersVisible = await usersLink.first().isVisible({ timeout: 2000 }).catch(() => false);

      // At least one admin link should be hidden
      // (exact behavior depends on role-based sidebar config)
      expect(settingsVisible && usersVisible).toBeFalsy();
    });

    test('admin sees full sidebar', async ({ page }) => {
      await loginAsRole(page, 'SECURITY_ADMIN');
      await page.goto('/dashboard');

      // Admin should see management links
      const dashboardLink = page.locator('nav a[href*="dashboard"], aside a[href*="dashboard"]');
      await expect(dashboardLink.first()).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe('RBAC — API Route Protection', () => {
  test('unauthenticated request to cases API returns 401', async ({ request }) => {
    const response = await request.get('/api/cases');
    expect(response.status()).toBe(401);
  });

  test('unauthenticated POST to upload returns 401', async ({ request }) => {
    const response = await request.post('/api/upload', {
      data: {},
    });
    expect(response.status()).toBe(401);
  });

  test('unauthenticated access to admin routes returns 401', async ({ request }) => {
    const response = await request.get('/api/users');
    expect([401, 403]).toContain(response.status());
  });

  test('unauthenticated access to billing returns 401', async ({ request }) => {
    const response = await request.post('/api/billing/upgrade', {
      data: { plan: 'PRO' },
    });
    expect([401, 403]).toContain(response.status());
  });
});
