/**
 * F-13 Plan my trip: a keyboard-only run through all five steps to the summary and the
 * hand-off, each step blocking Next until it is valid, the draft surviving a refresh (session
 * storage) and cleared after sending, and Back keeping every answer.
 */
import { expect, test, type Page, type Request } from '@playwright/test';
import { shown, site } from '../../src/config/site';
import { focusedId, futureDate, mailtoParts, tabTo, whatsappText } from '../keyboard';

const storageKey = 'unicorp-travel:plan-my-trip';
const mobile = shown(site.phones.mobile);

async function open(page: Page) {
  await page.goto('/plan-my-trip');
  // The island hydrates when it comes into view.
  await page.locator('#planner').scrollIntoViewIfNeeded();
  await page.locator('[data-planner][data-ready]').waitFor({ state: 'attached' });
}

const heading = (page: Page) => page.locator('#plan-step-title');
const next = (page: Page) => page.locator('.plan-form button[type="submit"]');
const back = (page: Page) => page.getByRole('button', { name: 'Back', exact: true });

async function expectStep(page: Page, number: number) {
  await expect(heading(page)).toContainText(`Step ${number} of 5`);
  await expect(heading(page)).toBeFocused();
}

function draft(page: Page) {
  return page.evaluate((key) => sessionStorage.getItem(key), storageKey);
}

test('keyboard only: all five steps, the summary and the hand-off', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  await expect(heading(page)).toContainText('Step 1 of 5');
  await expect(page.locator('.plan-stepper [aria-current="step"]')).toContainText('Trip type');

  // 1. Trip type
  await tabTo(page, '#plan-tripType-0');
  await page.keyboard.press('Space');
  await tabTo(page, '.plan-form button[type="submit"]');
  await page.keyboard.press('Enter');
  await expectStep(page, 2);
  await expect(page.locator('.plan-stepper .step-done')).toHaveCount(1);

  // 2. Destinations
  await page.keyboard.press('Tab');
  expect(await focusedId(page)).toBe('plan-destinations');
  await page.keyboard.type('Kerala and Coorg');
  await tabTo(page, '#plan-regions-0');
  await page.keyboard.press('Space');
  await expect(page.locator('#plan-regions-0')).toHaveAttribute('aria-pressed', 'true');
  await tabTo(page, '.plan-form button[type="submit"]');
  await page.keyboard.press('Enter');
  await expectStep(page, 3);

  // 3. Dates (the headless browser cannot type into date fields, so the rough timing is used)
  await tabTo(page, '#plan-timing');
  await page.keyboard.type('The last week of December');
  await page.keyboard.press('Tab');
  expect(await focusedId(page)).toBe('plan-flexibility-0');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#plan-flexibility-1')).toBeChecked();
  await tabTo(page, '.plan-form button[type="submit"]');
  await page.keyboard.press('Enter');
  await expectStep(page, 4);

  // 4. Travellers, budget and interests
  await tabTo(page, '#plan-children');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('1');
  await tabTo(page, '#plan-budget');
  await page.keyboard.press('ArrowDown');
  await tabTo(page, '#plan-interests-1');
  await page.keyboard.press('Space');
  await tabTo(page, '.plan-form button[type="submit"]');
  await page.keyboard.press('Enter');
  await expectStep(page, 5);

  // 5. Contact and consent
  await tabTo(page, '#plan-name');
  await page.keyboard.type('Neha Kapoor');
  await page.keyboard.press('Tab');
  await page.keyboard.type('+91 88262 06177');
  await page.keyboard.press('Tab');
  await page.keyboard.type('neha@example.com');
  await page.keyboard.press('Tab');
  expect(await focusedId(page)).toBe('plan-consent');
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  expect(await focusedId(page)).toBe('plan-marketing');
  await expect(page.locator('#plan-marketing')).not.toBeChecked();
  await expect(page.locator('#plan-notice')).toContainText('kept in this browser tab');
  await expect(page.locator('#plan-notice')).toContainText('does not send them anywhere');
  await expect(page.locator('#plan-notice')).not.toContainText('does not store');
  await tabTo(page, '.plan-form button[type="submit"]');
  await expect(next(page)).toHaveText(/Check my answers/);
  await page.keyboard.press('Enter');

  // Summary
  await expect(heading(page)).toContainText('Check your request');
  await expect(heading(page)).toBeFocused();
  const summary = page.locator('.plan-summary');
  for (const text of [
    'A holiday',
    'Kerala and Coorg',
    'South India',
    'The last week of December',
    'A few days either way',
    '2 adults, 1 child, 1 room',
    'Under ₹40,000 per person',
    'Family',
    'Neha Kapoor',
    '+91 88262 06177',
    'neha@example.com',
  ]) {
    await expect(summary).toContainText(text);
  }
  expect(await draft(page)).not.toBeNull();

  // Send, with no network request.
  const requests: Request[] = [];
  page.on('request', (request) => requests.push(request));
  await tabTo(page, '.plan-form button[type="submit"]');
  await expect(next(page)).toHaveText(/Send request/);
  await page.keyboard.press('Enter');

  await expect(heading(page)).toHaveText('Your trip request is ready to send');
  await expect(heading(page)).toBeFocused();
  expect(requests.filter((request) => request.resourceType() !== 'image')).toEqual([]);
  expect(await draft(page)).toBeNull();

  const expected = [
    'Hello Unicorp Travel, I would like to plan a trip.',
    'Name: Neha Kapoor',
    'Phone: +91 88262 06177',
    'Email: neha@example.com',
    'Trip type: A holiday',
    'Destination ideas: Kerala and Coorg',
    'Regions: South India',
    'Roughly when: The last week of December',
    'Flexibility: A few days either way',
    'Travellers: 2 adults, 1 child, 1 room',
    'Interests: Family',
    'Consent to reply: Yes',
    'Travel ideas and offers: No',
    'Sent from: /plan-my-trip',
  ];
  const whatsapp = page.locator('[data-planner]').getByRole('link', { name: /Send on WhatsApp/ });
  await expect(whatsapp).toHaveCount(1);
  const text = whatsappText(await whatsapp.getAttribute('href'));
  for (const line of expected) expect(text).toContain(line);

  const emailLink = page.locator('[data-planner]').getByRole('link', { name: 'Email instead' });
  await expect(emailLink).toHaveCount(1);
  const mail = mailtoParts(await emailLink.getAttribute('href'));
  expect(mail.subject).toBe('Plan my trip: Neha Kapoor');
  for (const line of expected) expect(mail.body).toContain(line);
});

test('the planner does not animate a step change under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await page.locator('#plan-tripType-0').check();
  await next(page).click();
  await expectStep(page, 2);
  expect(await page.locator('.plan-panel').evaluate((panel) => panel.getAnimations().length)).toBe(
    0,
  );
});

test('each step blocks Next until it is valid and focuses the first problem', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);

  await next(page).click();
  await expect(heading(page)).toContainText('Step 1 of 5');
  await expect(page.locator('#plan-tripType-0')).toBeFocused();
  await expect(page.locator('#plan-tripType-error')).toContainText('Choose the kind of trip');
  await expect(page.locator('#plan-tripType')).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#plan-tripType-1').check();
  await expect(page.locator('#plan-tripType-error')).toHaveCount(0);
  await next(page).click();

  await expectStep(page, 2);
  await next(page).click();
  await expect(heading(page)).toContainText('Step 2 of 5');
  await expect(page.locator('#plan-destinations')).toBeFocused();
  await expect(page.locator('#plan-destinations')).toHaveAttribute(
    'aria-describedby',
    /plan-destinations-error/,
  );
  // A region on its own is enough.
  await page.locator('#plan-regions-2').click();
  await next(page).click();

  await expectStep(page, 3);
  await next(page).click();
  await expect(page.locator('#plan-departDate')).toBeFocused();
  await expect(page.locator('#plan-flexibility-error')).toBeVisible();
  await page.locator('#plan-departDate').fill('2020-05-01');
  await page.locator('#plan-flexibility-0').check();
  await next(page).click();
  await expect(page.locator('#plan-departDate-error')).toContainText('today or a later date');
  const leave = futureDate(50);
  const comeBack = futureDate(45);
  await page.locator('#plan-departDate').fill(leave.iso);
  await page.locator('#plan-returnDate').fill(comeBack.iso);
  await next(page).click();
  await expect(page.locator('#plan-returnDate')).toBeFocused();
  await expect(page.locator('#plan-returnDate-error')).toContainText('on or after');
  await page.locator('#plan-returnDate').fill(futureDate(57).iso);
  await next(page).click();

  await expectStep(page, 4);
  await page.locator('#plan-adults').fill('0');
  await next(page).click();
  await expect(page.locator('#plan-adults')).toBeFocused();
  await expect(page.locator('#plan-budget-error')).toBeVisible();
  await page.locator('#plan-adults').fill('3');
  await next(page).click();
  await expect(page.locator('#plan-budget')).toBeFocused();
  await page.locator('#plan-budget').selectOption('not-sure');
  await next(page).click();

  await expectStep(page, 5);
  await next(page).click();
  await expect(page.locator('#plan-name')).toBeFocused();
  await expect(page.locator('#plan-consent-error')).toBeVisible();
  await page.locator('#plan-name').fill('Kabir Singh');
  await page.locator('#plan-phone').fill('12345');
  await page.locator('#plan-email').fill('kabir@');
  await next(page).click();
  await expect(page.locator('#plan-phone')).toBeFocused();
  await expect(page.locator('#plan-phone-error')).toContainText('10-digit mobile');
  await expect(page.locator('#plan-email-error')).toContainText('email address');
  await page.locator('#plan-phone').fill('0120 5109212');
  await page.locator('#plan-email').fill('kabir@example.com');
  await next(page).click();
  await expect(page.locator('#plan-consent')).toBeFocused();
  await page.locator('#plan-consent').check();
  await next(page).click();
  await expect(heading(page)).toContainText('Check your request');
});

test('a refresh restores the step and the answers; Back keeps them', async ({ page }) => {
  await open(page);
  await page.locator('#plan-tripType-2').check();
  await next(page).click();
  await page.locator('#plan-destinations').fill('Rishikesh for a team offsite');
  await next(page).click();
  await page.locator('#plan-timing').fill('March, for three days');
  await page.locator('#plan-flexibility-2').check();
  await next(page).click();
  await expectStep(page, 4);

  const stored = JSON.parse((await draft(page)) ?? '{}') as {
    step: number;
    values: { timing: string };
  };
  expect(stored.step).toBe(3);
  expect(stored.values.timing).toBe('March, for three days');

  await page.reload();
  await page.locator('#planner').scrollIntoViewIfNeeded();
  await page.locator('[data-planner][data-ready]').waitFor({ state: 'attached' });
  await expect(page.locator('[data-planner]')).toHaveAttribute('data-planner-step', '3');
  await expect(heading(page)).toContainText('Step 4 of 5');
  await expect(page.locator('#plan-adults')).toHaveValue('2');

  await back(page).click();
  await expectStep(page, 3);
  await expect(page.locator('#plan-timing')).toHaveValue('March, for three days');
  await expect(page.locator('#plan-flexibility-2')).toBeChecked();
  await back(page).click();
  await expect(page.locator('#plan-destinations')).toHaveValue('Rishikesh for a team offsite');
  await back(page).click();
  await expect(page.locator('#plan-tripType-2')).toBeChecked();
  await expect(back(page)).toHaveCount(0);

  // Forward again: every answer is still there.
  await next(page).click();
  await next(page).click();
  await expect(page.locator('#plan-timing')).toHaveValue('March, for three days');
});

test('the summary links back to each step, and storage is cleared after sending', async ({
  page,
}) => {
  await open(page);
  await page.locator('#plan-tripType-0').check();
  await next(page).click();
  await page.locator('#plan-destinations').fill('Ladakh');
  await next(page).click();
  await page.locator('#plan-timing').fill('June');
  await page.locator('#plan-flexibility-0').check();
  await next(page).click();
  await page.locator('#plan-budget').selectOption({ index: 2 });
  await next(page).click();
  await page.locator('#plan-name').fill('Ira Das');
  await page.locator('#plan-phone').fill('9891677321');
  await page.locator('#plan-consent').check();
  await page.locator('#plan-marketing').check();
  await next(page).click();

  await page.getByRole('button', { name: 'Change destinations' }).click();
  await expectStep(page, 2);
  await page.locator('#plan-destinations').fill('Ladakh and Spiti');
  for (let i = 0; i < 4; i += 1) await next(page).click();
  await expect(page.locator('.plan-summary')).toContainText('Ladakh and Spiti');
  await expect(page.locator('.plan-summary')).toContainText('Yes, please');

  await next(page).click();
  await expect(heading(page)).toHaveText('Your trip request is ready to send');
  expect(await draft(page)).toBeNull();
  await page.reload();
  await page.locator('#planner').scrollIntoViewIfNeeded();
  await page.locator('[data-planner][data-ready]').waitFor({ state: 'attached' });
  await expect(heading(page)).toContainText('Step 1 of 5');
  await expect(page.locator('#plan-tripType-0')).not.toBeChecked();
});

test('the direct routes stay on the page', async ({ page }) => {
  await open(page);
  const hero = page.locator('main section').first();
  if (mobile) {
    await expect(hero.locator('a[href^="https://wa.me/"]')).toBeVisible();
    await expect(hero.locator(`a[href="tel:${mobile.e164}"]`)).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Send it your way' })).toBeVisible();
});

test('without JavaScript the planner is hidden and the WhatsApp template remains', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/plan-my-trip');
  await expect(page.locator('#planner')).toBeHidden();
  if (mobile) {
    const text = whatsappText(
      await page.locator('main a[href^="https://wa.me/"]').first().getAttribute('href'),
    );
    expect(text).toContain('Trip type:');
  }
  await context.close();
});
