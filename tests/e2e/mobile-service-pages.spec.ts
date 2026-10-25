/**
 * Service pages and Corporate travel on phones (below 768px): compact page header, folded
 * forms, accordions closed at the start, the same links as at 1366 and no sideways overflow.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const routes = ['/services/visa-passport', '/corporate-travel'];

const hrefs = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('main a, footer a'))
      .map((a) => a.getAttribute('href'))
      .sort(),
  );

for (const route of routes) {
  test.describe(`phone ${route}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('compact header is 220 to 300px tall', async ({ page }) => {
      await page.goto(route);
      const box = await page.locator('.page-hero').boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(220);
      expect(box?.height ?? 0).toBeLessThanOrEqual(300);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('the header lede folds with Read more, full text stays in the DOM', async ({ page }) => {
      await page.goto(route);
      const toggle = page.locator('[data-readmore-toggle]');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const folded = (await page.locator('.rm-text').boundingBox())?.height ?? 0;
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect((await page.locator('.rm-text').boundingBox())?.height ?? 0).toBeGreaterThan(folded);
    });

    test('the enquiry form is folded, opens in place and focuses its first field', async ({
      page,
    }) => {
      await page.goto(route);
      const button = page.locator('[data-fold-button]').first();
      await expect(button).toBeVisible();
      await expect(button).toContainText('Enquire about');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      const form = page.locator('#enquiry');
      await expect(form).toBeHidden();
      expect(await form.locator('input, select, textarea').count()).toBeGreaterThan(3);
      await button.click();
      await expect(form).toBeVisible();
      await expect(page.locator('#enquiry-name')).toBeFocused();
      const box = await page.locator('#enquiry-name').boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
    });

    test('submitting empty shows the errors with the form open', async ({ page }) => {
      await page.goto(route);
      await page.locator('[data-fold-button]').first().click();
      await page.locator('#enquiry button[type="submit"]').click();
      await expect(page.locator('#enquiry [data-error-summary]')).toBeVisible();
      await expect(page.locator('#enquiry-name')).toHaveAttribute('aria-invalid', 'true');
    });

    test('accordions are closed at the start and work from the keyboard, one at a time', async ({
      page,
    }) => {
      await page.goto(route);
      const buttons = page.locator('[data-accordion-button]');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(1);
      for (let i = 0; i < count; i++) {
        await expect(buttons.nth(i)).toHaveAttribute('aria-expanded', 'false');
      }
      await buttons.nth(0).focus();
      await page.keyboard.press('Enter');
      await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'true');
      await buttons.nth(1).focus();
      await page.keyboard.press('Space');
      await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'true');
      await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'false');
    });

    test('has the same links as at 1366', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(route);
      const desktop = await hrefs(page);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await hrefs(page)).toEqual(desktop);
    });

    test('does not scroll sideways at 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(route);
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    });

    test('has no axe violations with the form closed and open', async ({ page }) => {
      const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
      await page.goto(route);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
        window.scrollTo(0, 0);
      });
      // Let the reveal transitions finish, so no text is caught half faded.
      await page.waitForTimeout(800);
      const closed = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(closed.violations.map((v) => v.id)).toEqual([]);
      await page.locator('[data-fold-button]').first().click();
      const open = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(open.violations.map((v) => v.id)).toEqual([]);
    });
  });
}
