/**
 * Slim sticky bottom bar on phones (below 768px): spec values, stepping aside for the contact
 * band and the Menu, nothing covered at the page end. From 768px the bar is unchanged.
 */
import { expect, test, type Page } from '@playwright/test';

const bar = (page: Page) => page.locator('.floating-fixed');

const scrollToBand = (page: Page) =>
  page.evaluate(() =>
    document.querySelector('[data-enquiry]')?.scrollIntoView({ block: 'center' }),
  );

test.describe('phone bottom bar at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('is a slim paper bar with 48px pill buttons', async ({ page }) => {
    await page.goto('/');
    await expect(bar(page)).toBeVisible();
    const look = await page.evaluate(() => {
      const el = document.querySelector('.floating-fixed') as HTMLElement;
      const wa = el.querySelector('.floating-wa') as HTMLElement;
      const call = el.querySelector('.floating-call') as HTMLElement;
      const bs = getComputedStyle(el);
      const w = wa.getBoundingClientRect();
      const c = call.getBoundingClientRect();
      return {
        bg: bs.backgroundColor,
        borderTop: `${bs.borderTopWidth} ${bs.borderTopColor}`,
        padding: `${bs.paddingTop} ${bs.paddingRight} ${bs.paddingBottom} ${bs.paddingLeft}`,
        height: el.getBoundingClientRect().height,
        bottom: Math.round(el.getBoundingClientRect().bottom),
        position: bs.position,
        waH: w.height,
        callH: c.height,
        gap: Math.round(c.left - w.right),
        ratio: Math.round((w.width / c.width) * 10) / 10,
        waBg: getComputedStyle(wa).backgroundColor,
        callBg: getComputedStyle(call).backgroundColor,
        waRadius: getComputedStyle(wa).borderTopLeftRadius,
        font: `${getComputedStyle(wa).fontSize} ${getComputedStyle(wa).fontWeight}`,
        numberWidth: (call.querySelector('.floating-number') as HTMLElement).getBoundingClientRect()
          .width,
        waText: (wa.querySelector('.floating-text') as HTMLElement).innerText.trim(),
        callLabel: call.textContent?.replace(/\s+/g, ' ').trim(),
      };
    });
    expect(look.position).toBe('fixed');
    expect(look.bg).toBe('rgb(250, 247, 242)');
    expect(look.borderTop).toBe('1px rgb(230, 223, 213)');
    expect(look.padding).toBe('10px 20px 10px 20px');
    expect(look.height).toBe(69);
    expect(look.bottom).toBe(844);
    expect(look.waH).toBe(48);
    expect(look.callH).toBe(48);
    expect(look.gap).toBe(10);
    expect(look.ratio).toBeCloseTo(1.4, 1);
    expect(look.waBg).toBe('rgb(237, 0, 0)');
    expect(look.callBg).toBe('rgb(20, 17, 16)');
    expect(parseFloat(look.waRadius)).toBeGreaterThanOrEqual(24);
    expect(look.font).toBe('16px 700');
    expect(look.waText).toBe('WhatsApp');
    expect(look.numberWidth).toBeLessThanOrEqual(1);
    // The number stays in the accessible name.
    expect(look.callLabel).toMatch(/^Call \+91/);
    await expect(bar(page).locator('a[href^="tel:+91"]')).toHaveCount(1);
    await expect(bar(page).locator('a[href^="https://wa.me/"]')).toHaveCount(1);
  });

  test('steps aside while the contact band is on screen and returns above it', async ({ page }) => {
    await page.goto('/');
    await scrollToBand(page);
    await expect(bar(page)).toHaveAttribute('data-away', '');
    await expect(bar(page)).toBeHidden();
    // Hidden buttons cannot take focus.
    await bar(page)
      .locator('a')
      .first()
      .focus({ timeout: 500 })
      .catch(() => undefined);
    expect(await page.evaluate(() => !!document.activeElement?.closest('.floating-fixed'))).toBe(
      false,
    );
    expect(await bar(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar(page)).toBeVisible();
    await expect(bar(page)).not.toHaveAttribute('data-away', '');
    await expect.poll(() => bar(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('is hidden while the Menu is open', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-menu-open', '');
    await expect(bar(page)).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(bar(page)).toBeVisible();
  });

  test('the Menu pill stays above the bar', async ({ page }) => {
    await page.goto('/');
    const z = await page.evaluate(() => ({
      bar: Number(
        getComputedStyle(document.querySelector('.floating-fixed') as HTMLElement).zIndex,
      ),
      pill: Number(
        getComputedStyle(document.querySelector('button.menu-pill') as HTMLElement).zIndex,
      ),
    }));
    expect(z.pill).toBeGreaterThan(z.bar);
    expect(z.bar).toBeGreaterThan(0);
  });

  test('does not cover the footer at the bottom or overflow sideways', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(bar(page)).toBeVisible();
    const r = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLElement>('footer a'));
      const last = links[links.length - 1] as HTMLElement;
      return {
        lastBottom: last.getBoundingClientRect().bottom,
        footerBottom: (document.querySelector('footer') as HTMLElement).getBoundingClientRect()
          .bottom,
        barTop: (document.querySelector('.floating-fixed') as HTMLElement).getBoundingClientRect()
          .top,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(r.lastBottom).toBeLessThanOrEqual(r.barTop);
    expect(r.footerBottom).toBeLessThanOrEqual(r.barTop + 1);
    expect(r.scrollWidth).toBeLessThanOrEqual(390);
  });
});

test.describe('phone bottom bar with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('hides and shows without a fade or slide', async ({ page }) => {
    await page.goto('/');
    const transition = await bar(page).evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(transition).toBe('0s');
    await scrollToBand(page);
    await expect(bar(page)).toBeHidden();
  });
});

test.describe('bar at wider widths', () => {
  test('768px keeps the centred two-button bar and never hides', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/');
    await scrollToBand(page);
    await expect(bar(page)).toBeVisible();
    const look = await bar(page).evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        height: el.getBoundingClientRect().height,
        bg: cs.backgroundColor,
        opacity: cs.opacity,
        text: (el.querySelector('.floating-call') as HTMLElement).innerText.trim(),
      };
    });
    expect(look.height).toBe(72);
    expect(look.bg).toBe('rgb(255, 255, 255)');
    expect(look.opacity).toBe('1');
    expect(look.text).toMatch(/^Call \+91/);
  });

  test('1440px keeps the round buttons', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await scrollToBand(page);
    const btn = page.locator('.floating-fixed .floating-btn').first();
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box?.width).toBe(56);
    expect(box?.height).toBe(56);
  });
});
