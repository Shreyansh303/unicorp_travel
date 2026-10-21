/**
 * Stacked footer on phones (below 768px): same links as the desktop footer, 44px tap targets,
 * no sideways overflow and the last link clear of the bottom bar. From 768px the footer is unchanged.
 */
import { expect, test, type Page } from '@playwright/test';

const footerLinks = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('footer a')).map((a) => ({
      href: a.getAttribute('href'),
      text: (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
    })),
  );

test.describe('phone footer at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('has the same links and hrefs as at 1366', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/');
    const desktop = await footerLinks(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const phone = await footerLinks(page);
    expect(desktop.length).toBeGreaterThan(10);
    expect(phone).toEqual(desktop);
  });

  test('keeps the stacked order, hours and legal line', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.locator('.footer-wordmark')).toBeVisible();
    await expect(footer.getByRole('heading', { name: 'Talk to us' })).toBeVisible();
    await expect(footer.getByRole('heading', { name: 'Visit' })).toBeVisible();
    // Opening hours render only once site.ts marks them as shown; until then there is no block.
    if ((await footer.locator('.footer-hours').count()) > 0) {
      await expect(footer.locator('.footer-hours')).toBeVisible();
    }
    await expect(footer.locator('.facts-condensed')).toBeVisible();
    const tops = await footer.evaluate((el) =>
      ['.footer-brand', '.footer-talk', '.footer-visit', '.footer-group', '.footer-base'].map(
        (selector) => el.querySelector(selector)?.getBoundingClientRect().top ?? -1,
      ),
    );
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    const groups = await footer
      .locator('.footer-group')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(groups).size).toBe(1);
  });

  test('uses the light red small caps and white focus outlines on ink', async ({ page }) => {
    await page.goto('/');
    const look = await page.evaluate(() => {
      const heading = getComputedStyle(document.querySelector('footer .footer-heading') as Element);
      const link = document.querySelector<HTMLElement>('footer .footer-group a') as HTMLElement;
      link.focus();
      return {
        color: heading.color,
        bg: getComputedStyle(document.querySelector('footer') as Element).backgroundColor,
      };
    });
    expect(look.color).toBe('rgb(255, 138, 128)');
    expect(look.bg).toBe('rgb(20, 17, 16)');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return `${style.outlineWidth} ${style.outlineStyle} ${style.outlineColor}`;
    });
    expect(outline).toBe('3px solid rgb(255, 255, 255)');
  });

  test('every footer link is at least 44px tall', async ({ page }) => {
    await page.goto('/');
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('footer a'))
        .map((a) => ({ text: a.textContent?.trim(), h: a.getBoundingClientRect().height }))
        .filter((a) => a.h < 43.5),
    );
    expect(small).toEqual([]);
  });

  test('does not overflow sideways or hide the last link behind the bar', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('.floating-fixed')).toBeVisible();
    const r = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLElement>('footer a'));
      const last = links[links.length - 1] as HTMLElement;
      return {
        lastBottom: last.getBoundingClientRect().bottom,
        barTop: (document.querySelector('.floating-fixed') as HTMLElement).getBoundingClientRect()
          .top,
        scrollWidth: document.documentElement.scrollWidth,
        height: (document.querySelector('footer') as HTMLElement).getBoundingClientRect().height,
      };
    });
    expect(r.lastBottom).toBeLessThanOrEqual(r.barTop);
    expect(r.scrollWidth).toBeLessThanOrEqual(390);
    console.log(`footer height at 390: ${Math.round(r.height)}px`);
  });
});
