/**
 * /holidays and /services on phones (below 768px): a short crossfading photo with a cream sheet
 * and one primary action, the filter chips in one scrolling row, six holidays then "Show more",
 * services as compact rows, the folded callback form, the same links as at 1366 and no overflow.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const hrefs = (page: Page, selector: string) =>
  page.evaluate(
    (sel) =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>(sel))
        .map((a) => a.getAttribute('href'))
        .sort(),
    selector,
  );

const cards = (page: Page) => page.locator('[data-package]:visible');

for (const route of ['/holidays', '/services']) {
  test.describe(`phone ${route}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('photo, sheet and the primary action sit in the first screen', async ({ page }) => {
      await page.goto(route);
      const photo = await page.locator('[data-hero-fade]').boundingBox();
      expect(photo?.width ?? 0).toBeGreaterThanOrEqual(389);
      expect(Math.round(photo?.height ?? 0)).toBe(260);
      const button = await page.locator('.ph-copy .btn').first().boundingBox();
      expect(button?.width ?? 0).toBeGreaterThan(300);
      expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThan(844);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    for (const size of [
      { width: 320, height: 640 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
    ]) {
      test(`the breadcrumb sits above the title and clear of the button at ${size.width}`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await page.goto(route);
        await page.waitForTimeout(1200);
        const crumbs = await page.locator('.ph-copy .crumbs').boundingBox();
        const title = await page.locator('h1').boundingBox();
        const button = await page.locator('.ph-copy .btn').first().boundingBox();
        expect((crumbs?.y ?? 0) + (crumbs?.height ?? 0)).toBeLessThanOrEqual(title?.y ?? 0);
        expect((crumbs?.y ?? 0) + (crumbs?.height ?? 0)).toBeLessThanOrEqual(button?.y ?? 0);
      });
    }

    test('the action stays above the bar on a 375x667 phone', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(route);
      const button = await page.locator('.ph-copy .btn').first().boundingBox();
      const bar = await page.locator('.floating-fixed').boundingBox();
      expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 0);
    });

    test('no sideways overflow at 320', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(route);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width).toBeLessThanOrEqual(320);
    });

    test('the crossfade still advances', async ({ page }) => {
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent = ':root{--duration-photo-hold:400ms;--duration-photo-fade:100ms}';
          document.head.append(style);
        });
      });
      await page.goto(route);
      await page.waitForFunction(
        () => document.querySelector('[data-hero-fade]')?.hasAttribute('data-fade-index'),
        undefined,
        { timeout: 15_000 },
      );
    });

    test('axe finds no violations', async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });

  test.describe(`reduced motion ${route}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

    test('photo 1 stays', async ({ page }) => {
      await page.goto(route);
      await page.waitForTimeout(2500);
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(1);
      expect(await page.locator('[data-hero-fade]').getAttribute('data-fade-index')).toBeNull();
    });
  });
}

test.describe('phone /holidays list', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('filter chips are one scrolling row and the active chip is filled', async ({ page }) => {
    await page.goto('/holidays');
    const panel = page.locator('[data-filters-panel]');
    await expect(panel).toBeVisible();
    const scrolls = await panel.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrolls).toBe(true);
    const tops = await panel
      .locator('.chip')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const chip = panel.locator('.chip').first();
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(page.url()).toContain('type=');
  });

  test('six holidays first, then Show more reveals the rest', async ({ page }) => {
    await page.goto('/holidays');
    const total = await page.locator('[data-package]').count();
    expect(total).toBeGreaterThan(6);
    await expect(cards(page)).toHaveCount(6);
    await page.getByRole('button', { name: 'Show more' }).click();
    await expect(cards(page)).toHaveCount(total);
    await expect(page.getByRole('button', { name: 'Show more' })).toBeHidden();
  });

  test('Show more follows the filtered set', async ({ page }) => {
    await page.goto('/holidays');
    const total = await page.locator('[data-package]').count();
    await page.getByRole('button', { name: 'Show more' }).click();
    const options = page.locator('[data-filters-panel] .chip');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      await options.nth(i).click();
      const matching = await page.locator('[data-package]:not([hidden])').count();
      await expect(page.getByRole('status')).toContainText(`Showing ${matching} of ${total}`);
      await expect(cards(page)).toHaveCount(Math.min(matching, 6));
      const more = page.getByRole('button', { name: 'Show more' });
      if (matching > 6) await expect(more).toBeVisible();
      else await expect(more).toBeHidden();
      await options.nth(i).click();
    }
    // Clearing the filters brings the first six and the button back.
    await expect(cards(page)).toHaveCount(6);
    await expect(page.getByRole('button', { name: 'Show more' })).toBeVisible();
  });

  test('the callback form is folded', async ({ page }) => {
    await page.goto('/holidays');
    await expect(page.locator('[aria-controls="callback-fold"]')).toBeVisible();
  });

  test('the same links as at 1366', async ({ page }) => {
    await page.goto('/holidays');
    const phone = await hrefs(page, 'main a');
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await hrefs(page, 'main a')).toEqual(phone);
  });
});

test.describe('phone /services rows', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('services are compact rows with the same links as at 1366', async ({ page }) => {
    await page.goto('/services');
    const rows = page.locator('.svc-tile');
    expect(await rows.count()).toBeGreaterThanOrEqual(9);
    const box = await rows.first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(64);
    expect(box?.height ?? 999).toBeLessThan(120);
    await expect(page.locator('.svc-photo').first()).toBeHidden();
    const phone = await hrefs(page, '.svc-tile');
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await hrefs(page, '.svc-tile')).toEqual(phone);
    await expect(page.locator('.svc-photo').first()).toBeVisible();
  });
});

test.describe('1366 listing page is unchanged in shape', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('all holidays show and no Show more button', async ({ page }) => {
    await page.goto('/holidays');
    const total = await page.locator('[data-package]').count();
    await expect(cards(page)).toHaveCount(total);
    await expect(page.locator('[data-show-more]')).toBeHidden();
    await expect(page.locator('[data-filters-toggle]')).toBeHidden();
  });
});
