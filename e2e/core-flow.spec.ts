import { test, expect } from '@playwright/test';
import { loginAsUser, signupUser, logout } from './helpers/auth';
import { goToDashboard, goToFindings, goToCases, goToUpload, goToReports, waitForPageLoad } from './helpers/navigation';
import { createNessusFile, cleanupTestFiles } from './helpers/fixtures';

// Use unique email per test run to avoid conflicts
const TEST_RUN_ID = Date.now();
const SIGNUP_NAME = 'E2E Test User';
const SIGNUP_EMAIL = `e2e-${TEST_RUN_ID}@cveriskpilot.dev`;
const SIGNUP_PASSWORD = 'E2eTest!2026secure';
const SIGNUP_ORG = `TestOrg-${TEST_RUN_ID}`;

// Existing smoke-test user for login tests
const LOGIN_EMAIL = process.env.SMOKE_TEST_EMAIL || 'test@cveriskpilot.dev';
const LOGIN_PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'TestPass123!';

test.describe('Core Flow: Signup > Upload > Triage > Export', () => {
  test.afterAll(() => {
    cleanupTestFiles();
  });

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  test('user can sign up and create organization', async ({ page }) => {
    await signupUser(page, SIGNUP_NAME, SIGNUP_EMAIL, SIGNUP_PASSWORD, SIGNUP_ORG);

    // Should land on dashboard or onboarding
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

    // Organization name should be visible somewhere in the layout
    await expect(page.getByText(SIGNUP_ORG)).toBeVisible({ timeout: 10000 });
  });

  test('user can sign in with email/password', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard|$)/);

    // Dashboard heading or content should be present
    await expect(
      page.getByRole('heading', { name: /dashboard/i }).or(page.locator('[data-testid="dashboard"]')),
    ).toBeVisible({ timeout: 10000 });
  });

  test('user can log out and return to login page', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await logout(page);

    await expect(page).toHaveURL(/\/(login|$)/);
  });

  // -----------------------------------------------------------------------
  // Dashboard empty state
  // -----------------------------------------------------------------------

  test('dashboard shows empty state initially', async ({ page }) => {
    // Use the freshly signed-up user who has no data
    await loginAsUser(page, SIGNUP_EMAIL, SIGNUP_PASSWORD);
    await goToDashboard(page);

    // Expect an empty state indicator
    const emptyIndicator = page
      .getByText(/no findings|no scans|no data|get started|upload your first/i)
      .or(page.locator('[data-testid="empty-state"]'));

    await expect(emptyIndicator).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Upload
  // -----------------------------------------------------------------------

  test('user can upload a scan file', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToUpload(page);

    // Create a test .nessus file
    const nessusPath = createNessusFile();

    // Locate the file input (may be hidden behind a drop zone)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(nessusPath);

    // Wait for upload progress / completion
    await expect(
      page.getByText(/complete|success|uploaded|processed/i).or(
        page.locator('[data-testid="upload-complete"]'),
      ),
    ).toBeVisible({ timeout: 30000 });

    // Expect findings count to be shown
    const findingsCount = page.getByText(/\d+ finding/i).or(
      page.locator('[data-testid="findings-count"]'),
    );
    await expect(findingsCount).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Findings
  // -----------------------------------------------------------------------

  test('findings list populates after upload', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToFindings(page);

    // Expect at least one table row with finding data
    const rows = page.locator('table tbody tr, [data-testid="finding-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    // Severity badges should be present
    const severityBadge = page.getByText(/critical|high|medium|low|info/i).first();
    await expect(severityBadge).toBeVisible();
  });

  test('user can filter findings by severity', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToFindings(page);

    // Wait for findings to load
    const rows = page.locator('table tbody tr, [data-testid="finding-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const initialCount = await rows.count();

    // Click CRITICAL severity filter
    const criticalFilter = page
      .getByRole('button', { name: /critical/i })
      .or(page.locator('[data-testid="filter-critical"]'))
      .or(page.getByLabel(/critical/i));
    await criticalFilter.click();
    await waitForPageLoad(page);

    // Should show only critical findings (fewer or equal rows)
    const filteredRows = page.locator('table tbody tr, [data-testid="finding-row"]');
    const filteredCount = await filteredRows.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Each visible row should have critical severity
    if (filteredCount > 0) {
      for (let i = 0; i < filteredCount; i++) {
        await expect(filteredRows.nth(i).getByText(/critical/i)).toBeVisible();
      }
    }

    // Clear filter
    const clearFilter = page
      .getByRole('button', { name: /clear|all|reset/i })
      .or(page.locator('[data-testid="clear-filters"]'));
    await clearFilter.click();
    await waitForPageLoad(page);

    // All findings should be back
    const resetRows = page.locator('table tbody tr, [data-testid="finding-row"]');
    await expect(resetRows.first()).toBeVisible({ timeout: 10000 });
    const resetCount = await resetRows.count();
    expect(resetCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('user can view finding detail', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToFindings(page);

    // Wait for rows to load and click the first one
    const firstRow = page.locator('table tbody tr, [data-testid="finding-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await firstRow.click();

    // Should navigate to a finding detail page
    await expect(page).toHaveURL(/\/findings\/[a-zA-Z0-9-]+/);
    await waitForPageLoad(page);

    // Expect CVSS score to be displayed
    const cvssScore = page.getByText(/cvss|score/i).or(page.locator('[data-testid="cvss-score"]'));
    await expect(cvssScore).toBeVisible({ timeout: 10000 });

    // Expect asset information
    const assetInfo = page
      .getByText(/asset|host|ip address|192\.\d+/i)
      .or(page.locator('[data-testid="asset-info"]'));
    await expect(assetInfo).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Triage
  // -----------------------------------------------------------------------

  test('user can triage a vulnerability case', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToCases(page);

    // Wait for cases to load and click the first one
    const firstCase = page.locator('table tbody tr, [data-testid="case-row"]').first();
    await expect(firstCase).toBeVisible({ timeout: 15000 });
    await firstCase.click();

    // Should navigate to case detail
    await expect(page).toHaveURL(/\/cases\/[a-zA-Z0-9-]+/);
    await waitForPageLoad(page);

    // Click the Triage button
    const triageButton = page
      .getByRole('button', { name: /triage/i })
      .or(page.locator('[data-testid="triage-button"]'));
    await expect(triageButton).toBeVisible({ timeout: 10000 });
    await triageButton.click();

    // Confirm in dialog if one appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes|ok/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Expect status to update to TRIAGE or IN_TRIAGE
    const triageStatus = page
      .getByText(/triage|in.triage/i)
      .or(page.locator('[data-testid="case-status"]'));
    await expect(triageStatus).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Bulk actions
  // -----------------------------------------------------------------------

  test('user can bulk update findings status', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToFindings(page);

    // Wait for findings to load
    const rows = page.locator('table tbody tr, [data-testid="finding-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    // Select first 3 findings via checkboxes
    const checkboxes = page.locator(
      'table tbody tr input[type="checkbox"], [data-testid="finding-row"] input[type="checkbox"]',
    );
    const selectCount = Math.min(3, await checkboxes.count());
    for (let i = 0; i < selectCount; i++) {
      await checkboxes.nth(i).check();
    }

    // Bulk action bar should appear
    const bulkBar = page
      .locator('[data-testid="bulk-action-bar"]')
      .or(page.getByText(/\d+ selected/i));
    await expect(bulkBar).toBeVisible({ timeout: 5000 });

    // Open status dropdown and set to IN_REMEDIATION
    const statusAction = page
      .getByRole('button', { name: /status|change status|update/i })
      .or(page.locator('[data-testid="bulk-status-action"]'));
    await statusAction.click();

    const remediationOption = page
      .getByRole('option', { name: /in.remediation/i })
      .or(page.getByRole('menuitem', { name: /in.remediation/i }))
      .or(page.getByText(/in.remediation/i));
    await remediationOption.click();

    // Confirm bulk action if dialog appears
    const confirmBulk = page.getByRole('button', { name: /confirm|apply|yes/i });
    if (await confirmBulk.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBulk.click();
    }

    await waitForPageLoad(page);

    // Expect status badges to reflect new status
    const remediationBadges = page.getByText(/in.remediation/i);
    await expect(remediationBadges.first()).toBeVisible({ timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  test('user can export findings as CSV', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToFindings(page);
    await waitForPageLoad(page);

    // Start waiting for the download before triggering it
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Click export button
    const exportButton = page
      .getByRole('button', { name: /export/i })
      .or(page.locator('[data-testid="export-button"]'));
    await expect(exportButton).toBeVisible({ timeout: 10000 });
    await exportButton.click();

    // Select CSV format if a dropdown appears
    const csvOption = page
      .getByRole('menuitem', { name: /csv/i })
      .or(page.getByText(/export.*csv|csv.*export/i));
    if (await csvOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await csvOption.click();
    }

    // Verify download was triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('user can generate executive report', async ({ page }) => {
    await loginAsUser(page, LOGIN_EMAIL, LOGIN_PASSWORD);
    await goToReports(page);

    // Click executive summary report
    const execReport = page
      .getByRole('button', { name: /executive.*summary|generate.*report/i })
      .or(page.getByText(/executive summary/i))
      .or(page.locator('[data-testid="exec-report"]'));
    await expect(execReport).toBeVisible({ timeout: 10000 });
    await execReport.click();

    await waitForPageLoad(page);

    // Configure report options if a form appears
    const previewButton = page
      .getByRole('button', { name: /preview|generate/i })
      .or(page.locator('[data-testid="preview-report"]'));
    if (await previewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await previewButton.click();
    }

    // Expect report content to appear (in same tab or new window)
    const reportContent = page
      .getByText(/executive summary|risk overview|vulnerability summary/i)
      .or(page.locator('[data-testid="report-content"]'));
    await expect(reportContent).toBeVisible({ timeout: 15000 });
  });
});
