/**
 * /contact, /about and /faqs on phones (below 768px): the contact page's 64px rows and open form
 * with no bottom bar, the about page's folded story and compact sections, the FAQ topic chips and
 * one-at-a-time accordion. Links and structured data equal those at 1366; nothing overflows.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { shown, site, telHref } from '../../src/config/site';

const hrefs = (page: Page, selector: string) =>
  page.evaluate(
    (sel) =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>(sel))
        .map((a) => a.getAttribute('href'))
        .sort(),
    selector,
  );

const jsonLd = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (el) => el.textContent,
    ),
  );

const phone = { width: 390, height: 844 };

async function noOverflowAt320(page: Page) {
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
}

test.describe('phone /contact', () => {
  test.use({ viewport: phone });

  test('contact methods are 64px rows with the right links', async ({ page }) => {
    await page.goto('/contact');
    const rows = page.locator('.way-link');
    const actual = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
    const mobile = shown(site.phones.mobile);
    if (mobile) {
      expect(actual.some((value) => value.startsWith('https://wa.me/'))).toBe(true);
    }
    for (const entry of [site.phones.mobile, site.phones.landline, site.phones.secondMobile]) {
      const number = shown(entry);
      if (number) expect(actual).toContain(telHref(number));
    }
    const email = shown(site.email);
    if (email) expect(actual.some((value) => value.startsWith(`mailto:${email}`))).toBe(true);
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i).locator('xpath=ancestor::*[self::li or self::div][1]');
      const box = await row.boundingBox();
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(64);
      expect(Math.round(box?.height ?? 0)).toBeLessThanOrEqual(70);
      // The link covers the whole row.
      const position = await rows
        .nth(i)
        .evaluate((el) => getComputedStyle(el, '::before').position);
      expect(position).toBe('absolute');
    }
  });

  test('there is no bottom bar and no space reserved for it', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('.floating-fixed')).toBeHidden();
    const padding = await page.evaluate(() => getComputedStyle(document.body).paddingBottom);
    expect(padding).toBe('0px');
  });

  test('the form is open, single-column and labelled', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('[data-fold-button]:visible')).toHaveCount(0);
    const fields = page.locator('#enquiry :is(input, select, textarea):visible');
    expect(await fields.count()).toBeGreaterThan(2);
    const lefts = await fields.evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBe(1);
    const unlabelled = await fields.evaluateAll(
      (els) => els.filter((el) => (el as HTMLInputElement).labels?.length === 0).length,
    );
    expect(unlabelled).toBe(0);
  });

  test('the map is a drawing, not a live map', async ({ page }) => {
    await page.goto('/contact');
    expect(await page.locator('iframe').count()).toBe(0);
    await expect(page.getByRole('link', { name: /Open in Google Maps/ })).toBeVisible();
  });

  test('the same links as at 1366, and no overflow at 320', async ({ page }) => {
    await page.goto('/contact');
    const onPhone = await hrefs(page, 'main a, footer a');
    await noOverflowAt320(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await hrefs(page, 'main a, footer a')).toEqual(onPhone);
  });

  test('axe finds no violations', async ({ page }) => {
    await page.goto('/contact');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('1366 keeps the floating control and the card layout', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/contact');
    await expect(page.locator('.floating-fixed')).toBeVisible();
    await expect(page.locator('.way-icon-row').first()).toBeHidden();
    await expect(page.locator('.way .t-muted').first()).toBeVisible();
  });
});

test.describe('phone /about', () => {
  test.use({ viewport: phone });

  test('the story folds with Read more and the bottom bar stays', async ({ page }) => {
    await page.goto('/about');
    const toggle = page.locator('[data-readmore-toggle]').first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const text = (await page.locator('#page-lede').textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(100);
    const folded = (await page.locator('#page-lede').boundingBox())?.height ?? 0;
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const open = (await page.locator('#page-lede').boundingBox())?.height ?? 0;
    expect(open).toBeGreaterThan(folded);
    await expect(page.locator('.floating-fixed')).toBeVisible();
  });

  test('how we work is a list and company details are rows', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('.steps-list .step')).toHaveCount(4);
    const rows = page.locator('.facts-list > div');
    expect(await rows.count()).toBeGreaterThan(1);
    const lefts = await rows.evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBe(1);
  });

  test('the same links as at 1366, and no overflow at 320', async ({ page }) => {
    await page.goto('/about');
    const onPhone = await hrefs(page, 'main a, footer a');
    await noOverflowAt320(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await hrefs(page, 'main a, footer a')).toEqual(onPhone);
  });

  test('axe finds no violations', async ({ page }) => {
    await page.goto('/about');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('phone /faqs', () => {
  test.use({ viewport: phone });

  test('topic chips are one scrolling row that jumps to the group', async ({ page }) => {
    await page.goto('/faqs');
    const row = page.locator('.jump ul');
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const tops = await page
      .locator('.jump a')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const chips = page.locator('.jump a');
    expect(await chips.count()).toBe(11);
    const last = chips.last();
    const target = (await last.getAttribute('href')) ?? '';
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await page.waitForTimeout(400);
    const top = await page.locator(target).evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(200);
  });

  test('answers are in the DOM, all closed, and one opens at a time', async ({ page }) => {
    await page.goto('/faqs');
    const buttons = page.locator('[data-accordion-button]');
    const total = await buttons.count();
    expect(total).toBeGreaterThan(20);
    expect(await page.locator('[data-accordion-button][aria-expanded="true"]').count()).toBe(0);
    expect(await page.locator('.acc-panel').count()).toBe(total);
    const first = buttons.nth(0);
    const second = buttons.nth(1);
    const last = buttons.nth(total - 1);
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await second.focus();
    await page.keyboard.press('Space');
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    await expect(first).toHaveAttribute('aria-expanded', 'false');
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await expect(last).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-accordion-button][aria-expanded="true"]')).toHaveCount(1);
    const box = await first.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(60);
  });

  test('structured data and links equal those at 1366', async ({ page }) => {
    await page.goto('/faqs');
    const data = await jsonLd(page);
    const onPhone = await hrefs(page, 'main a, footer a');
    await noOverflowAt320(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await jsonLd(page)).toEqual(data);
    expect(await hrefs(page, 'main a, footer a')).toEqual(onPhone);
  });

  test('the bottom bar stays', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page.locator('.floating-fixed')).toBeVisible();
  });

  test('axe finds no violations', async ({ page }) => {
    await page.goto('/faqs');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe('1366 info pages keep their shape', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('chips wrap and accordions allow several open', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page.locator('[data-readmore-toggle]').first()).toBeHidden();
    const flex = await page.locator('.jump ul').evaluate((el) => getComputedStyle(el).flexWrap);
    expect(flex).toBe('wrap');
    const buttons = page.locator('[data-accordion-button]');
    await buttons.nth(0).click();
    await buttons.nth(1).click();
    await expect(page.locator('[data-accordion-button][aria-expanded="true"]')).toHaveCount(2);
  });
});
