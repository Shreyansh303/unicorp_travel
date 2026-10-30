/**
 * Staff desks and directors: International, domestic and accounts on /contact, the visa desk only
 * on the visa service page, directors on /about. Nothing in the header, footer or other pages.
 */
import { expect, test } from '@playwright/test';
import { desksFor, mailtoHref, shown, site, telHref } from '../../src/config/site';
import { allRoutes } from '../routes';

const contactDesks = desksFor('contact');
const visaDesks = desksFor('visa-passport');
const visaPath = '/services/visa-passport';

test('the facts list the right desks for each page', () => {
  expect(contactDesks.map((desk) => desk.id)).toEqual(['international', 'domestic', 'accounts']);
  expect(visaDesks.map((desk) => desk.id)).toEqual(['visa']);
});

for (const viewport of [
  { width: 375, height: 800 },
  { width: 768, height: 900 },
  { width: 1366, height: 800 },
]) {
  test.describe(`at ${viewport.width}px`, () => {
    test.use({ viewport });

    test('/contact shows the three desks with tel and mailto links', async ({ page }) => {
      await page.goto('/contact');
      await expect(page.getByRole('heading', { level: 2, name: 'Who to contact' })).toBeVisible();
      for (const desk of contactDesks) {
        const block = page.locator(`[data-desk="${desk.id}"]`);
        await expect(block.getByRole('heading', { name: desk.name })).toBeVisible();
        for (const person of desk.people) {
          const item = block.locator('li', { hasText: person.name });
          await expect(item.locator(`a[href="${telHref(person.phone)}"]`)).toBeVisible();
          await expect(item.locator(`a[href="${mailtoHref(person.email)}"]`)).toBeVisible();
        }
      }
      await expect(page.locator('[data-desk="visa"]')).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });

    test('the visa service page shows the visa desk', async ({ page }) => {
      await page.goto(visaPath);
      await expect(page.getByRole('heading', { name: 'Talk to the visa desk' })).toBeVisible();
      const block = page.locator('[data-desk="visa"]');
      for (const person of visaDesks.flatMap((desk) => desk.people)) {
        const item = block.locator('li', { hasText: person.name });
        await expect(item.locator(`a[href="${telHref(person.phone)}"]`)).toBeVisible();
        await expect(item.locator(`a[href="${mailtoHref(person.email)}"]`)).toBeVisible();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  });
}

test('the visa desk appears on no other page and staff are not in the header or footer', async ({
  page,
}) => {
  const visaOnly = visaDesks.flatMap((desk) => desk.people.map((person) => person.phone.e164));
  for (const path of allRoutes) {
    await page.goto(path);
    if (path !== visaPath) {
      await expect(page.locator('[data-desk="visa"]')).toHaveCount(0);
      for (const e164 of visaOnly) {
        // Shared numbers (such as the approved domestic mobile) may appear elsewhere; the visa
        // staff numbers are their own.
        const approved = [
          site.phones.mobile.value.e164,
          site.phones.secondMobile.value.e164,
          site.phones.thirdMobile.value.e164,
        ];
        if (approved.includes(e164)) continue;
        await expect(page.locator(`a[href="tel:${e164}"]`)).toHaveCount(0);
      }
      await expect(page.locator('a[href="mailto:visa@unicorptravel.com"]')).toHaveCount(0);
    }
    for (const region of ['header', 'footer']) {
      await expect(page.locator(`${region} a[href="mailto:sharad@unicorptravel.com"]`)).toHaveCount(
        0,
      );
      await expect(
        page.locator(`${region} a[href="mailto:domestic@unicorptravel.com"]`),
      ).toHaveCount(0);
    }
  }
});

test('/about shows both directors with their titles', async ({ page }) => {
  await page.goto('/about');
  const directors = shown(site.directors) ?? [];
  expect(directors).toHaveLength(2);
  for (const director of directors) {
    await expect(page.getByText(`${director.name}, ${director.title}`)).toBeVisible();
  }
});

test('the legal name is shown as verified and the new service items are listed', () => {
  expect(site.legalName.status).toBe('verified');
  const items = site.services.flatMap((group) => group.items);
  const names = items.map((item) => item.name);
  expect(names).toContain('Meet and assist at Delhi Airport');
  expect(names).toContain('Air ticketing, domestic and international');
  expect(items.find((item) => item.id === 'support-24x7')?.status).toBe('verified');
});
