import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const paths = ['/styleguide', '/mocks/c', '/mocks/c/package'];
const widths = [375, 1366];

/** Waits for entry animations inside `selector` (dialogs, submenus) to finish before scanning. */
async function settle(page: Page, selector: string) {
  await page.evaluate(async (sel) => {
    const root = document.querySelector(sel);
    if (!root) return;
    await Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished));
  }, selector);
}

async function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(tags).analyze();
}

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

for (const width of widths) {
  for (const path of paths) {
    test(`${path} has no axe violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await scrollThrough(page);
      const results = await scan(page);
      expect(results.violations).toEqual([]);
    });
  }
}

test('styleguide has no axe violations with the submenu and dialog open', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/styleguide');

  await page.locator('[aria-controls="site-submenu-0"]').click();
  await expect(page.locator('#site-submenu-0')).toBeVisible();
  await settle(page, '#site-submenu-0');
  expect((await scan(page)).violations).toEqual([]);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Request a callback', exact: true }).click();
  await expect(page.locator('#sg-dialog')).toBeVisible();
  await settle(page, '#sg-dialog');
  expect((await scan(page)).violations).toEqual([]);
});

test('mobile drawer has no axe violations when open', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/mocks/c');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.locator('#site-nav-drawer')).toBeVisible();
  await settle(page, '#site-nav-drawer');
  expect((await scan(page)).violations).toEqual([]);
});
