/**
 * The client logo strip ("Companies we have worked with") on Home and Corporate travel: it
 * renders all 21 companies from site.ts (a logo with alt text, or a text tile), always in colour,
 * the second copy is hidden from assistive technology, the row moves slowly and only by
 * transform, pauses under the pointer, has a Next button but no Pause button (user decisions,
 * 2026-10-31 and 2026-11-02), and with reduced motion it becomes a static grid without Next.
 */
import { expect, test, type Page } from '@playwright/test';
import { site } from '../../src/config/site';

const pages = ['/', '/corporate-travel'];

const strip = (page: Page) => page.locator('[data-strip-root]');
const track = (page: Page) => page.locator('.strip-track');

for (const path of pages) {
  test.describe(`logo strip on ${path}`, () => {
    test('shows every client logo with its name as alt text', async ({ page }) => {
      await page.goto(path);
      await expect(strip(page).getByRole('heading', { level: 2 })).toHaveText(
        'Companies we have worked with',
      );
      expect(site.clients).toHaveLength(21);
      const items = strip(page).locator('ul:not([aria-hidden]) > li');
      await expect(items).toHaveCount(site.clients.length);
      for (const [i, client] of site.clients.entries()) {
        const item = items.nth(i);
        if (client.logo) {
          await expect(item.locator('img')).toHaveAttribute('alt', client.name);
        } else {
          await expect(item.locator('img')).toHaveCount(0);
          await expect(item.locator('.strip-tile')).toHaveText(client.name);
        }
      }
      // The copy that makes the loop seamless is hidden; its logos have empty alt text.
      const copy = strip(page).locator('ul[aria-hidden="true"] > li');
      await expect(copy).toHaveCount(site.clients.length);
      const copyImgs = strip(page).locator('ul[aria-hidden="true"] img');
      expect(await copyImgs.evaluateAll((els) => els.map((el) => el.getAttribute('alt')))).toEqual(
        site.clients.filter((c) => c.logo).map(() => ''),
      );
    });

    test('is always in colour', async ({ page }) => {
      await page.goto(path);
      const look = () =>
        strip(page)
          .locator('.strip-logo')
          .evaluateAll((els) =>
            els.map((el) => `${getComputedStyle(el).filter}|${getComputedStyle(el).opacity}`),
          );
      expect(new Set(await look())).toEqual(new Set(['none|1']));
      await page.locator('[data-strip]').scrollIntoViewIfNeeded();
      await page.locator('[data-strip]').hover();
      expect(new Set(await look())).toEqual(new Set(['none|1']));
    });

    test('logos are lazy-loaded and the page has no horizontal scroll', async ({ page }) => {
      await page.goto(path);
      const eager = await strip(page).locator('img:not([loading="lazy"])').count();
      expect(eager).toBe(0);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('moves slowly by transform only, with no Pause button', async ({ page }) => {
      await page.goto(path);
      await strip(page).scrollIntoViewIfNeeded();
      const animation = await track(page).evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          name: style.animationName,
          seconds: parseFloat(style.animationDuration),
          state: style.animationPlayState,
        };
      });
      expect(animation.name).toBe('strip-scroll');
      expect(animation.seconds).toBeGreaterThanOrEqual(40);
      expect(animation.state).toBe('running');

      // Only transform is animated.
      const properties = await track(page).evaluate((el) =>
        el
          .getAnimations()
          .flatMap((a) =>
            (a.effect as KeyframeEffect)
              .getKeyframes()
              .flatMap((k) =>
                Object.keys(k).filter(
                  (key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key),
                ),
              ),
          ),
      );
      expect([...new Set(properties)]).toEqual(['transform']);

      await expect(strip(page).getByRole('button', { name: /pause/i })).toHaveCount(0);
    });

    test('Next glides the row forward, by keyboard too, and repeats without a gap', async ({
      page,
    }) => {
      await page.goto(path);
      const row = page.locator('[data-strip]');
      await row.scrollIntoViewIfNeeded();
      const next = strip(page).getByRole('button', { name: 'Show next companies' });
      await expect(next).toBeVisible();
      await expect(next).toContainText('Next');
      const size = await next.boundingBox();
      expect(size?.height ?? 0).toBeGreaterThanOrEqual(44);

      // Hover pauses the loop, so only the Next glide moves the row.
      await row.hover();
      const left = () => track(page).evaluate((el) => el.getBoundingClientRect().left);
      const covered = async () => {
        const t = await track(page).boundingBox();
        const r = await row.boundingBox();
        return !!t && !!r && t.x + t.width >= r.x + r.width && t.x <= r.x;
      };
      const start = await left();
      await next.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(900);
      const once = await left();
      expect(once).toBeLessThan(start - 100);
      expect(await covered()).toBe(true);

      // Press it many times: the loop wraps and never shows a gap.
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(750);
        expect(await covered()).toBe(true);
      }
    });

    test('pauses while the pointer is over the row', async ({ page }) => {
      await page.goto(path);
      const row = page.locator('[data-strip]');
      await row.scrollIntoViewIfNeeded();
      await row.hover();
      await expect(track(page)).toHaveCSS('animation-play-state', 'paused');
    });
  });
}

test.describe('logo strip with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of pages) {
    test(`is a static wrapped grid on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(track(page)).toHaveCSS('animation-name', 'none');
      await expect(strip(page).locator('ul[aria-hidden="true"]')).toBeHidden();
      await expect(strip(page).getByRole('button', { name: 'Show next companies' })).toBeHidden();
      const items = strip(page).locator('ul:not([aria-hidden]) > li');
      await expect(items).toHaveCount(site.clients.length);
      const box = await page.locator('[data-strip]').boundingBox();
      const viewport = page.viewportSize();
      expect(box?.width ?? 0).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
    });
  }
});

test.describe('logo strip on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('fits the screen', async ({ page }) => {
    await page.goto('/');
    await strip(page).scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
