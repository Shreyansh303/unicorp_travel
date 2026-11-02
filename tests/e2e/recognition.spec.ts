/**
 * The "Recognised by our partners" timeline on /about: all four certificates with their issuers,
 * the IATA details and the years, in an ordered list, with nothing overflowing on a phone.
 */
import { expect, test } from '@playwright/test';
import { site } from '../../src/config/site';

test.describe('about recognition timeline', () => {
  test('shows the four certificates, years and the IATA code', async ({ page }) => {
    await page.goto('/about');
    const section = page.locator('section[aria-labelledby="recognition-title"]');
    await expect(section.getByRole('heading', { level: 2 })).toHaveText(
      'Recognised by our partners',
    );
    const items = section.locator('ol.recs > li');
    await expect(items).toHaveCount(site.recognitions.length);
    expect(site.recognitions).toHaveLength(4);
    for (const item of site.recognitions) {
      await expect(section.getByRole('heading', { level: 3, name: item.issuer })).toBeVisible();
      await expect(section.getByText(item.type, { exact: true }).first()).toBeVisible();
      if (item.year)
        await expect(section.getByText(item.year, { exact: true }).first()).toBeVisible();
    }
    await expect(section).toContainText('14022982');
    await expect(section).toContainText('GoLite');
  });

  test('sits between "How we work" and "Company details"', async ({ page }) => {
    await page.goto('/about');
    const order = await page.evaluate(() =>
      Array.from(document.querySelectorAll('section[aria-labelledby]')).map((s) =>
        s.getAttribute('aria-labelledby'),
      ),
    );
    const i = order.indexOf('recognition-title');
    expect(order[i - 1]).toBe('how-title');
    expect(order[i + 1]).toBe('facts-title');
  });

  for (const width of [320, 375, 768, 1366]) {
    test(`no horizontal scroll at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/about');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  }
});
