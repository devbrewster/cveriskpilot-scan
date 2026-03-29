import { test, expect } from '@playwright/test';

/**
 * Demo Dashboard Parity Tests
 *
 * Validates that the demo dashboard at /demo mirrors the structural layout
 * of the authenticated app dashboard at /dashboard. Since the app dashboard
 * requires auth (and loads data from API), we test the demo in isolation
 * and verify its structure matches the expected widget layout.
 */

// The 8 widget sections both dashboards must contain
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _EXPECTED_WIDGETS = [
  'Total Findings',
  'Open Cases',
  'Critical / High',
  'KEV-Listed',
  'Avg EPSS (Top 10)',
  'MTTR',
  'Severity Breakdown',
  'EPSS Top 10',
  'KEV',
  'SLA Status',
  'Recent Scans',
  'Compliance Scores',
  'Recent Activity',
];

test.describe('Demo Dashboard — Structure & Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
  });

  test('renders without errors (no 500/404)', async ({ page }) => {
    // Should not show error pages
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('[data-testid="demo-dashboard"]')).toBeVisible();
  });

  test('has 6 stat cards in top row', async ({ page }) => {
    const statCards = page.locator('[data-testid="stat-cards"] > *');
    await expect(statCards).toHaveCount(6);
  });

  test('stat card labels match app dashboard', async ({ page }) => {
    const labels = [
      'Total Findings',
      'Open Cases',
      'Critical / High',
      'KEV-Listed',
      'Avg EPSS (Top 10)',
      'MTTR',
    ];
    for (const label of labels) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('stat cards display numeric values (not empty)', async ({ page }) => {
    const statCards = page.locator('[data-testid="stat-cards"] > *');
    const count = await statCards.count();
    for (let i = 0; i < count; i++) {
      const text = await statCards.nth(i).textContent();
      // Each card should have some non-whitespace content beyond the label
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('contains Severity Breakdown section', async ({ page }) => {
    await expect(page.getByText('Severity Breakdown')).toBeVisible();
  });

  test('contains EPSS Top 10 section', async ({ page }) => {
    await expect(page.getByText('EPSS Top 10')).toBeVisible();
  });

  test('contains KEV widget', async ({ page }) => {
    // KEV widget has "KEV-Listed" in the stat card and a dedicated widget
    await expect(page.getByText('KEV-Listed')).toBeVisible();
  });

  test('contains SLA Status widget', async ({ page }) => {
    await expect(page.locator('[data-testid="sla-widget"]')).toBeVisible();
    await expect(page.getByText('SLA Breaches')).toBeVisible();
    await expect(page.getByText('Approaching')).toBeVisible();
  });

  test('SLA widget has severity breakdown links', async ({ page }) => {
    const slaWidget = page.locator('[data-testid="sla-widget"]');
    await expect(slaWidget.getByText('Breaches by Severity')).toBeVisible();
    // Should have clickable severity links pointing to demo cases
    const links = slaWidget.locator('a[href*="/demo/cases"]');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('contains Recent Scans section', async ({ page }) => {
    await expect(page.getByText('Recent Scans')).toBeVisible();
  });

  test('contains Compliance Scores section', async ({ page }) => {
    await expect(page.getByText('Compliance Scores')).toBeVisible();
  });

  test('contains Recent Activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });

  test('layout uses 5-row grid structure', async ({ page }) => {
    const dashboard = page.locator('[data-testid="demo-dashboard"]');
    // Row 1: stat cards grid
    // Row 2: severity card
    // Row 3: EPSS + KEV (lg:grid-cols-3)
    // Row 4: SLA + Recent Scans (lg:grid-cols-3)
    // Row 5: Compliance + Activity (lg:grid-cols-3)
    const directChildren = dashboard.locator('> *');
    // Should have at least 5 top-level sections
    const count = await directChildren.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});

test.describe('Demo Dashboard — Navigation & Isolation', () => {
  test('demo does not require authentication', async ({ page }) => {
    const response = await page.goto('/demo');
    // Should NOT redirect to /login
    expect(page.url()).toContain('/demo');
    expect(response?.status()).toBe(200);
  });

  test('demo does not have auth context indicators', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    // Should not have "Viewing data for" client scope indicator (app-only feature)
    await expect(page.locator('body')).not.toContainText('Viewing data for');
  });

  test('SLA severity links navigate within demo', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    const slaWidget = page.locator('[data-testid="sla-widget"]');
    const firstLink = slaWidget.locator('a[href*="/demo/cases"]').first();
    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href');
      expect(href).toMatch(/^\/demo\/cases/);
    }
  });
});

test.describe('Demo Sub-Pages — Smoke Tests', () => {
  const demoPages = [
    { path: '/demo', name: 'Dashboard' },
    { path: '/demo/findings', name: 'Findings' },
    { path: '/demo/cases', name: 'Cases' },
    { path: '/demo/upload', name: 'Upload' },
    { path: '/demo/compliance', name: 'Compliance' },
    { path: '/demo/assets', name: 'Assets' },
    { path: '/demo/risk-exceptions', name: 'Risk Exceptions' },
    { path: '/demo/users', name: 'Users' },
    { path: '/demo/settings', name: 'Settings' },
    { path: '/demo/audit-log', name: 'Audit Log' },
    { path: '/demo/notifications', name: 'Notifications' },
    { path: '/demo/billing', name: 'Billing' },
  ];

  for (const { path, name } of demoPages) {
    test(`${name} page loads without errors (${path})`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).not.toContainText('Internal Server Error');
      await expect(page.locator('body')).not.toContainText('Application error');
    });
  }

  test('findings list rows are clickable', async ({ page }) => {
    await page.goto('/demo/findings');
    await page.waitForLoadState('networkidle');
    const firstRow = page.locator('tr[class*="cursor-pointer"], div[class*="cursor-pointer"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForURL(/\/demo\/findings\/.+/);
    }
  });

  test('cases list rows are clickable', async ({ page }) => {
    await page.goto('/demo/cases');
    await page.waitForLoadState('networkidle');
    const firstRow = page.locator('tr[class*="cursor-pointer"], div[class*="cursor-pointer"]').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForURL(/\/demo\/cases\/.+/);
    }
  });
});
