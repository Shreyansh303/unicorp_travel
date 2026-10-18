import { expect, test } from '@playwright/test';

// Mirrors src/config/env.ts: only the exact string "false" turns the demo off.
const demo = process.env['DEMO'] !== 'false';

test('home page renders with one H1 and en-IN language', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unicorp Travel');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('robots meta follows the DEMO flag', async ({ page }) => {
  await page.goto('/');
  const robots = page.locator('meta[name="robots"]');
  if (demo) {
    await expect(robots).toHaveAttribute('content', 'noindex, nofollow');
  } else {
    await expect(robots).toHaveCount(0);
  }
});
