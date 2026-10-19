/**
 * Page transitions use Astro's client router. After an in-site navigation the islands must work
 * as on a fresh load: the holiday filters bind and keep their URL state and the back button, the
 * planner hydrates and moves to its next step, focus goes to the new page's heading and the new
 * title is announced.
 */
import { expect, test, type Page } from '@playwright/test';

/** Set before the first click; still there afterwards only if no full page load happened. */
async function markDocument(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
  });
}

const sameDocument = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument === true);

test('filters and the planner work after client-side navigation', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await markDocument(page);

  // Home to /holidays through the header.
  await page.locator('header a[href="/holidays"]:visible').first().click();
  await expect(page).toHaveURL(/\/holidays$/);
  await expect(page.locator('h1')).toBeFocused();
  await expect(page.locator('.astro-route-announcer')).toHaveText(await page.title());
  expect(await sameDocument(page)).toBe(true);

  // The filters bind, narrow the list and write the query string.
  await page.locator('[data-holiday-filters][data-bound]').waitFor({ state: 'attached' });
  const all = await page.locator('[data-package]:visible').count();
  const chip = page.locator('[data-chips="region"] [data-chip]').first();
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\?region=/);
  expect(await page.locator('[data-package]:visible').count()).toBeLessThan(all);

  // Back clears the filter on the same page, then returns to the home page.
  await page.goBack();
  await expect(page).toHaveURL(/\/holidays$/);
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-package]:visible')).toHaveCount(all);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('h1')).toContainText('Pack light');

  // Home to /plan-my-trip through the hero button; the planner hydrates and steps on.
  await page.locator('main a[href="/plan-my-trip"]').first().click();
  await expect(page).toHaveURL(/\/plan-my-trip$/);
  await expect(page.locator('h1')).toBeFocused();
  expect(await sameDocument(page)).toBe(true);
  await page.locator('#planner').scrollIntoViewIfNeeded();
  await page.locator('[data-planner][data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('#plan-step-title')).toContainText('Step 1 of 5');
  await page.locator('#plan-tripType-0').click();
  await page.locator('.plan-form button[type="submit"]').click();
  await expect(page.locator('#plan-step-title')).toContainText('Step 2 of 5');
});

test('a form binds once and submits once after client-side navigation', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await markDocument(page);

  // Home to /services to a service page, back, and to the service page again: the form must not
  // bind twice.
  const service = page.locator('main a[href="/services/visa-passport"]:visible').first();
  await page.locator('footer a[href="/services"]').first().click();
  await expect(page).toHaveURL(/\/services$/);
  await service.click();
  await expect(page).toHaveURL(/\/services\/visa-passport$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/services$/);
  await service.click();
  await expect(page).toHaveURL(/\/services\/visa-passport$/);
  expect(await sameDocument(page)).toBe(true);

  const form = page.locator('#callback');
  await page.locator('#callback[data-bound]').waitFor({ state: 'attached' });
  await form.locator('#callback-name').fill('Asha Verma');
  await form.locator('#callback-phone').fill('98765 43210');
  await form.locator('#callback-time').selectOption({ index: 1 });
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#callback-success [data-success-title]')).toBeFocused();
  await expect(page.locator('[data-success-title]:visible')).toHaveCount(1);
  await expect(page.locator('#callback-success [data-handoff="whatsapp"]')).toHaveCount(1);
});
