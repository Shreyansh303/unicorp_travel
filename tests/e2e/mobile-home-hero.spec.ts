/**
 * Home hero on phones (below 768px): a full-bleed photo with the logo over it and the headline on
 * a cream sheet that overlaps it. From 768px the hero is unchanged.
 */
import { expect, test, type Locator } from '@playwright/test';

/** Bounding box of a visible element; fails the test if there is none. */
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return box;
}

const ALT = 'The City Palace complex in Udaipur rising above the lake under a clear blue sky';

test.describe('phone Home hero at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the photo fills the top, 380px tall, eager and high priority', async ({ page }) => {
    await page.goto('/');
    const photo = page.locator('.hero-arch img').first();
    await expect(photo).toHaveAttribute('alt', ALT);
    await expect(photo).toHaveAttribute('loading', 'eager');
    await expect(photo).toHaveAttribute('fetchpriority', 'high');
    const box = await photo.boundingBox();
    expect(Math.round(box?.x ?? -1)).toBe(0);
    expect(Math.round(box?.y ?? -1)).toBe(0);
    expect(Math.round(box?.width ?? 0)).toBe(390);
    expect(Math.round(box?.height ?? 0)).toBe(380);
    const style = await photo.evaluate((el) => {
      const css = getComputedStyle(el);
      return {
        fit: css.objectFit,
        radius: getComputedStyle(el.closest('figure') ?? el).borderRadius,
      };
    });
    expect(style.fit).toBe('cover');
    expect(style.radius).toBe('0px');
    // One request for the hero photo, and it is sized for a phone.
    const src = await photo.evaluate((el: HTMLImageElement) => el.currentSrc);
    expect(src).toContain('rajasthan-1');
    expect(await page.locator('main img[alt^="The City Palace"]').count()).toBe(1);
  });

  test('the logo sits over the photo on a cream chip', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header.site-header');
    const logo = header.locator('.wordmark');
    const box = await logo.boundingBox();
    expect(box?.y ?? 99).toBeLessThan(40);
    expect(Math.round(box?.x ?? 0)).toBe(20);
    expect((await header.boundingBox())?.height).toBe(64);
    expect(await logo.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgb(250, 247, 242)',
    );
    // The row overlays the photo: the first section starts at the very top.
    expect(Math.round((await page.locator('main section').first().boundingBox())?.y ?? -1)).toBe(0);
  });

  test('the sheet overlaps the photo by 32px and holds the offer in the first screen', async ({
    page,
  }) => {
    await page.goto('/');
    const photo = await boxOf(page.locator('.hero-arch'));
    const sheet = await boxOf(page.locator('.hero-copy'));
    expect(Math.round(photo.y + photo.height - sheet.y)).toBe(32);
    expect(
      await page.locator('.hero-copy').evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    ).toBe('32px');
    const h1 = await boxOf(page.locator('h1'));
    expect(h1.y + h1.height).toBeLessThan(844);
    const plan = page.locator('.hero-actions').getByRole('link', { name: 'Plan my trip' });
    const planBox = await boxOf(plan);
    expect(Math.round(planBox.height)).toBe(56);
    expect(Math.round(planBox.width)).toBe(350);
    expect(planBox.y + planBox.height).toBeLessThanOrEqual(844);
    const holidays = page.locator('.hero-actions').getByRole('link', { name: 'See holidays' });
    await expect(holidays).toHaveAttribute('href', '/holidays');
    expect(Math.round((await holidays.boundingBox())?.height ?? 0)).toBe(48);
    expect(await holidays.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe(
      'underline',
    );
  });

  test('the eyebrow, the company line and the route line are hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-tag')).toBeHidden();
    await expect(page.locator('.hero-corp')).toBeHidden();
    await expect(page.locator('.hero-route')).toBeHidden();
  });

  test('the Menu pill still collapses on scroll', async ({ page }) => {
    await page.goto('/');
    const pill = page.getByRole('button', { name: 'Menu', exact: true });
    await expect(pill).toHaveAttribute('data-state', 'expanded');
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect(pill).toHaveAttribute('data-state', 'collapsed');
  });

  test('no sideways overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test('other pages keep the header in the flow', async ({ page }) => {
    await page.goto('/about');
    const pos = await page
      .locator('header.site-header')
      .evaluate((el) => getComputedStyle(el).position);
    expect(pos).toBe('relative');
  });
});

test.describe('phone Home hero on a short screen (375x667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('"Plan my trip" sits fully above the bottom bar', async ({ page }) => {
    await page.goto('/');
    const cta = await boxOf(page.locator('.hero').getByRole('link', { name: /Plan my trip/ }));
    const bar = await boxOf(page.locator('.floating-fixed'));
    expect(cta.y + cta.height).toBeLessThanOrEqual(bar.y);
  });
});

test.describe('Home hero at 1366x900', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('keeps the arch photo, eyebrow, company line and route line', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-tag')).toBeVisible();
    await expect(page.locator('.hero-corp')).toBeVisible();
    await expect(page.locator('.hero-route')).toBeVisible();
    const art = await boxOf(page.locator('.hero-art'));
    expect(art.width / art.height).toBeCloseTo(0.8, 1);
    expect(
      await page.locator('.hero-arch').evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    ).not.toBe('0px');
    expect(
      await page.locator('header.site-header').evaluate((el) => getComputedStyle(el).position),
    ).toBe('relative');
    const secondary = page.locator('.hero-actions').getByRole('link', { name: 'See holidays' });
    expect(await secondary.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none');
  });
});
