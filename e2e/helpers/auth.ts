import { type Page, expect } from '@playwright/test';

const DEFAULT_EMAIL = process.env.SMOKE_TEST_EMAIL || 'test@cveriskpilot.dev';
const DEFAULT_PASSWORD = process.env.SMOKE_TEST_PASSWORD || 'TestPass123!';

/**
 * Log in via the login form with email and password.
 * Waits for redirect to dashboard after successful login.
 */
export async function loginAsUser(
  page: Page,
  email: string = DEFAULT_EMAIL,
  password: string = DEFAULT_PASSWORD,
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 });
}

/**
 * Sign up a new user with organization creation.
 * Waits for redirect to dashboard after successful signup.
 */
export async function signupUser(
  page: Page,
  name: string,
  email: string,
  password: string,
  orgName: string,
): Promise<void> {
  await page.goto('/signup');
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Confirm password field may or may not exist
  const confirmField = page.locator('input[name="confirmPassword"]');
  if (await confirmField.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmField.fill(password);
  }

  await page.fill('input[name="orgName"]', orgName);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard after signup
  await page.waitForURL(/\/(dashboard|onboarding|$)/, { timeout: 15000 });
}

/**
 * Log out by clicking the sign-out control.
 * Waits for redirect back to the login page.
 */
export async function logout(page: Page): Promise<void> {
  // Try common sign-out button/link patterns
  const signOutButton = page.getByRole('button', { name: /sign out|log out|logout/i });
  const signOutLink = page.getByRole('link', { name: /sign out|log out|logout/i });
  const menuTrigger = page.getByRole('button', { name: /user menu|account|avatar/i });

  // Open user menu if sign-out isn't directly visible
  if (await menuTrigger.isVisible({ timeout: 1000 }).catch(() => false)) {
    await menuTrigger.click();
  }

  if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutButton.click();
  } else if (await signOutLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutLink.click();
  } else {
    // Fallback: look for any element with sign-out text
    await page.locator('text=/sign out|log out|logout/i').first().click();
  }

  await page.waitForURL(/\/login|\/$/);
}
