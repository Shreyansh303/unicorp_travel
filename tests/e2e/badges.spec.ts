/**
 * Accreditation and membership badges (list in site.ts): images on About, with the full
 * organisation name as alt text, lazy-loaded; a text line in the footer; no sideways scroll at 375px.
 */
import { expect, test } from '@playwright/test';
import { site } from '../../src/config/site';

const names = site.memberships.map((membership) => membership.name);

test.describe('membership badges', () => {
  test('are on About with alt text, lazy-loaded and sized', async ({ page }) => {
    await page.goto('/about');
    const row = page.locator('main [data-badge-row]');
    await expect(row.getByRole('heading', { level: 2 })).toHaveText(
      'Memberships and registrations',
    );
    const images = row.locator('img');
    await expect(images).toHaveCount(names.length);
    expect(names.length).toBe(5);
    expect(await images.evaluateAll((els) => els.map((el) => el.getAttribute('alt')))).toEqual(
      names,
    );
    expect(
      await images.evaluateAll((els) =>
        els.every(
          (el) =>
            el.getAttribute('loading') === 'lazy' &&
            el.getAttribute('width') &&
            el.getAttribute('height'),
        ),
      ),
    ).toBe(true);
  });

  for (const path of ['/', '/about', '/contact', '/holidays']) {
    test(`are listed as text in the footer on ${path}`, async ({ page }) => {
      await page.goto(path);
      const block = page.locator('footer [data-memberships]');
      await block.scrollIntoViewIfNeeded();
      await expect(block.getByRole('heading', { level: 2 })).toHaveText(
        'Memberships and registrations',
      );
      await expect(block.locator('li')).toHaveText(
        site.memberships.map((membership) => membership.short),
      );
      await expect(block.locator('img')).toHaveCount(0);
    });
  }

  test.describe('at 375px', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    for (const path of ['/about', '/']) {
      test(`${path} has no horizontal scroll`, async ({ page }) => {
        await page.goto(path);
        await page.locator('footer [data-memberships]').scrollIntoViewIfNeeded();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
});
