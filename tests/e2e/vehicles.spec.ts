/**
 * The company's own vehicles on /services/car-coach (client brochures, 2026-11-05): the Toyota
 * Hycross (5 passengers) and the Force Urbania (12), each with photos, features and a WhatsApp
 * button that names the vehicle, with nothing overflowing on a phone.
 */
import { expect, test } from '@playwright/test';

const vehicles = [
  { name: 'Toyota Hycross', seats: '5 passengers', button: 'Ask about the Hycross' },
  { name: 'Force Urbania', seats: '12 passengers', button: 'Ask about the Urbania' },
];

test('the car rental page shows both company vehicles', async ({ page }) => {
  await page.goto('/services/car-coach');
  const section = page.locator('section[aria-labelledby="vehicles-title"]');
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Our premium vehicles');
  const cards = section.locator('.vehicle');
  await expect(cards).toHaveCount(vehicles.length);
  for (const [i, vehicle] of vehicles.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole('heading', { level: 3 })).toHaveText(vehicle.name);
    await expect(card).toContainText(vehicle.seats);
    await expect(card.locator('img')).toHaveCount(3);
    for (const alt of await card
      .locator('img')
      .evaluateAll((els) => els.map((el) => el.getAttribute('alt'))))
      expect(alt?.length ?? 0).toBeGreaterThan(10);
    const ask = card.getByRole('link', { name: new RegExp(vehicle.button) });
    await expect(ask).toHaveAttribute('target', '_blank');
    const href = decodeURIComponent((await ask.getAttribute('href')) ?? '');
    expect(href).toContain(vehicle.name);
  }
});

test('other service pages have no vehicles section', async ({ page }) => {
  await page.goto('/services/hotels');
  await expect(page.locator('section[aria-labelledby="vehicles-title"]')).toHaveCount(0);
});

test('the vehicles section fits a 375px phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/services/car-coach');
  await page.locator('.vehicles').scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
