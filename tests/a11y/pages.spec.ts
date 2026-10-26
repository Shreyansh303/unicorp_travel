import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { allRoutes } from '../routes';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const widths = [375, 1366];

/** Scrolls through the page so lazy images load and every section is in its final state. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    window.scrollTo(0, 0);
  });
}

/** Compact violation list, so a failure names the rule, the page and the elements. */
function summarise(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations.map((violation) => ({
    rule: violation.id,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

for (const width of widths) {
  for (const path of [...allRoutes, '/no-such-page']) {
    test(`${path} has no axe violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await scrollThrough(page);
      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(summarise(results.violations)).toEqual([]);
    });
  }
}

// Once more with motion on, so axe sees the pages after their reveals and route lines have run.
for (const path of [...allRoutes, '/no-such-page']) {
  test(`${path} has no axe violations at 1366px with motion on`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(path);
    await scrollThrough(page);
    // Let reveal transitions (700ms plus stagger) and the hero route draw settle.
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(summarise(results.violations)).toEqual([]);
  });
}

test('FAQ accordions have no axe violations when open', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/faqs');
  const first = page.locator('[data-accordion-button]').first();
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(summarise(results.violations)).toEqual([]);
});

// The hero crossfade pages with every photo and the pause toggle in place, mid-crossfade.
for (const width of widths) {
  for (const path of ['/', '/holidays', '/services', '/plan-my-trip']) {
    test(`${path} has no axe violations at ${width}px with the hero crossfade running`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(path);
      await expect(page.locator('[data-hero-fade] [data-slide]')).toHaveCount(path === '/' ? 7 : 4);
      const results = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(summarise(results.violations)).toEqual([]);
    });
  }
}
