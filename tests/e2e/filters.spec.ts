/**
 * F-04 holiday filters: every chip narrows the list exactly as the package files say, the query
 * string follows the filters, reload and back/forward restore them, the live region counts the
 * results, the empty state links to Plan my trip, keyboard works, and without JavaScript every
 * package stays listed.
 */
import { expect, test, type Page } from '@playwright/test';
import { budgetBandFor, durationBandFor } from '../../src/lib/packages';
import { packageFacts, type PackageFacts } from '../routes';

type Group = 'type' | 'region' | 'duration' | 'budget' | 'theme';

/** The facet value of a package for one filter group, from the package file. */
function facets(pkg: PackageFacts, group: Group): string[] {
  switch (group) {
    case 'type':
      return [pkg.type];
    case 'region':
      return [pkg.region];
    case 'duration':
      return [durationBandFor(pkg.days).id];
    case 'budget':
      return [budgetBandFor(pkg.fromPrice).id];
    case 'theme':
      return pkg.themes;
  }
}

function expected(filters: Partial<Record<Group, string[]>>): string[] {
  return packageFacts
    .filter((pkg) =>
      (Object.entries(filters) as [Group, string[]][]).every(
        ([group, values]) =>
          values.length === 0 || values.some((value) => facets(pkg, group).includes(value)),
      ),
    )
    .map((pkg) => pkg.slug)
    .sort();
}

async function open(page: Page, path = '/holidays') {
  await page.goto(path);
  await page.locator('[data-holiday-filters][data-bound]').waitFor({ state: 'attached' });
}

async function visibleSlugs(page: Page): Promise<string[]> {
  const slugs = await page
    .locator('[data-package]:visible')
    .evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset['package'] ?? ''));
  return slugs.sort();
}

function chip(page: Page, group: Group, value: string) {
  return page.locator(`[data-chips="${group}"] [data-chip][value="${value}"]`);
}

const total = packageFacts.length;
const count = (page: Page) => page.locator('[data-filter-count]');

test('duration bands break at 5/6 and 7/8 days', () => {
  const ids = [1, 5, 6, 7, 8, 14].map((days) => durationBandFor(days).id);
  expect(ids).toEqual(['short', 'short', 'week', 'week', 'long', 'long']);
});

test.describe('holiday filters', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('every chip narrows the list to the matching packages and updates the URL', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await open(page);
    await expect(count(page)).toHaveText(`Showing ${total} of ${total} holidays`);
    expect(await visibleSlugs(page)).toEqual(packageFacts.map((pkg) => pkg.slug).sort());

    for (const group of ['type', 'region', 'duration', 'budget', 'theme'] as const) {
      const values = await page
        .locator(`[data-chips="${group}"] [data-chip]`)
        .evaluateAll((chips) => chips.map((item) => (item as HTMLButtonElement).value));
      expect(values.length, group).toBeGreaterThan(0);
      for (const value of values) {
        await chip(page, group, value).click();
        await expect(chip(page, group, value)).toHaveAttribute('aria-pressed', 'true');
        const want = expected({ [group]: [value] });
        expect(want.length, `${group}=${value} has packages`).toBeGreaterThan(0);
        expect(await visibleSlugs(page), `${group}=${value}`).toEqual(want);
        expect(new URL(page.url()).searchParams.getAll(group)).toEqual([value]);
        await expect(count(page)).toHaveText(`Showing ${want.length} of ${total} holidays`);
        await chip(page, group, value).click();
        await expect(count(page)).toHaveText(`Showing ${total} of ${total} holidays`);
      }
    }
    expect(new URL(page.url()).search).toBe('');
  });

  test('choices combine: any within a group, all across groups', async ({ page }) => {
    await open(page);
    await chip(page, 'type', 'domestic').click();
    await chip(page, 'theme', 'beach').click();
    await chip(page, 'theme', 'wildlife').click();
    const want = expected({ type: ['domestic'], theme: ['beach', 'wildlife'] });
    expect(await visibleSlugs(page)).toEqual(want);
    const params = new URL(page.url()).searchParams;
    expect(params.getAll('type')).toEqual(['domestic']);
    expect(params.getAll('theme').sort()).toEqual(['beach', 'wildlife']);
    await expect(count(page)).toHaveText(`Showing ${want.length} of ${total} holidays`);
    await expect(count(page)).toHaveAttribute('role', 'status');
  });

  test('a shared link and a reload restore the filters', async ({ page }) => {
    await open(page, '/holidays?type=international&duration=week');
    const want = expected({ type: ['international'], duration: ['week'] });
    expect(await visibleSlugs(page)).toEqual(want);
    await expect(chip(page, 'type', 'international')).toHaveAttribute('aria-pressed', 'true');
    await expect(chip(page, 'duration', 'week')).toHaveAttribute('aria-pressed', 'true');
    await chip(page, 'budget', '40k-75k').click();
    await page.reload();
    await page.locator('[data-holiday-filters][data-bound]').waitFor({ state: 'attached' });
    expect(await visibleSlugs(page)).toEqual(
      expected({ type: ['international'], duration: ['week'], budget: ['40k-75k'] }),
    );
    await expect(chip(page, 'budget', '40k-75k')).toHaveAttribute('aria-pressed', 'true');
  });

  test('back and forward restore the previous filter states without reloading', async ({
    page,
  }) => {
    await open(page);
    await page.evaluate(() => {
      (window as unknown as { marker: boolean }).marker = true;
    });
    await chip(page, 'type', 'domestic').click();
    await chip(page, 'region', 'himalaya').click();
    expect(await visibleSlugs(page)).toEqual(
      expected({ type: ['domestic'], region: ['himalaya'] }),
    );

    await page.goBack();
    await expect(chip(page, 'region', 'himalaya')).toHaveAttribute('aria-pressed', 'false');
    expect(await visibleSlugs(page)).toEqual(expected({ type: ['domestic'] }));
    expect(new URL(page.url()).searchParams.getAll('type')).toEqual(['domestic']);

    await page.goBack();
    await expect(chip(page, 'type', 'domestic')).toHaveAttribute('aria-pressed', 'false');
    await expect(count(page)).toHaveText(`Showing ${total} of ${total} holidays`);
    expect(new URL(page.url()).search).toBe('');

    await page.goForward();
    await expect(chip(page, 'type', 'domestic')).toHaveAttribute('aria-pressed', 'true');
    expect(await visibleSlugs(page)).toEqual(expected({ type: ['domestic'] }));
    // The page itself never reloaded or swapped.
    expect(await page.evaluate(() => (window as unknown as { marker?: boolean }).marker)).toBe(
      true,
    );
  });

  test('back to the previous page still works after filtering', async ({ page }) => {
    await page.goto('/');
    await page.locator('main a[href="/holidays"]').first().click();
    await page.waitForURL('**/holidays');
    await page.locator('[data-holiday-filters][data-bound]').waitFor({ state: 'attached' });
    await chip(page, 'type', 'domestic').click();
    await page.goBack();
    await page.goBack();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('no match shows the empty state with a working Plan my trip link and a clear button', async ({
    page,
  }) => {
    await open(page);
    // An international trip in South India cannot exist.
    await chip(page, 'type', 'international').click();
    await chip(page, 'region', 'south-india').click();
    expect(expected({ type: ['international'], region: ['south-india'] })).toEqual([]);
    const empty = page.locator('[data-filter-empty]');
    await expect(empty).toBeVisible();
    await expect(count(page)).toHaveText(`Showing 0 of ${total} holidays`);
    expect(await visibleSlugs(page)).toEqual([]);

    await empty.getByRole('button', { name: 'Clear filters' }).click();
    await expect(empty).toBeHidden();
    await expect(count(page)).toHaveText(`Showing ${total} of ${total} holidays`);
    expect(new URL(page.url()).search).toBe('');

    await page.goBack();
    await expect(empty).toBeVisible();
    await empty.getByRole('link', { name: 'Plan my trip' }).click();
    await page.waitForURL('**/plan-my-trip');
    await expect(page.locator('h1')).toContainText('Plan my');
  });

  test('the clear filters control resets every group', async ({ page }) => {
    await open(page, '/holidays?type=domestic&theme=family&budget=under-40k');
    const clear = page.locator('[data-holiday-filters] [data-filters-clear]');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(clear).toBeHidden();
    await expect(page.locator('[data-chip][aria-pressed="true"]')).toHaveCount(0);
    await expect(count(page)).toHaveText(`Showing ${total} of ${total} holidays`);
  });

  test('chips work with the keyboard', async ({ page }) => {
    await open(page);
    const domestic = chip(page, 'type', 'domestic');
    await domestic.focus();
    await page.keyboard.press('Space');
    await expect(domestic).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab');
    await expect(chip(page, 'type', 'international')).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await visibleSlugs(page)).toEqual(expected({ type: ['domestic', 'international'] }));
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    expect(await visibleSlugs(page)).toEqual(expected({ type: ['international'] }));
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the filters open from a toggle and still filter', async ({ page }) => {
    await open(page);
    const toggle = page.locator('[data-filters-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(chip(page, 'type', 'domestic')).toBeHidden();
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await chip(page, 'type', 'domestic').click();
    expect(await visibleSlugs(page)).toEqual(expected({ type: ['domestic'] }));
    await expect(toggle).toContainText('(1 on)');
  });

  test('a shared link opens the panel with its filters', async ({ page }) => {
    await open(page, '/holidays?theme=family');
    await expect(page.locator('[data-filters-toggle]')).toHaveAttribute('aria-expanded', 'true');
    await expect(chip(page, 'theme', 'family')).toBeVisible();
  });
});

test('without JavaScript every package is listed and the filters are hidden', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/holidays?type=domestic');
  await expect(page.locator('[data-package]')).toHaveCount(total);
  for (const item of await page.locator('[data-package]').all()) await expect(item).toBeVisible();
  await expect(page.locator('[data-holiday-filters]')).toBeHidden();
  await expect(page.locator('[data-filter-empty]')).toBeHidden();
  await context.close();
});
