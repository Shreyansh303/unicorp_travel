/**
 * Lower Home on phones (below 768px): the Why swipe row, the corporate band with its photo and the
 * shared contact band. From 768px all three are as they were: no photo request, same links.
 */
import { expect, test, type Page } from '@playwright/test';

const why = (page: Page) => page.locator('.why-section');
const corp = (page: Page) => page.locator('.corp-section');
const band = (page: Page) => page.locator('[data-enquiry]');

const hrefs = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((links) => links.map((a) => a.getAttribute('href')));

test.describe('phone Why row at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('four 256px cards in a snapping row, numbered, icons hidden', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('.why-grid');
    const css = await row.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        overflowX: style.overflowX,
        snap: style.scrollSnapType,
        scrolls: el.scrollWidth > el.clientWidth + 100,
      };
    });
    expect(css.overflowX).toBe('auto');
    expect(css.snap).toContain('x mandatory');
    expect(css.scrolls).toBe(true);
    const items = page.locator('.why-item');
    await expect(items).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      expect(Math.round((await items.nth(i).boundingBox())?.width ?? 0)).toBe(256);
      await expect(items.nth(i).locator('.why-num')).toBeVisible();
      await expect(items.nth(i).locator('.why-num')).toHaveText(`0${i + 1}`);
      await expect(items.nth(i).locator('.why-icon')).toBeHidden();
      await expect(items.nth(i).locator('h3')).toBeVisible();
      expect(await items.nth(i).evaluate((el) => getComputedStyle(el).scrollSnapAlign)).toBe(
        'start',
      );
    }
    // The next card peeks past the first; the section is on sand.
    expect((await items.nth(1).boundingBox())?.x ?? 0).toBeLessThan(390);
    expect(await why(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(243, 238, 231)',
    );
    expect(
      await items
        .nth(0)
        .locator('.why-num')
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe('rgb(184, 0, 0)');
  });

  test('the row is a keyboard stop with a name, and cards are never hidden by a reveal', async ({
    page,
  }) => {
    await page.goto('/');
    const row = page.locator('.why-grid');
    await expect(row).toHaveAttribute('tabindex', '0');
    await expect(row).toHaveAttribute('aria-label', /.+/);
    await row.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    const opacities = await page
      .locator('.why-item')
      .evaluateAll((items) => items.map((el) => getComputedStyle(el).opacity));
    expect(opacities).toEqual(['1', '1', '1', '1']);
  });

  test('stays a plain grid with no tab stop from 768px', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/');
    await expect(page.locator('.why-grid')).not.toHaveAttribute('tabindex', /.*/);
    await expect(page.locator('.why-num').first()).toBeHidden();
    await expect(page.locator('.why-icon').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.why-grid')).toHaveAttribute('tabindex', '0');
  });
});

test.describe('phone corporate band at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('has a 160px photo, the label, heading, lede and both links', async ({ page }) => {
    await page.goto('/');
    const photo = corp(page).locator('.corp-photo');
    await expect(photo).toBeVisible();
    expect(Math.round((await photo.boundingBox())?.height ?? 0)).toBe(160);
    await corp(page).scrollIntoViewIfNeeded();
    const img = photo.locator('img');
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.currentSrc))
      .toContain('corporate-airport');
    await expect(corp(page).locator('.t-eyebrow')).toHaveText('Corporate travel');
    expect(
      await corp(page)
        .locator('.t-eyebrow')
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe('rgb(255, 138, 128)');
    await expect(corp(page).getByRole('heading', { level: 2 })).toBeVisible();
    await expect(corp(page).locator('.t-lede')).toBeVisible();
    const desk = corp(page).getByRole('link', { name: /Talk to the corporate desk/ });
    const link = corp(page).getByRole('link', { name: 'Corporate travel', exact: true });
    await expect(desk).toHaveAttribute('target', '_blank');
    expect(Math.round((await desk.boundingBox())?.width ?? 0)).toBe(350);
    expect(await desk.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(
      'rgb(255, 255, 255)',
    );
    expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    // DOM order, so focus order matches: the text link, then the outlined button.
    expect((await link.boundingBox())?.y ?? 0).toBeLessThan((await desk.boundingBox())?.y ?? 0);
    await expect(corp(page).locator('.sample-label').first()).toBeVisible();
  });

  test('both links have the same hrefs as at 1366, and the photo is not fetched there', async ({
    page,
  }) => {
    await page.goto('/');
    const phone = await hrefs(page, '.corp-actions a');
    expect(phone).toHaveLength(2);
    const requests: string[] = [];
    const desktop = await page.context().newPage();
    desktop.on('request', (request) => requests.push(request.url()));
    await desktop.setViewportSize({ width: 1366, height: 900 });
    await desktop.goto('/');
    await desktop.locator('.corp-section').scrollIntoViewIfNeeded();
    await desktop.waitForLoadState('networkidle');
    expect(await hrefs(desktop, '.corp-actions a')).toEqual(phone);
    await expect(desktop.locator('.corp-photo')).toBeHidden();
    expect(requests.filter((url) => url.includes('corporate-airport'))).toEqual([]);
    await desktop.close();
  });
});

test.describe('phone contact band at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('is #b80000 with full-width 56px buttons, a text link and no card', async ({ page }) => {
    await page.goto('/');
    expect(await band(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(184, 0, 0)',
    );
    await expect(band(page).locator('.enquiry-card')).toBeHidden();
    const wa = band(page).getByRole('link', { name: /Chat on WhatsApp/ });
    const call = band(page).getByRole('link', { name: /^Call \+91/ });
    for (const button of [wa, call]) {
      const box = await button.boundingBox();
      expect(Math.round(box?.width ?? 0)).toBe(350);
      expect(Math.round(box?.height ?? 0)).toBe(56);
    }
    expect(await wa.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(255, 255, 255)',
    );
    expect(await wa.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(184, 0, 0)');
    expect(await call.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(
      'rgb(255, 255, 255)',
    );
    const next = band(page).getByRole('link', { name: 'Plan my trip step by step' });
    expect(await next.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    expect(await next.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
    expect(
      await band(page)
        .locator('h2 .t-accent')
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe('rgb(255, 255, 255)');
  });

  test('links match 1366, where the card is still shown', async ({ page }) => {
    await page.goto('/');
    const phone = await hrefs(page, '[data-enquiry] a');
    expect(phone.length).toBeGreaterThanOrEqual(3);
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await hrefs(page, '[data-enquiry] a')).toEqual(phone);
    await expect(band(page).locator('.enquiry-card')).toBeVisible();
    expect(await band(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(237, 0, 0)',
    );
  });

  test('applies to inner pages too, and the bottom bar steps aside beside it', async ({ page }) => {
    await page.goto('/holidays');
    expect(await band(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(184, 0, 0)',
    );
    await expect(band(page).locator('.enquiry-card')).toBeHidden();
    await band(page).scrollIntoViewIfNeeded();
    await expect(page.locator('.floating-fixed')).toHaveCSS('opacity', '0');
  });

  test('the Menu pill stays visible on the red and ink bands', async ({ page }) => {
    await page.goto('/');
    for (const selector of ['[data-enquiry]', '.corp-section']) {
      await page.locator(selector).evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await expect(page.locator('[data-menu-pill]')).toBeVisible();
      expect(
        await page
          .locator('[data-menu-pill]')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(255, 255, 255)');
    }
  });
});

test.describe('lower Home has no sideways overflow on phones', () => {
  for (const width of [320, 390, 767]) {
    test(`at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }
});
