import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('home page has no axe violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test.describe('home page on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('has no axe violations, with the first and then another service panel open', async ({
    page,
  }) => {
    // No scroll reveals: axe must not sample a section half way through its fade.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const scan = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
    expect((await scan()).violations).toEqual([]);
    await page.locator('#services .svc-fold-btn').nth(1).click();
    expect((await scan()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Next trip' }).click();
    await expect(page.locator('[data-pager-count]')).toHaveText('2 of 4');
    expect((await scan()).violations).toEqual([]);
  });
});

test.describe('lower Home and an inner page on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Home with the Why row, corporate band and red contact band has no axe violations', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('.why-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.why-grid')).toHaveAttribute('tabindex', '0');
    await page.locator('.corp-photo img').scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('an inner page with the red contact band has no axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/holidays');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
