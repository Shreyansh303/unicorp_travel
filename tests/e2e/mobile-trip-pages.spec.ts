/**
 * Trip pages on phones (below 768px): photo header with a cream sheet, stat strip and one
 * Enquire button, day-by-day and price accordions, a folded enquiry form opened from the header
 * button or the bottom bar, the same links as at 1366 and no sideways overflow.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const routes = ['/holidays/andaman-islands', '/holidays/switzerland-lakes-and-alps'];

const hrefs = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('main a, footer a'))
      .map((a) => a.getAttribute('href'))
      .sort(),
  );

for (const route of routes) {
  test.describe(`phone ${route}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('photo, sheet, stat strip and Enquire button sit in the first screen', async ({
      page,
    }) => {
      await page.goto(route);
      const photo = await page.locator('.pk-arch').boundingBox();
      expect(photo?.width ?? 0).toBeGreaterThanOrEqual(389);
      expect(photo?.height ?? 0).toBeGreaterThanOrEqual(319);
      const button = await page.locator('.pk-enquire').boundingBox();
      expect(button?.width ?? 0).toBeGreaterThan(300);
      expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThan(844);
      await expect(page.locator('.pk-stats')).toBeVisible();
      await expect(page.locator('.pk-stats')).toContainText('Duration');
      await expect(page.locator('.pk-stats')).toContainText('From');
      await expect(page.locator('.pk-stats')).toContainText('Valid until');
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('the button stays above the bar on a 375x667 phone', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(route);
      const button = await page.locator('.pk-enquire').boundingBox();
      const bar = await page.locator('.floating-fixed').boundingBox();
      expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 0);
    });

    test('day 1 is open and the other days are closed', async ({ page }) => {
      await page.goto(route);
      const buttons = page.locator('#day-acc-button-0, [id^="day-acc-button-"]');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(2);
      await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'true');
      for (let i = 1; i < count; i++) {
        await expect(buttons.nth(i)).toHaveAttribute('aria-expanded', 'false');
      }
    });

    test('inclusions and exclusions are two accordion rows', async ({ page }) => {
      await page.goto(route);
      const buttons = page.locator('[id^="price-acc-button-"]');
      await expect(buttons).toHaveCount(2);
      await expect(buttons.nth(0)).toContainText('Included');
      await expect(buttons.nth(1)).toContainText('Not included');
      await buttons.nth(0).click();
      await expect(page.locator('#price-acc-panel-0')).toBeVisible();
      expect(await page.locator('#price-acc-panel-0 li').count()).toBeGreaterThan(2);
    });

    test('the form is folded and the header button opens it and focuses the first field', async ({
      page,
    }) => {
      await page.goto(route);
      const form = page.locator('#enquiry');
      await expect(form).toBeHidden();
      expect(await form.locator('input, select, textarea').count()).toBeGreaterThan(3);
      await page.locator('.pk-enquire').click();
      await expect(form).toBeVisible();
      await expect(page.locator('#enquiry-name')).toBeFocused();
    });

    test('the bar says Enquire and opens the form too', async ({ page }) => {
      await page.goto(route);
      const bar = page.locator('.floating-fixed');
      const enquire = bar.getByRole('button', { name: 'Enquire' });
      await expect(enquire).toBeVisible();
      await expect(bar.getByRole('link', { name: /Call/ })).toBeVisible();
      await expect(bar.getByRole('link', { name: /WhatsApp/ })).toBeHidden();
      await enquire.click();
      await expect(page.locator('#enquiry')).toBeVisible();
      await expect(page.locator('#enquiry-name')).toBeFocused();
    });

    test('the trip name is prefilled in the form', async ({ page }) => {
      await page.goto(route);
      await page.locator('.pk-enquire').click();
      const title = (await page.locator('h1').innerText()).trim();
      const prefilled = await page
        .locator('#enquiry input, #enquiry select')
        .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
      expect(prefilled.some((value) => value === title)).toBe(true);
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

    test('1366 keeps the desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(route);
      await expect(page.locator('.pk-enquire')).toBeHidden();
      await expect(page.locator('.pk-stats')).toBeHidden();
      await expect(page.locator('.pk-phone').first()).toBeHidden();
      await expect(page.locator('.itin')).toBeVisible();
      await expect(page.locator('#enquiry')).toBeVisible();
      await expect(page.locator('.floating-fixed').getByRole('link', { name: /WhatsApp/ })).toBeVisible();
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
      await page.waitForTimeout(800);
      const closed = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(closed.violations.map((v) => v.id)).toEqual([]);
      await page.locator('.pk-enquire').click();
      const open = await new AxeBuilder({ page }).withTags(tags).analyze();
      expect(open.violations.map((v) => v.id)).toEqual([]);
    });
  });
}
