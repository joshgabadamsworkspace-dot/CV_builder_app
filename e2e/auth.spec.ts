import { expect, test } from '@playwright/test';

// Exercises the self-hosted email/password auth against the real API server
// (see playwright.auth.config.ts — run via `npm run test:e2e:auth`). Uses a
// fresh, unique email per test since all tests in this file share one
// SQLite file for the run.
const uniqueEmail = (label: string) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const PASSWORD = 'correct horse battery';

async function registerAndReachDashboard(page: import('@playwright/test').Page, email: string) {
  await page.goto('/');
  await page.waitForURL(/\/login$/);
  await page.click('text="Don\'t have an account? Create one"');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button:has-text("Create account")');
  await page.waitForURL(/\/dashboard$/);
}

test.describe('Self-hosted auth (API mode)', () => {
  test('an anonymous visitor is redirected to /login, and can register straight into the dashboard', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(String(err)));

    await registerAndReachDashboard(page, uniqueEmail('register'));
    await expect(page.locator('.dashboard-user')).toBeVisible();

    expect(jsErrors).toEqual([]);
  });

  test('rejects a duplicate registration and a wrong password on sign-in', async ({ page }) => {
    const email = uniqueEmail('dup');
    await registerAndReachDashboard(page, email);

    // duplicate registration
    await page.goto('/login');
    await page.click('text="Don\'t have an account? Create one"');
    await page.fill('input[type=email]', email);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button:has-text("Create account")');
    await expect(page.locator('.auth-error')).toContainText('already exists');

    // wrong password on sign-in
    await page.click('text="Already have an account? Sign in"');
    await page.fill('input[type=email]', email);
    await page.fill('input[type=password]', 'not the right password');
    await page.click('button:has-text("Sign in")');
    await expect(page.locator('.auth-error')).toContainText(/incorrect/i);
  });

  test('created data survives sign-out/sign-in, and a fresh reload of a protected route re-checks auth', async ({ page }) => {
    const email = uniqueEmail('persist');
    await registerAndReachDashboard(page, email);

    await page.click('text=New CV');
    await page.waitForURL(/\/builder\/.+\/cv$/);
    await page.fill('.document-name input', 'Persisted CV');
    await page.waitForTimeout(700); // debounce autosave

    await page.click('.brand-button');
    await page.waitForURL(/\/dashboard$/);
    await page.click('button[aria-label="Sign out"]');
    await page.waitForURL(/\/login$/);

    // a full page load of a protected route while signed out bounces to login
    await page.goto('/dashboard');
    await page.waitForURL(/\/login$/);

    await page.fill('input[type=email]', email);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/dashboard$/);
    await expect(page.locator('.profile-card h2').first()).toHaveText('Persisted CV');
  });

  test("a second user cannot see the first user's profiles, but can view their published portfolio", async ({ page, browser }) => {
    const ownerEmail = uniqueEmail('owner');
    await registerAndReachDashboard(page, ownerEmail);

    await page.click('text=New CV');
    await page.waitForURL(/\/builder\/.+\/cv$/);
    await page.click('.builder-tabs button:has-text("My Portfolio")');
    await page.locator('.check', { hasText: 'Mark as published' }).locator('input').check();
    const slug = await page.locator('.slug-field input').inputValue();
    await page.waitForTimeout(700);

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await registerAndReachDashboard(other, uniqueEmail('intruder'));
    await expect(other.locator('.profile-card')).toHaveCount(0);

    await other.goto(`/p/${slug}`);
    await expect(other.locator('.portfolio-site')).toBeVisible();
    await otherContext.close();
  });
});
