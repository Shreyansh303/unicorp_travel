/**
 * The floating Email button beside WhatsApp and Call (client request, 2026-11-04): a mailto link
 * to site.floatingEmail on phones (a round 48px icon), in the 768 to 1439px bar and as a round
 * corner button from 1440px. The Home corporate band has no Email button.
 */
import { expect, test } from '@playwright/test';
import { site } from '../../src/config/site';

const email = site.floatingEmail.value;
const mail = '.floating-fixed .floating-mail';

for (const width of [375, 1024, 1600]) {
  test(`floating Email button at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/services');
    const link = page.locator(mail);
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toMatch(new RegExp(`^mailto:${email}[?]subject=`));
    await expect(link).toHaveAccessibleName('Email');
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    if (width < 768) expect(Math.round(box?.width ?? 0)).toBe(48);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('the Home corporate band has no Email button', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.corp-actions a[href^="mailto:"]')).toHaveCount(0);
});
