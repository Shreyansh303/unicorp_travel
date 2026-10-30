import { expect, test } from '@playwright/test';
import { listedPhones, shown, site } from '../../src/config/site';
import {
  allRoutes,
  demoLegalRoutes,
  packageRoutes,
} from '../routes';

// astro.config.mjs reads SITE_URL; without it pages must not invent canonical or OG URLs.
const siteUrl = process.env['SITE_URL']?.trim() || null;
const mobile = shown(site.phones.mobile);
const office = shown(site.offices.operating);
const footerPhones = listedPhones().map((entry) => entry.phone);

test.describe('every page', () => {
  for (const path of allRoutes) {
    test(`${path} renders with SEO basics, an enquiry option and the shared facts`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');

      // One H1, a title with the brand, a description.
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      // Home leads with the brand so a narrow tab still shows it; every other page ends with it.
      await expect(page).toHaveTitle(
        new RegExp(path === '/' ? `^${site.displayName} [|] ` : `${site.displayName}$`),
      );
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0).toBeGreaterThanOrEqual(50);

      // Open Graph.
      const og = (property: string) => page.locator(`meta[property="${property}"]`);
      await expect(og('og:title')).toHaveAttribute('content', await page.title());
      await expect(og('og:description')).toHaveAttribute('content', description ?? '');
      await expect(og('og:type')).toHaveAttribute('content', /^(website|article)$/);
      await expect(og('og:locale')).toHaveAttribute('content', 'en_IN');
      await expect(og('og:site_name')).toHaveAttribute('content', site.displayName);
      if (siteUrl) {
        const expected = new URL(path, siteUrl).href;
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expected);
        await expect(og('og:url')).toHaveAttribute('content', expected);
        const image = (await og('og:image').getAttribute('content')) ?? '';
        expect(new URL(image).origin).toBe(new URL(siteUrl).origin);
      } else {
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
        await expect(og('og:url')).toHaveCount(0);
        await expect(og('og:image')).toHaveCount(0);
      }

      // Inner pages have breadcrumbs.
      if (path !== '/') {
        await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
      }

      // The page ends with an enquiry option that has working WhatsApp and call links.
      const enquiry = page.locator('[data-enquiry]');
      await expect(enquiry).toHaveCount(1);
      await expect(enquiry).toBeVisible();
      if (mobile) {
        const digits = mobile.e164.replace(/^\+/, '');
        const wa = enquiry.locator('a[href^="https://wa.me/"]').first();
        const waHref = new URL((await wa.getAttribute('href')) ?? '');
        expect(waHref.pathname).toBe(`/${digits}`);
        expect(waHref.searchParams.get('text')).toContain(site.displayName);
        await expect(enquiry.locator(`a[href="tel:${mobile.e164}"]`).first()).toBeVisible();
      }
      // Nothing after the enquiry band inside main.
      expect(
        await page.evaluate(() => {
          const band = document.querySelector('[data-enquiry]');
          return band?.parentElement?.tagName === 'MAIN' && band.nextElementSibling === null;
        }),
      ).toBe(true);

      // Footer address and phones match site.ts exactly, so they are identical on every page.
      const footer = page.locator('footer');
      if (office) {
        await expect(footer.locator('address span')).toHaveText(office.lines);
      }
      const telLinks = footer.locator('a[href^="tel:"]');
      await expect(telLinks).toHaveText(footerPhones.map((phone) => phone.display));
      for (const [index, phone] of footerPhones.entries()) {
        await expect(telLinks.nth(index)).toHaveAttribute('href', `tel:${phone.e164}`);
      }

      // Floating WhatsApp and call buttons (F-02).
      await expect(page.locator('.floating-fixed a[href^="https://wa.me/"]')).toHaveCount(1);

      // Sample content is blocked from production by the build, not labelled on the page.
      await expect(page.locator('body')).not.toContainText('Sample content');

      if (demoLegalRoutes.includes(path)) {
        await expect(page.locator('main')).toContainText('Draft, pending legal review');
      }
    });
  }
});

test('titles, descriptions and WhatsApp messages are unique across all pages', async ({ page }) => {
  test.setTimeout(120_000);
  const seen = { title: new Map<string, string>(), description: new Map<string, string>() };
  const messages = new Map<string, string>();
  const duplicates: string[] = [];
  const note = (kind: string, map: Map<string, string>, value: string, path: string) => {
    if (map.has(value)) duplicates.push(`${kind} "${value}" on ${map.get(value)} and ${path}`);
    map.set(value, path);
  };
  for (const path of [...allRoutes, '/no-such-page']) {
    await page.goto(path);
    if (path !== '/no-such-page') {
      note('title', seen.title, await page.title(), path);
      const description =
        (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      note('description', seen.description, description, path);
    }
    // The floating WhatsApp button asks about this page (F-02).
    const href = await page
      .locator('.floating-fixed a[href^="https://wa.me/"]')
      .getAttribute('href');
    const message = new URL(href ?? '').searchParams.get('text') ?? '';
    expect(message, path).toMatch(new RegExp(`^Hello ${site.displayName}, `));
    note('WhatsApp message', messages, message, path);
  }
  expect(duplicates).toEqual([]);
  expect(seen.title.size).toBe(allRoutes.length);
});

test.describe('header', () => {
  // The six links and the call button stay on one row at every desktop width (P-22).
  for (const width of [1024, 1100, 1215, 1279, 1280, 1366]) {
    test(`stays one row at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const nav = page.getByRole('navigation', { name: 'Main', exact: true });
      await expect(nav).toBeVisible();
      const report = await page.evaluate(() => {
        const row = document.querySelector<HTMLElement>('.site-header .header-row');
        const links = Array.from(
          document.querySelectorAll<HTMLElement>('.site-header .nav-desktop .nav-link'),
        );
        const actions = document.querySelector<HTMLElement>('.site-header .header-actions');
        const call = actions?.querySelector<HTMLElement>('.btn');
        const navBox = document.querySelector('.site-header .nav-desktop')?.getBoundingClientRect();
        return {
          rowHeight: row?.getBoundingClientRect().height ?? 0,
          tallestLink: Math.max(...links.map((link) => link.getBoundingClientRect().height)),
          callHeight: call?.getBoundingClientRect().height ?? 0,
          navRight: navBox?.right ?? 0,
          actionsLeft: actions?.getBoundingClientRect().left ?? 0,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      // One row is 72px (4.5rem); links and the call button are one 44px line each.
      expect(report.rowHeight).toBeLessThanOrEqual(72.5);
      expect(report.tallestLink).toBeLessThanOrEqual(44.5);
      expect(report.callHeight).toBeLessThanOrEqual(44.5);
      expect(report.navRight).toBeLessThanOrEqual(report.actionsLeft);
      expect(report.overflow).toBeLessThanOrEqual(0);
    });
  }
});

test('an unknown path shows the 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('wrong turn');
  const main = page.locator('main');
  for (const href of ['/services', '/holidays', '/contact', '/plan-my-trip']) {
    await expect(main.locator(`a[href="${href}"]`).first()).toBeVisible();
  }
  await expect(page.locator('[data-enquiry]')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('the routes cover every collection entry', () => {
  // 8 sample packages, 10 travel-related services and 2 legal pages at the time of writing.
  expect(packageRoutes.length).toBeGreaterThanOrEqual(6);
  expect(allRoutes.filter((path) => path.startsWith('/services/')).length).toBe(
    site.services.find((group) => group.id === 'related')?.items.length,
  );
});
