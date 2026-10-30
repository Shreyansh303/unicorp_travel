/**
 * Accreditation and membership badges (list in site.ts): shown on About and in the footer, with
 * the full organisation name as alt text, lazy-loaded, with no sideways scroll at 375px.
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
    test(`are in the footer on ${path}`, async ({ page }) => {
      await page.goto(path);
      const row = page.locator('footer [data-badge-row]');
      await row.scrollIntoViewIfNeeded();
      const images = row.locator('img');
      await expect(images).toHaveCount(names.length);
      expect(await images.evaluateAll((els) => els.map((el) => el.getAttribute('alt')))).toEqual(
        names,
      );
      expect(
        await images.evaluateAll((els) => els.every((el) => el.getAttribute('loading') === 'lazy')),
      ).toBe(true);
      // Every badge has loaded (a broken image has no natural width).
      await expect
        .poll(() =>
          images.evaluateAll((els) => els.every((el) => (el as HTMLImageElement).naturalWidth > 0)),
        )
        .toBe(true);
    });
  }

  test.describe('at 375px', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    for (const path of ['/about', '/']) {
      test(`${path} has no horizontal scroll`, async ({ page }) => {
        await page.goto(path);
        await page.locator('footer [data-badge-row]').scrollIntoViewIfNeeded();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
});
