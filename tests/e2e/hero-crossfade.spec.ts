/**
 * The hero photo crossfade on /holidays, /services and /plan-my-trip: one photo in the HTML, the
 * rest after load, a pause toggle, no movement under reduced motion, and no duplicate timer after
 * a client-side navigation.
 */
import { expect, test, type Page } from '@playwright/test';

const pages = ['/holidays', '/services', '/plan-my-trip'];

/** Short timings so a few cycles fit in a test; the script reads the tokens on every tick. */
async function speedUp(page: Page) {
  await page.addInitScript(() => {
    const make = () => {
      const style = document.createElement('style');
      style.textContent = ':root{--duration-photo-hold:400ms;--duration-photo-fade:100ms}';
      return style;
    };
    document.addEventListener('DOMContentLoaded', () => document.head.append(make()));
    // A client-side navigation swaps the head, so the override goes into the incoming document.
    document.addEventListener('astro:before-swap', (event) => {
      (event as Event & { newDocument: Document }).newDocument.head.append(make());
    });
  });
}

const index = (page: Page) =>
  page.locator('[data-hero-fade]').evaluate((el) => el.getAttribute('data-fade-index') ?? '0');

/** Counts how often the active photo changes over a period. */
function countChanges(page: Page, ms: number) {
  return page.locator('[data-hero-fade]').evaluate(
    (el, wait) =>
      new Promise<number>((resolve) => {
        let changes = 0;
        const observer = new MutationObserver(() => (changes += 1));
        observer.observe(el, { attributes: true, attributeFilter: ['data-fade-index'] });
        setTimeout(() => {
          observer.disconnect();
          resolve(changes);
        }, wait);
      }),
    ms,
  );
}

for (const route of pages) {
  test.describe(`hero crossfade on ${route}`, () => {
    test('only the first photo is in the HTML; the others follow after load', async ({
      page,
      request,
    }) => {
      const html = await (await request.get(route)).text();
      const hero = html.slice(html.indexOf('data-hero-fade'));
      const figure = hero.slice(0, hero.indexOf('</figure>'));
      expect(figure.match(/<img /g) ?? []).toHaveLength(1);
      expect(figure).toContain('fetchpriority="high"');
      expect(figure).toContain('loading="eager"');
      expect(hero.slice(0, hero.indexOf('</div>', hero.indexOf('data-fade-toggle')))).toMatch(
        /data-fade-toggle[^>]*hidden/,
      );

      await page.goto(route, { waitUntil: 'load' });
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(4);
      // Every slide, including those the script inserts, fills the same frame (stacked, not listed).
      const boxes = await page.locator('[data-hero-fade] [data-slide]').evaluateAll((slides) =>
        slides.map((slide) => {
          const rect = slide.getBoundingClientRect();
          return `${Math.round(rect.top)},${Math.round(rect.left)},${Math.round(rect.width)},${Math.round(rect.height)}`;
        }),
      );
      expect(new Set(boxes).size).toBe(1);
      await expect(page.getByRole('button', { name: /photo slideshow/ })).toBeVisible();
      const box = await page.getByRole('button', { name: /photo slideshow/ }).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(24);
      expect(box?.height).toBeGreaterThanOrEqual(24);
    });

    test('the toggle pauses and resumes the crossfade', async ({ page }) => {
      await speedUp(page);
      await page.goto(route, { waitUntil: 'load' });
      const toggle = page.getByRole('button', { name: /photo slideshow/ });
      await expect(toggle).toBeVisible();
      await expect.poll(() => index(page), { timeout: 5000 }).not.toBe('0');

      await toggle.click();
      await expect(toggle).toHaveAccessibleName('Play the photo slideshow');
      await page.waitForTimeout(600);
      const held = await index(page);
      await page.waitForTimeout(3000);
      expect(await index(page)).toBe(held);

      await toggle.click();
      await expect(toggle).toHaveAccessibleName('Pause the photo slideshow');
      await expect.poll(() => index(page), { timeout: 3000 }).not.toBe(held);
    });

    test('the pointer inside the hero holds the crossfade', async ({ page }) => {
      await speedUp(page);
      await page.goto(route, { waitUntil: 'load' });
      await expect.poll(() => index(page), { timeout: 5000 }).not.toBe('0');
      const box = await page.locator('[data-hero-fade]').boundingBox();
      if (!box) throw new Error('no hero photo');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(600);
      const held = await index(page);
      await page.waitForTimeout(2000);
      expect(await index(page)).toBe(held);
      await page.mouse.move(5, 5);
      await expect.poll(() => index(page), { timeout: 3000 }).not.toBe(held);
    });

    test('no second timer after navigating away and back', async ({ page }) => {
      await speedUp(page);
      await page.goto(route, { waitUntil: 'load' });
      await expect.poll(() => index(page), { timeout: 5000 }).not.toBe('0');
      await page.getByRole('link', { name: 'About', exact: true }).first().click();
      await expect(page).toHaveURL(/\/about\/?$/);
      await page.getByRole('link', { name: 'Home', exact: true }).first().click();
      await expect(page).toHaveURL(/\/$/);
      await page.goBack();
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${route}/?$`));
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(4);
      // The pointer may be resting where the hero now is, which holds the fade; move it away.
      await page.mouse.move(5, 5);
      await expect.poll(() => index(page), { timeout: 5000 }).not.toBe('0');
      // One timer changes the photo at most once per 400 ms hold (plus the 100 ms fade).
      const changes = await countChanges(page, 2600);
      expect(changes).toBeGreaterThan(0);
      expect(changes).toBeLessThanOrEqual(Math.ceil(2600 / 400) + 1);
    });
  });
}

test.describe('hero crossfade under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const route of pages) {
    test(`never starts on ${route}`, async ({ page }) => {
      await speedUp(page);
      await page.goto(route, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(1);
      await expect(page.locator('[data-hero-fade] img')).toHaveCount(1);
      await expect(page.getByRole('button', { name: /photo slideshow/ })).toBeHidden();
      expect(await index(page)).toBe('0');
    });
  }
});
