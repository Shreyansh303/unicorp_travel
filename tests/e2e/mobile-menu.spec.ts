/**
 * Phone header (below 768px): logo row, fixed Menu pill that shrinks to an icon after the header
 * row scrolls away, and the full-screen menu. From 768px the older header is unchanged.
 */
import { expect, test } from '@playwright/test';
import { shown, site, telHref } from '../../src/config/site';

const menuPill = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Menu', exact: true });

test.describe('phone menu at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('header row has the logo and no call button', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header.site-header');
    await expect(header.locator('.wordmark img')).toBeVisible();
    await expect(header.getByRole('link', { name: /^Call/ })).toBeHidden();
    const pill = menuPill(page);
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('Menu');
    const box = await pill.boundingBox();
    expect(box?.height).toBe(44);
    expect(Math.round(box?.y ?? 0)).toBe(10);
    expect(Math.round(390 - ((box?.x ?? 0) + (box?.width ?? 0)))).toBe(20);
  });

  test('the pill stays fixed after scrolling and collapses to an icon', async ({ page }) => {
    await page.goto('/');
    const pill = menuPill(page);
    const before = await pill.boundingBox();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(pill).toHaveAttribute('data-state', 'collapsed');
    await pill.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const after = await pill.boundingBox();
    expect(after?.width).toBe(44);
    expect(after?.height).toBe(44);
    expect(after?.y).toBe(before?.y);
    expect((after?.x ?? 0) + (after?.width ?? 0)).toBe((before?.x ?? 0) + (before?.width ?? 0));
    await expect(pill).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(pill).toHaveAttribute('data-state', 'expanded');
  });

  test('the pill sits above the floating contact bar and page content', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1500));
    const pill = menuPill(page);
    const zOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => Number(getComputedStyle(el).zIndex));
    expect(await pill.evaluate((el) => Number(getComputedStyle(el).zIndex))).toBeGreaterThan(
      await zOf('.floating-fixed'),
    );
    const box = await pill.boundingBox();
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x ?? 0, y ?? 0)?.closest('.menu-pill') !== null,
      [(box?.x ?? 0) + 22, (box?.y ?? 0) + 22],
    );
    expect(onTop).toBe(true);
  });

  test('opens the menu, lists the pages and closes with Close', async ({ page }) => {
    await page.goto('/holidays');
    const pill = menuPill(page);
    await pill.click();
    const menu = page.locator('#site-nav-menu');
    await expect(menu).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-menu-open', '');
    await expect(pill).toHaveAttribute('aria-expanded', 'true');

    const nav = menu.getByRole('navigation');
    for (const [name, href] of [
      ['Holidays', '/holidays'],
      ['Corporate travel', '/corporate-travel'],
      ['Services', '/services'],
      ['Plan my trip', '/plan-my-trip'],
      ['About', '/about'],
      ['Contact', '/contact'],
      ['FAQs', '/faqs'],
    ] as const) {
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
    // The eleven service pages are not listed.
    await expect(nav.getByRole('link')).toHaveCount(7);
    await expect(nav.getByRole('link', { name: 'Holidays', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const mobile = shown(site.phones.mobile);
    if (mobile) {
      await expect(menu.getByRole('link', { name: `Call ${mobile.display}` })).toHaveAttribute(
        'href',
        telHref(mobile),
      );
    }
    await expect(menu.getByRole('link', { name: /Chat on WhatsApp/ })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\//,
    );

    // Close sits where the pill was.
    const close = menu.getByRole('button', { name: 'Close' });
    await menu.evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
    );
    const closeBox = await close.boundingBox();
    expect(Math.round(closeBox?.height ?? 0)).toBe(44);
    expect(Math.round(closeBox?.y ?? 0)).toBe(10);
    expect(Math.round(390 - ((closeBox?.x ?? 0) + (closeBox?.width ?? 0)))).toBe(20);

    await close.click();
    await expect(menu).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-menu-open', '');
    await expect(pill).toBeFocused();
  });

  test('Escape closes the menu and returns focus; focus stays trapped inside', async ({ page }) => {
    await page.goto('/');
    const pill = menuPill(page);
    await pill.focus();
    await page.keyboard.press('Enter');
    const menu = page.locator('#site-nav-menu');
    await expect(menu).toBeVisible();
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('#site-nav-menu'))).toBe(
        true,
      );
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(pill).toBeFocused();
  });

  test('page scroll is locked while open and a link closes the menu', async ({ page }) => {
    await page.goto('/');
    await menuPill(page).click();
    const menu = page.locator('#site-nav-menu');
    await expect(menu).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    );
    await menu.getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.locator('#site-nav-menu')).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-menu-open', '');
  });

  test('the pinned buttons stay visible on a short screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await menuPill(page).click();
    const menu = page.locator('#site-nav-menu');
    await expect(menu.getByRole('link', { name: /Chat on WhatsApp/ })).toBeInViewport({
      ratio: 1,
    });
    const call = menu.getByRole('link', { name: /^Call/ });
    await expect(call).toBeInViewport({ ratio: 1 });
    const box = await call.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(56);
  });

  for (const path of ['/', '/holidays', '/services', '/contact']) {
    test(`no horizontal overflow on ${path}, menu closed or open`, async ({ page }) => {
      await page.goto(path);
      const overflow = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
      expect(await overflow()).toBeLessThanOrEqual(0);
      await menuPill(page).click();
      await expect(page.locator('#site-nav-menu')).toBeVisible();
      expect(
        await page
          .locator('#site-nav-menu .dlg-panel')
          .evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('the pill does not animate when it collapses', async ({ page }) => {
    await page.goto('/');
    const pill = menuPill(page);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(pill).toHaveAttribute('data-state', 'collapsed');
    expect(await pill.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});

for (const width of [768, 1024, 1366]) {
  test(`the pill is hidden and the header row is unchanged at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.menu-pill')).toBeHidden();
    await expect(page.locator('#site-nav-menu')).toBeHidden();
    const header = await page.locator('header.site-header').boundingBox();
    expect(header?.height).toBeLessThanOrEqual(72);
    await expect(
      page.locator('header.site-header').getByRole('link', { name: /^Call/ }),
    ).toBeVisible();
  });
}

test('at 800px the older drawer still opens from its Menu button', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/');
  await page.locator('.menu-btn').click();
  await expect(page.locator('#site-nav-drawer')).toBeVisible();
  await expect(page.locator('#site-nav-menu')).toBeHidden();
  await page.keyboard.press('Escape');
});
