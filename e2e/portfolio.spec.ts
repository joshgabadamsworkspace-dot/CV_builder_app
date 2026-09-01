import { expect, test } from '@playwright/test';

test.describe('My Portfolio', () => {
  test('create CV, switch to My Portfolio, and browse the editor with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/');
    await page.click('text=Create CV');
    await expect(page).toHaveURL(/\/builder\/.+\/cv$/);

    await page.click('.builder-tabs button:has-text("My Portfolio")');
    await expect(page).toHaveURL(/\/builder\/.+\/portfolio$/);
    await expect(page.locator('.portfolio-frame')).toBeVisible();

    for (const label of ['Hero & about images', 'Services', 'Testimonials', 'Contact & footer', 'Overview & publishing']) {
      await page.click(`.sidebar nav button:has-text("${label}")`);
    }

    await page.click('.viewport-switch button:has-text("Mobile")');
    await expect(page.locator('.portfolio-frame')).toHaveClass(/viewport-mobile/);
    await page.click('.viewport-switch button:has-text("Desktop")');

    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('reloading a builder URL directly re-hydrates the profile from the active repository', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Create CV');
    await expect(page).toHaveURL(/\/builder\/.+\/cv$/);
    const url = page.url();

    await page.reload();
    await expect(page).toHaveURL(url);
    await expect(page.locator('.document-name input')).toHaveValue('Untitled CV');
  });

  // An unpublished slug and a nonexistent one deliberately look identical on
  // the public route — see PublicPortfolio.tsx's comment: telling them apart
  // would let an unauthenticated visitor confirm which slugs are claimed.
  test('an unpublished slug shows the same "not found" state as a nonexistent one', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Create CV');
    await page.click('.builder-tabs button:has-text("My Portfolio")');
    const slugInput = page.locator('.slug-field input');
    await expect(slugInput).toBeVisible();
    const slug = await slugInput.inputValue();

    await page.goto(`/p/${slug}`);
    await expect(page.getByText('Portfolio not found')).toBeVisible();
  });

  test('publishing makes the slug render on the public route in the same browser', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Create CV');
    await page.click('.builder-tabs button:has-text("My Portfolio")');
    await page.locator('.check', { hasText: 'Mark as published' }).locator('input').check();
    const slug = await page.locator('.slug-field input').inputValue();
    await page.waitForTimeout(700); // clear the debounced autosave window

    await page.goto(`/p/${slug}`);
    await expect(page.locator('.portfolio-site')).toBeVisible();
  });

  test('a not-found slug shows a clear "not found" state', async ({ page }) => {
    await page.goto('/p/this-slug-does-not-exist-anywhere');
    await expect(page.getByText('Portfolio not found')).toBeVisible();
  });
});
