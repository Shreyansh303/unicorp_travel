/**
 * The hero photo crossfade on /holidays, /services and /plan-my-trip: one photo in the HTML, the
 * rest after load, no pause button, the pointer does not hold it, no movement under reduced
 * motion, and no duplicate timer after a client-side navigation. Home gets the same crossfade with
 * a destination chip per photo (see the last two blocks).
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

/**
 * Waits until the photo has changed at least once. `data-fade-index` appears with the first change
 * and stays, so this cannot miss it the way sampling the index could (the cycle comes back to 0).
 */
const firstChange = (page: Page) =>
  page.waitForFunction(
    () => document.querySelector('[data-hero-fade]')?.hasAttribute('data-fade-index') ?? false,
    undefined,
    { timeout: 15_000 },
  );

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
      // No pause button (user decision).
      await expect(page.locator('[data-hero-fade] button')).toHaveCount(0);
    });

    test('keeps changing with the pointer over the hero', async ({ page }) => {
      await speedUp(page);
      await page.goto(route, { waitUntil: 'load' });
      await firstChange(page);
      const box = await page.locator('[data-hero-fade]').boundingBox();
      if (!box) throw new Error('no hero photo');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      expect(await countChanges(page, 2000)).toBeGreaterThan(0);
    });

    test('keyboard focus inside the hero holds the crossfade', async ({ page }) => {
      await speedUp(page);
      await page.goto(route, { waitUntil: 'load' });
      await firstChange(page);
      await page.locator('.page-hero a, .page-hero button').first().focus();
      await page.waitForTimeout(600);
      expect(await countChanges(page, 2000)).toBe(0);
    });

    test('no second timer after navigating away and back', async ({ page }) => {
      // Four page loads and three client-side navigations: slow on a busy machine.
      test.slow();
      await speedUp(page);
      await page.goto(route, { waitUntil: 'load' });
      await firstChange(page);
      await page.getByRole('link', { name: 'About', exact: true }).first().click();
      await expect(page).toHaveURL(/\/about\/?$/, { timeout: 15_000 });
      await page.getByRole('link', { name: 'Home', exact: true }).first().click();
      await expect(page).toHaveURL(/\/$/);
      await page.goBack();
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${route}/?$`));
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(4);
      await firstChange(page);
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
      expect(await index(page)).toBe('0');
    });
  }
});

const homeCaptions = [
  'Udaipur, Rajasthan',
  'Kerala backwaters',
  'Tegalalang, Bali',
  'Marina Bay, Singapore',
  'Swiss Alps',
];

for (const width of [1366, 390]) {
  test.describe(`Home hero crossfade at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the first photo and its chip are in the HTML; the rest follow after load', async ({
      page,
      request,
    }) => {
      const html = await (await request.get('/')).text();
      const hero = html.slice(html.indexOf('data-hero-fade'));
      const figure = hero.slice(0, hero.indexOf('</figure>'));
      expect(figure.match(/<img /g) ?? []).toHaveLength(1);
      expect(figure).toContain('fetchpriority="high"');
      expect(figure).toContain('loading="eager"');
      expect(figure).toContain('rajasthan-1');
      const chips = hero.slice(
        hero.indexOf('data-chips'),
        hero.indexOf('</div>', hero.indexOf('data-chips')),
      );
      expect(chips.match(/data-chip/g) ?? []).toHaveLength(2); // the container and the one chip
      expect(chips).toContain('Udaipur, Rajasthan');
      for (const caption of homeCaptions.slice(1)) expect(chips).not.toContain(caption);

      await page.goto('/', { waitUntil: 'load' });
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(5);
      await expect(page.locator('[data-hero-fade] [data-chip]')).toHaveText(homeCaptions);
      await expect(page.locator('[data-hero-fade] button')).toHaveCount(0);
      // The other photos are sized for the frame: on a phone no 960 or 1280 px file is fetched.
      const widths = () =>
        page
          .locator('[data-hero-fade] [data-slide] img')
          .evaluateAll((images) => images.map((img) => (img as HTMLImageElement).naturalWidth));
      await expect.poll(async () => (await widths()).every((w) => w > 0)).toBe(true);
      for (const w of await widths()) expect(w).toBeLessThanOrEqual(width < 500 ? 640 : 1280);
    });

    test('each photo is shown with its own chip, and only that pair is exposed', async ({
      page,
    }) => {
      await speedUp(page);
      await page.goto('/', { waitUntil: 'load' });
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(5);
      // Record the hero at every change for a few seconds.
      const seen = await page.locator('[data-hero-fade]').evaluate(
        (root) =>
          new Promise<
            { index: number; chip: string; alt: string; slides: number; chips: number }[]
          >((resolve) => {
            const states: {
              index: number;
              chip: string;
              alt: string;
              slides: number;
              chips: number;
            }[] = [];
            const snap = () => {
              const slides = [...root.querySelectorAll('[data-slide]')];
              const chips = [...root.querySelectorAll('[data-chip]')];
              const active = slides.findIndex((slide) => slide.classList.contains('is-active'));
              states.push({
                index: Number(root.getAttribute('data-fade-index') ?? '0'),
                chip: chips.find((chip) => chip.classList.contains('is-active'))?.textContent ?? '',
                alt: slides[active]?.querySelector('img')?.alt ?? '',
                slides: slides.filter((slide) => !slide.hasAttribute('aria-hidden')).length,
                chips: chips.filter((chip) => !chip.hasAttribute('aria-hidden')).length,
              });
            };
            snap();
            const observer = new MutationObserver(snap);
            observer.observe(root, { attributes: true, attributeFilter: ['data-fade-index'] });
            setTimeout(() => {
              observer.disconnect();
              resolve(states);
            }, 3500);
          }),
      );
      expect(new Set(seen.map((state) => state.index)).size).toBeGreaterThanOrEqual(3);
      const alts = await page
        .locator('[data-hero-fade] [data-slide] img')
        .evaluateAll((images) => images.map((img) => (img as HTMLImageElement).alt));
      for (const state of seen) {
        expect(state.chip).toBe(homeCaptions[state.index]);
        expect(state.alt).toBe(alts[state.index]);
        expect(state.slides).toBe(1);
        expect(state.chips).toBe(1);
      }
    });
  });
}

test.describe('Home hero crossfade, other checks', () => {
  test('no sideways overflow at 320px with every photo and chip loaded', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(5);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    for (const width of [1366, 390]) {
      test(`keeps the Udaipur photo and chip at ${width}px`, async ({ page }) => {
        await speedUp(page);
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(1);
        await expect(page.locator('[data-hero-fade] img')).toHaveCount(1);
        await expect(page.locator('[data-hero-fade] [data-chip]')).toHaveText([
          'Udaipur, Rajasthan',
        ]);
        expect(await index(page)).toBe('0');
      });
    }
  });
});
