/**
 * The client logo strip ("Companies we have worked with") on Home and Corporate travel: it
 * renders every logo from site.ts with alt text, the second copy is hidden from assistive
 * technology, the row moves slowly and only by transform, the Pause/Play button stops and restarts
 * it, and with reduced motion it becomes a static wrapped grid with no button.
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
      const logos = strip(page).locator('ul:not([aria-hidden]) img');
      await expect(logos).toHaveCount(site.clients.length);
      for (const [i, client] of site.clients.entries()) {
        await expect(logos.nth(i)).toHaveAttribute('alt', client.name);
      }
      // The copy that makes the loop seamless is hidden and has empty alt text.
      const copy = strip(page).locator('ul[aria-hidden="true"] img');
      await expect(copy).toHaveCount(site.clients.length);
      expect(await copy.evaluateAll((els) => els.map((el) => el.getAttribute('alt')))).toEqual(
        site.clients.map(() => ''),
      );
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

    test('moves slowly by transform only, and Pause/Play stops and restarts it', async ({
      page,
    }) => {
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

      const button = strip(page).getByRole('button', { name: 'Pause moving logos' });
      await expect(button).toBeVisible();
      await button.click();
      await page.mouse.move(0, 0);
      await expect(track(page)).toHaveCSS('animation-play-state', 'paused');
      const play = strip(page).getByRole('button', { name: 'Play moving logos' });
      await expect(play).toHaveText('Play');
      const before = await track(page).evaluate((el) => getComputedStyle(el).transform);
      await page.waitForTimeout(400);
      expect(await track(page).evaluate((el) => getComputedStyle(el).transform)).toBe(before);

      await play.click();
      await page.mouse.move(0, 0);
      await expect(track(page)).toHaveCSS('animation-play-state', 'running');
      await expect(strip(page).getByRole('button', { name: 'Pause moving logos' })).toHaveText(
        'Pause',
      );
    });

    test('the button works from the keyboard', async ({ page }) => {
      await page.goto(path);
      const button = strip(page).getByRole('button', { name: 'Pause moving logos' });
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(track(page)).toHaveCSS('animation-play-state', 'paused');
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
      await expect(strip(page).getByRole('button')).toBeHidden();
      const logos = strip(page).locator('ul:not([aria-hidden]) img');
      await expect(logos).toHaveCount(site.clients.length);
      const box = await page.locator('[data-strip]').boundingBox();
      const viewport = page.viewportSize();
      expect(box?.width ?? 0).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
    });
  }
});

test.describe('logo strip on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('fits the screen and keeps the button reachable', async ({ page }) => {
    await page.goto('/');
    await strip(page).scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const button = strip(page).getByRole('button', { name: 'Pause moving logos' });
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
  });
});
