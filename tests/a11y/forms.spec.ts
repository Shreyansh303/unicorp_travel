/**
 * axe on the M5 states the page scans do not reach: forms with errors and on their success
 * screens, /holidays with filters applied and in the empty state, and every planner step.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  return results.violations.map((violation) => ({
    rule: violation.id,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

async function openForms(page: Page, path: string) {
  await page.goto(path);
  await page.locator('form[data-bound]').first().waitFor({ state: 'attached' });
  // Phones fold the long forms on some pages: open each fold.
  const folds = page.locator('[data-fold-button]:visible');
  while ((await folds.count()) > 0) await folds.first().click();
}

for (const width of [375, 1366]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });

    for (const path of [
      '/services/visa-passport',
      '/holidays/kerala-backwaters-and-hills',
      '/corporate-travel',
      '/contact',
    ]) {
      test(`${path} forms in the error and success states`, async ({ page }) => {
        test.setTimeout(120_000);
        await openForms(page, path);
        // Error state: both forms submitted empty, plus an invalid phone and email.
        await page.locator('#enquiry [name="phone"]').fill('12345');
        await page.locator('#enquiry [name="email"]').fill('not-an-email');
        await page.locator('#enquiry button[type="submit"]').click();
        await page.locator('#callback button[type="submit"]').click();
        await expect(page.locator('#callback [data-error-summary]')).toBeVisible();
        expect(await violations(page)).toEqual([]);

        // Success state: fill what each form needs.
        for (const id of ['enquiry', 'callback']) {
          const form = page.locator(`#${id}`);
          await form.locator('[name="name"]').fill('Asha Verma');
          await form.locator('[name="phone"]').fill('9891677321');
          const emailField = form.locator('[name="email"]');
          if ((await emailField.count()) > 0) await emailField.fill('');
          for (const control of await form.locator('[required]').all()) {
            if ((await control.inputValue()) !== '') continue;
            const tag = await control.evaluate((el) => el.tagName);
            if (tag === 'SELECT') await control.selectOption({ index: 1 });
            else {
              const name = (await control.getAttribute('name')) ?? '';
              await control.fill(/adults|travellers/.test(name) ? '2' : 'Details for the request');
            }
          }
          await form.locator('button[type="submit"]').click();
          await expect(page.locator(`#${id}-success`)).toBeVisible();
        }
        expect(await violations(page)).toEqual([]);
      });
    }

    test('/holidays with filters applied and in the empty state', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/holidays?type=domestic&theme=beach');
      await page.locator('[data-holiday-filters][data-bound]').waitFor({ state: 'attached' });
      await expect(page.locator('[data-filter-count]')).not.toContainText('Showing 8 of 8');
      expect(await violations(page)).toEqual([]);

      await page.goto('/holidays?type=international&region=south-india');
      await page.locator('[data-holiday-filters][data-bound]').waitFor({ state: 'attached' });
      await expect(page.locator('[data-filter-empty]')).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });

    test('every planner step, the errors, the summary and the success screen', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/plan-my-trip');
      await page.locator('#planner').scrollIntoViewIfNeeded();
      await page.locator('[data-planner][data-ready]').waitFor({ state: 'attached' });
      const next = page.locator('.plan-form button[type="submit"]');
      const fills: ((p: Page) => Promise<void>)[] = [
        (p) => p.locator('#plan-tripType-0').check(),
        (p) => p.locator('#plan-destinations').fill('Goa'),
        async (p) => {
          await p.locator('#plan-timing').fill('November');
          await p.locator('#plan-flexibility-0').check();
        },
        async (p) => {
          await p.locator('#plan-budget').selectOption({ index: 1 });
        },
        async (p) => {
          await p.locator('#plan-name').fill('Asha Verma');
          await p.locator('#plan-phone').fill('9891677321');
          await p.locator('#plan-consent').check();
        },
      ];
      for (const [index, fill] of fills.entries()) {
        await expect(page.locator('#plan-step-title')).toContainText(`Step ${index + 1} of 5`);
        expect(await violations(page), `step ${index + 1}`).toEqual([]);
        if (index !== 3) {
          // Step 4 starts valid apart from the budget; show its errors too.
          await next.click();
        } else {
          await page.locator('#plan-adults').fill('0');
          await next.click();
          await page.locator('#plan-adults').fill('2');
        }
        expect(await violations(page), `step ${index + 1} with errors`).toEqual([]);
        await fill(page);
        await next.click();
      }
      await expect(page.locator('#plan-step-title')).toContainText('Check your request');
      expect(await violations(page), 'summary').toEqual([]);
      await next.click();
      await expect(page.locator('#plan-step-title')).toHaveText(
        'Your trip request is ready to send',
      );
      expect(await violations(page), 'success').toEqual([]);
    });
  });
}
