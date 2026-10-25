/**
 * /plan-my-trip, /privacy, /terms and /404 on phones (below 768px): the step counter and progress
 * bar with the sticky Next/Back bar, tap cards and 56px fields; the legal pages' "Jump to" chips
 * with the text unchanged; the compact 404 list. Links and text equal those at 1366; nothing
 * overflows at 320; no bottom bar on any of them.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const phone = { width: 390, height: 844 };
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const hrefs = (page: Page, selector: string) =>
  page.evaluate(
    (sel) =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>(sel))
        .map((a) => a.getAttribute('href'))
        .sort(),
    selector,
  );

async function noOverflowAt320(page: Page) {
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
}

async function openPlanner(page: Page) {
  await page.goto('/plan-my-trip');
  await page.locator('#planner').scrollIntoViewIfNeeded();
  await page.locator('[data-planner][data-ready]').waitFor({ state: 'attached' });
}

const submit = (page: Page) => page.locator('.plan-form button[type="submit"]');
const bodyPaddingBottom = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).paddingBottom);

test.describe('phone /plan-my-trip', () => {
  test.use({ viewport: phone });

  test('step counter, progress bar and a sticky Next bar; no WhatsApp/Call bar', async ({
    page,
  }) => {
    await openPlanner(page);
    await expect(page.locator('#plan-step-title')).toContainText('Step 1 of 5');
    const bar = page.locator('.plan-progress');
    await expect(bar).toBeVisible();
    expect(Math.round((await bar.boundingBox())?.height ?? 0)).toBe(4);
    await expect(page.locator('.plan-stepper')).toBeHidden();
    await expect(page.locator('.floating-fixed')).toBeHidden();
    expect(await bodyPaddingBottom(page)).toBe('0px');
    const box = await page.locator('.plan-buttons').boundingBox();
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(phone.height);
    expect(Math.round(box?.x ?? 1)).toBe(0);
    expect(Math.round(box?.width ?? 0)).toBe(phone.width);
    await expect(submit(page)).toHaveCSS('background-color', 'rgb(237, 0, 0)');
    expect(Math.round((await submit(page).boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(56);
    // Back appears from step 2 and is a plain text link.
    const back = page.getByRole('button', { name: 'Back', exact: true });
    await expect(back).toHaveCount(0);
    await page.locator('#plan-tripType-0').check();
    await submit(page).click();
    await expect(page.locator('#plan-step-title')).toContainText('Step 2 of 5');
    await expect(back).toBeVisible();
    await expect(back).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const scale = await page.locator('.plan-progress > span').evaluate((el) => el.style.transform);
    expect(scale).toBe('scaleX(0.4)');
  });

  test('choices are tap cards of 64px or more with a ring and tick when chosen', async ({
    page,
  }) => {
    await openPlanner(page);
    const rows = page.locator('.plan .radio-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i++) {
      expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(63.5);
    }
    await rows.first().click();
    await expect(page.locator('#plan-tripType-0')).toBeChecked();
    await expect(page.locator('#plan-tripType-0')).toHaveCSS(
      'box-shadow',
      /rgb\(.*\) 0px 0px 0px 2px inset/,
    );
    const image = await page
      .locator('label[for="plan-tripType-0"]')
      .evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
    expect(image).toContain('svg');
  });

  test('all five steps, the summary and the hand-off reach the same end state', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPlanner(page);
    await page.locator('#plan-tripType-0').check();
    await submit(page).click();
    await page.locator('#plan-destinations').fill('Kerala and Coorg');
    await page.locator('#plan-regions-0').click();
    await submit(page).click();
    await page.locator('#plan-timing').fill('The last week of December');
    await page.locator('#plan-flexibility-1').check();
    await submit(page).click();
    await expect(page.locator('#plan-step-title')).toContainText('Step 4 of 5');
    for (const id of ['plan-adults', 'plan-children', 'plan-budget']) {
      const height = (await page.locator(`#${id}`).boundingBox())?.height ?? 0;
      expect(height).toBeGreaterThanOrEqual(55.5);
    }
    await page.locator('#plan-budget').selectOption({ index: 1 });
    await submit(page).click();
    await page.locator('#plan-name').fill('Neha Kapoor');
    await page.locator('#plan-phone').fill('+91 98100 82665');
    await page.locator('#plan-email').fill('neha@example.com');
    await page.locator('#plan-consent').check();
    await expect(submit(page)).toHaveText(/Check my answers/);
    await submit(page).click();
    await expect(page.locator('#plan-step-title')).toContainText('Check your request');
    const summary = page.locator('.plan-summary');
    for (const text of ['A holiday', 'Kerala and Coorg', 'Neha Kapoor', 'neha@example.com']) {
      await expect(summary).toContainText(text);
    }
    await expect(summary.getByRole('button', { name: /Change/ })).toHaveCount(5);
    await submit(page).click();
    await expect(page.locator('#plan-step-title')).toHaveText('Your trip request is ready to send');
    await expect(
      page.locator('[data-planner]').getByRole('link', { name: /Send on WhatsApp/ }),
    ).toHaveCount(1);
  });

  test('errors are shown above the bar, and axe is clean with one showing', async ({ page }) => {
    await openPlanner(page);
    await submit(page).click();
    const error = page.locator('#plan-tripType-error');
    await expect(error).toBeVisible();
    await expect(page.locator('#plan-tripType-0')).toBeFocused();
    const errorBox = await error.boundingBox();
    const barBox = await page.locator('.plan-buttons').boundingBox();
    expect((errorBox?.y ?? 0) + (errorBox?.height ?? 0)).toBeLessThanOrEqual(barBox?.y ?? 0);
    const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(results.violations).toEqual([]);
  });

  test('axe is clean on step 1; same links as at 1366; no overflow at 320', async ({ page }) => {
    await openPlanner(page);
    const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(results.violations).toEqual([]);
    const onPhone = await hrefs(page, 'main a, footer a');
    await noOverflowAt320(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await hrefs(page, 'main a, footer a')).toEqual(onPhone);
  });

  test('1366 is unchanged: stepper, no progress bar, floating buttons', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openPlanner(page);
    await expect(page.locator('.plan-stepper')).toBeVisible();
    await expect(page.locator('.plan-progress')).toBeHidden();
    await expect(page.locator('.floating-fixed')).toBeVisible();
    const position = await page
      .locator('.plan-buttons')
      .evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe('static');
  });
});

for (const path of ['/privacy', '/terms']) {
  test.describe(`phone ${path}`, () => {
    test.use({ viewport: phone });

    test('Jump to chips link to real headings, in one scrolling row', async ({ page }) => {
      await page.goto(path);
      const chips = page.locator('.legal-chip');
      expect(await chips.count()).toBeGreaterThan(5);
      const headings = await page.locator('.prose h2').evaluateAll((els) => els.map((el) => el.id));
      const targets = await chips.evaluateAll((els) =>
        els.map((el) => (el.getAttribute('href') ?? '').slice(1)),
      );
      expect(targets).toEqual(headings);
      const tops = await chips.evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().top)),
      );
      expect(new Set(tops).size).toBe(1);
      await chips.nth(2).click();
      await expect(page).toHaveURL(new RegExp(`#${targets[2]}$`));
    });

    test('16px text, 1.6 line height, no bar, and the same text as at 1366', async ({ page }) => {
      await page.goto(path);
      const style = await page
        .locator('.prose p')
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.fontSize, s.lineHeight];
        });
      expect(style).toEqual(['16px', '25.6px']);
      await expect(page.locator('.floating-fixed')).toBeHidden();
      expect(await bodyPaddingBottom(page)).toBe('0px');
      await expect(page.locator('.legal-updated')).toBeVisible();
      const text = await page.locator('.prose').evaluate((el) => el.textContent);
      await page.setViewportSize({ width: 1366, height: 900 });
      expect(await page.locator('.prose').evaluate((el) => el.textContent)).toBe(text);
      await expect(page.locator('.legal-jump')).toBeHidden();
      await expect(page.locator('.floating-fixed')).toBeVisible();
    });

    test('no overflow at 320 and axe is clean', async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
      expect(results.violations).toEqual([]);
      await noOverflowAt320(page);
    });
  });
}

test.describe('phone /404', () => {
  test.use({ viewport: phone });

  test('a compact list with every link, no bar, and the same links as at 1366', async ({
    page,
  }) => {
    await page.goto('/404');
    await expect(page.locator('.link-tile')).toHaveCount(6);
    await expect(page.locator('.floating-fixed')).toBeHidden();
    expect(await bodyPaddingBottom(page)).toBe('0px');
    const onPhone = await hrefs(page, 'main a, footer a');
    await noOverflowAt320(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await hrefs(page, 'main a, footer a')).toEqual(onPhone);
    await expect(page.locator('.floating-fixed')).toBeVisible();
  });

  test('axe finds no violations', async ({ page }) => {
    await page.goto('/404');
    const results = await new AxeBuilder({ page }).withTags(axeTags).analyze();
    expect(results.violations).toEqual([]);
  });
});
