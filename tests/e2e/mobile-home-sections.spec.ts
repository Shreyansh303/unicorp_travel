/**
 * Home Services accordion and Trips pager on phones (below 768px). From 768px both are the
 * grids they always were: no accordion button, no pager controls.
 */
import { expect, test, type Page } from '@playwright/test';

const GROUPS = ['Leisure travel', 'Corporate travel', 'Travel-related services'];

const rows = (page: Page) => page.locator('#services .svc-fold-btn');
const cards = (page: Page) => page.locator('#packages .pkg-cell');
const count = (page: Page) => page.locator('[data-pager-count]');

/** The hrefs of the package links in the Trips section, in order. */
async function tripHrefs(page: Page): Promise<(string | null)[]> {
  return page
    .locator('#packages .pkg-cell .pkg-name a')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
}

test.describe('phone Services accordion at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('three rows, the first open, panels stay in the DOM', async ({ page }) => {
    await page.goto('/');
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page)).toHaveText(GROUPS);
    await expect(rows(page).nth(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'false');
    await expect(rows(page).nth(2)).toHaveAttribute('aria-expanded', 'false');
    for (let i = 0; i < 3; i += 1) {
      const button = rows(page).nth(i);
      const panelId = await button.getAttribute('aria-controls');
      const panel = page.locator(`#${panelId}`);
      await expect(panel).toHaveCount(1);
      await expect(panel).toHaveAttribute('role', 'region');
      await expect(panel).toHaveAttribute(
        'aria-labelledby',
        (await button.getAttribute('id')) ?? '',
      );
      // A closed panel is hidden but its text is still in the page.
      expect(((await panel.textContent()) ?? '').trim().length).toBeGreaterThan(20);
      expect(await panel.isVisible()).toBe(i === 0);
      expect(Math.round((await button.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(64);
    }
  });

  test('opening one row closes the others, and a row closes again', async ({ page }) => {
    await page.goto('/');
    await rows(page).nth(1).click();
    await expect(rows(page).nth(0)).toHaveAttribute('aria-expanded', 'false');
    await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#services [data-fold-body]').nth(1)).toBeVisible();
    await expect(page.locator('#services [data-fold-body]').nth(0)).toBeHidden();
    await rows(page).nth(1).click();
    await expect(rows(page).nth(1)).toHaveAttribute('aria-expanded', 'false');
  });

  test('an open panel holds the description, wrapped chips, the link and the sample label', async ({
    page,
  }) => {
    await page.goto('/');
    await rows(page).nth(1).click();
    const panel = page.locator('#services [data-fold-body]').nth(1);
    await expect(panel.locator('.svc-text')).toBeVisible();
    expect(await panel.locator('.svc-items li').count()).toBeGreaterThan(2);
    const chip = await panel
      .locator('.svc-items li')
      .first()
      .evaluate((el) => {
        const css = getComputedStyle(el);
        return { border: css.borderTopColor, radius: parseFloat(css.borderTopLeftRadius) };
      });
    expect(chip.border).toBe('rgb(207, 199, 189)');
    expect(chip.radius).toBeGreaterThan(15);
    await expect(panel.locator('a.svc-go')).toHaveAttribute('href', '/corporate-travel');
    await expect(panel.locator('.sample-label')).toBeVisible();
    // The lede above the rows is hidden; the heading stays.
    await expect(page.locator('#services .svc-head > p')).toBeHidden();
    await expect(page.getByRole('heading', { name: /Holidays first/ })).toBeVisible();
  });

  test('the links to the group pages are all still there', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('#services [data-fold-body] a.svc-go')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/holidays', '/corporate-travel', '/services']);
  });

  test('the plus turns into a cross when a row is open', async ({ page }) => {
    await page.goto('/');
    const rotated = (index: number) =>
      rows(page)
        .nth(index)
        .locator('.svc-plus')
        .evaluate((el) => getComputedStyle(el).transform);
    await expect.poll(() => rotated(0)).not.toBe('none');
    await expect.poll(() => rotated(1)).toBe('none');
  });

  test('the toggle is a keyboard control', async ({ page }) => {
    await page.goto('/');
    await rows(page).nth(2).focus();
    await page.keyboard.press('Enter');
    await expect(rows(page).nth(2)).toHaveAttribute('aria-expanded', 'true');
    await expect(rows(page).nth(0)).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('phone Trips pager at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows one 350x380 card at a time with a 1 of 4 counter', async ({ page }) => {
    await page.goto('/');
    await expect(count(page)).toHaveText('1 of 4');
    await expect(count(page)).toHaveAttribute('aria-live', 'polite');
    const first = await cards(page).first().locator('.pkg-card').boundingBox();
    expect(Math.round(first?.width ?? 0)).toBe(350);
    expect(Math.round(first?.height ?? 0)).toBe(380);
    const radius = await cards(page)
      .first()
      .locator('.pkg-card')
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(radius).toBe('24px');
    const inView = await page.locator('#packages .pkg-cell').evaluateAll((items) =>
      items.map((el) => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= window.innerWidth;
      }),
    );
    expect(inView).toEqual([true, false, false, false]);
    const photo = cards(page).first().locator('img');
    expect(await photo.evaluate((el) => getComputedStyle(el).objectFit)).toBe('cover');
    await expect(photo).toHaveAttribute('alt', /.+/);
  });

  test('the white panel carries region, name, price and note; label and valid-to are hidden', async ({
    page,
  }) => {
    await page.goto('/');
    const card = cards(page).first().locator('.pkg-card');
    await expect(card.locator('.pkg-meta')).toBeVisible();
    await expect(card.locator('.pkg-name')).toBeVisible();
    await expect(card.locator('.pkg-price')).toContainText('from');
    await expect(card.locator('.pkg-basis')).toBeVisible();
    await expect(card.locator('.pkg-valid')).toBeHidden();
    await expect(card.locator('.sample-label')).toBeHidden();
    const panel = await card.locator('.pkg-body').evaluate((el) => {
      const css = getComputedStyle(el);
      return { bg: css.backgroundColor, radius: css.borderTopLeftRadius, pad: css.paddingTop };
    });
    expect(panel).toEqual({ bg: 'rgb(255, 255, 255)', radius: '16px', pad: '16px' });
  });

  test('next and previous wrap around and the counter follows', async ({ page }) => {
    await page.goto('/');
    const next = page.getByRole('button', { name: 'Next trip' });
    const prev = page.getByRole('button', { name: 'Previous trip' });
    const box = async () => Math.round((await next.boundingBox())?.width ?? 0);
    expect(await box()).toBe(48);
    await next.click();
    await expect(count(page)).toHaveText('2 of 4');
    await next.click();
    await expect(count(page)).toHaveText('3 of 4');
    await next.click();
    await expect(count(page)).toHaveText('4 of 4');
    await next.click();
    await expect(count(page)).toHaveText('1 of 4');
    await prev.click();
    await expect(count(page)).toHaveText('4 of 4');
    await prev.click();
    await expect(count(page)).toHaveText('3 of 4');
    // The card on show is the one the counter names.
    const visible = await page.locator('#packages .pkg-cell').evaluateAll((items) =>
      items.findIndex((el) => {
        const box = el.getBoundingClientRect();
        return box.left >= -1 && box.right <= window.innerWidth + 1;
      }),
    );
    expect(visible).toBe(2);
  });

  test('swiping the row moves the counter', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-pager-track]').evaluate((el) => {
      el.scrollTo({ left: el.scrollWidth, behavior: 'instant' });
    });
    await expect(count(page)).toHaveText('4 of 4');
  });

  test('every card stays in the DOM as a link with the same hrefs as the desktop grid', async ({
    page,
  }) => {
    await page.goto('/');
    const phoneHrefs = await tripHrefs(page);
    expect(phoneHrefs).toHaveLength(4);
    phoneHrefs.forEach((href) => expect(href).toMatch(/^\/holidays\/.+/));
    await page.setViewportSize({ width: 1366, height: 900 });
    expect(await tripHrefs(page)).toEqual(phoneHrefs);
  });

  test('the footnote carries the sample label; See all holidays follows', async ({ page }) => {
    await page.goto('/');
    const note = page.locator('#packages .pkg-note');
    await expect(note).toBeVisible();
    await expect(note.locator('.sample-label')).toBeVisible();
    await expect(note).toContainText('Sample trips to show the idea');
    await expect(page.locator('#packages .pkg-head > p')).toBeHidden();
    await expect(page.locator('#packages .pkg-route')).toBeHidden();
    const noteBox = await note.boundingBox();
    const link = page.getByRole('link', { name: 'See all holidays' });
    await expect(link).toHaveAttribute('href', '/holidays');
    expect((await link.boundingBox())?.y ?? 0).toBeGreaterThan(
      (noteBox?.y ?? 0) + (noteBox?.height ?? 0) - 1,
    );
  });

  test('photos are sized for a phone', async ({ page }) => {
    await page.goto('/');
    const sizes = await cards(page).first().locator('source').first().getAttribute('sizes');
    expect(sizes).toContain('calc(100vw - 2.5rem)');
    expect(sizes).toContain('(min-width: 1024px) 22vw');
  });
});

test.describe('phone Home sections have no sideways overflow', () => {
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

test.describe('Home sections at 1366x900', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('no accordion button, no pager controls, the grids as before', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.svc-fold-btn')).toHaveCount(0);
    await expect(page.locator('#services a.svc-go')).toHaveCount(0);
    await expect(page.locator('[data-pager-controls]')).toBeHidden();
    await expect(page.locator('#services [data-fold-body]:visible')).toHaveCount(3);
    await expect(page.locator('#services .svc-head > p')).toBeVisible();
    await expect(page.locator('#packages .pkg-head > p')).toBeVisible();
    await expect(page.locator('#packages .pkg-note')).toBeHidden();
    await expect(page.locator('#packages .pkg-cell .sample-label')).toHaveCount(4);
    for (const label of await page.locator('#packages .pkg-cell .sample-label').all()) {
      await expect(label).toBeVisible();
    }
    const inView = await page
      .locator('#packages .pkg-cell')
      .evaluateAll((items) => items.map((el) => el.getBoundingClientRect().right <= 1366));
    expect(inView).toEqual([true, true, true, true]);
    // Each service card is still one link over the whole card.
    const link = page.locator('#services .svc-title a').first();
    await expect(link).toHaveAttribute('href', '/holidays');
    const card = await page.locator('#services .svc-card').first().boundingBox();
    const after = await link.evaluate((el) => {
      const css = getComputedStyle(el, '::after');
      return { position: css.position, content: css.content };
    });
    expect(after.position).toBe('absolute');
    expect(after.content).not.toBe('none');
    expect(card?.width ?? 0).toBeGreaterThan(300);
  });

  test('resizing from a phone to a desktop width removes the accordion and the controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(rows(page)).toHaveCount(3);
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('[data-pager-controls]')).toBeHidden();
    await expect(page.locator('#services [data-fold-body]:visible')).toHaveCount(3);
    await expect(page.locator('#services .svc-title a')).toHaveCount(3);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(rows(page)).toHaveCount(3);
  });
});
