/**
 * F-01 enquiry forms, F-02 callback forms and F-14 notices: labels, errors and the error
 * summary, Indian phone formats, email and GSTIN checks, keyboard-only runs, the success screen
 * with its WhatsApp and email hand-off, the unticked opt-in, and no network traffic on submit.
 */
import { expect, test, type Page, type Request } from '@playwright/test';
import { shown, site } from '../../src/config/site';
import { isEmail, isGstin, isName, parseIndianPhone } from '../../src/lib/validation';
import { callbackPages, enquiryFormPages, packageFacts } from '../routes';
import { focusedId, futureDate, mailtoParts, readable, tabTo, whatsappText } from '../keyboard';

test.use({ locale: 'en-IN' });

/** Opens a page and waits until its forms are ready (bound by the form controller). */
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('form[data-bound]').first().waitFor({ state: 'attached' });
}

const mobile = shown(site.phones.mobile);
const email = shown(site.email);

const validPhones = [
  '9891677321',
  '98916 77321',
  '98916-77321',
  '+91 98916 77321',
  '+919891677321',
  '+91-98916-77321',
  '91 98916 77321',
  '098916 77321',
  '6123456789',
  '0120 4201591',
  '0120-420-1591',
  '+91 120 4201591',
  '011 2345 6789',
  '(011) 2345-6789',
];

const invalidPhones = [
  '98916 7732',
  '989167732112',
  '4201591',
  '0000000000',
  '+1 415 555 0100',
  '+44 20 7946 0958',
  'call me',
  '98916x77321',
  // Landlines need a plausible STD split and no junk digits.
  '1234567890',
  '5555555555',
  '1800-11-1234',
  '1111111111',
  '4321098765',
  '0120 0123456',
];

test.describe('phone, email and GSTIN rules', () => {
  for (const phone of validPhones) {
    test(`accepts the phone number "${phone}"`, () => {
      expect(parseIndianPhone(phone)).not.toBeNull();
    });
  }
  for (const phone of invalidPhones) {
    test(`rejects the phone number "${phone}"`, () => {
      expect(parseIndianPhone(phone)).toBeNull();
    });
  }

  test('normalises numbers to E.164 with +91', () => {
    expect(parseIndianPhone('098916 77321')?.e164).toBe('+919891677321');
    expect(parseIndianPhone('0120-420-1591')?.e164).toBe('+911204201591');
    expect(parseIndianPhone('98916 77321')?.display).toBe('+91 98916 77321');
  });

  test('checks email addresses', () => {
    for (const value of ['name@example.com', 'a.b+c@mail.co.in', 'a@my-site.example.com']) {
      expect(isEmail(value)).toBe(true);
    }
    for (const value of [
      'name@',
      'name@example',
      'name example.com',
      '@example.com',
      'name@-example.com',
      'name@example-.com',
      'name@mail.-example.com',
      'name@example..com',
      'name@example.123',
      'name@192.168.0.1',
      '"quoted name"@example.com',
    ]) {
      expect(isEmail(value), value).toBe(false);
    }
  });

  test('checks names, counting combining marks as letters', () => {
    for (const value of ['Asha Verma', 'Li', 'कि', 'राम']) expect(isName(value), value).toBe(true);
    for (const value of ['A', '', '  ', '12', '-']) expect(isName(value), value).toBe(false);
  });

  test('checks the GSTIN format', () => {
    for (const value of [
      '09AAACU1234F1Z5',
      '27abcde1234f1z9',
      '07AAAAA0000A1Z5',
      '38AAACU1234F1Z5',
    ]) {
      expect(isGstin(value)).toBe(true);
    }
    for (const value of [
      '09AAACU1234F1Z',
      '00AAACU1234F1Z5',
      '39AAACU1234F1Z5',
      '09AAACU1234F1X5',
      'GSTIN',
      '',
    ]) {
      expect(isGstin(value)).toBe(false);
    }
  });
});

/** Every control of every form on the page has a visible label (or a visible legend). */
async function unlabelled(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const missing: string[] = [];
    const visible = (el: Element | null | undefined) =>
      !!el &&
      (el as HTMLElement).getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden';
    for (const control of Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'form[data-enquiry-form] input:not([type="hidden"]), form[data-enquiry-form] select, form[data-enquiry-form] textarea',
      ),
    )) {
      const label = control.labels?.[0];
      if (!visible(label) || !label?.textContent?.trim()) missing.push(control.id);
    }
    return missing;
  });
}

test.describe('every form page', () => {
  for (const path of callbackPages) {
    test(`${path}: labelled fields, unticked opt-in and a purpose notice`, async ({ page }) => {
      await open(page, path);
      const forms = page.locator('form[data-enquiry-form]');
      expect(await forms.count()).toBeGreaterThanOrEqual(1);
      await expect(page.locator('form[data-kind="callback"]')).toHaveCount(1);
      if (path !== '/holidays')
        await expect(page.locator('form[data-kind="enquiry"]')).toHaveCount(1);
      expect(await unlabelled(page)).toEqual([]);
      for (const form of await forms.all()) {
        const optIn = form.locator('[data-optin]');
        await expect(optIn).toHaveCount(1);
        await expect(optIn).not.toBeChecked();
        await expect(optIn).not.toHaveAttribute('required', /.*/);
        const notice = form.locator('.form-notice');
        await expect(notice).toContainText('does not store');
        await expect(notice.locator('a[href="/privacy"]')).toBeVisible();
        const submit = form.locator('button[type="submit"]');
        await expect(submit).toHaveAttribute(
          'aria-describedby',
          (await notice.getAttribute('id')) ?? '',
        );
      }
    });
  }

  test('each service page uses the form type of its service', async ({ page }) => {
    test.setTimeout(120_000);
    for (const { path, formType } of enquiryFormPages) {
      await open(page, path);
      await expect(page.locator('form[data-kind="enquiry"]'), path).toHaveAttribute(
        'data-form-type',
        formType,
      );
    }
  });
});

test.describe('enquiry form', () => {
  test('submitting empty shows each error and focuses the summary', async ({ page }) => {
    await open(page, '/services/visa-passport');
    const form = page.locator('#enquiry');
    await form.locator('button[type="submit"]').click();
    const summary = form.locator('[data-error-summary]');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Please check 3 answers');
    for (const name of ['name', 'phone', 'destination']) {
      const control = form.locator(`[name="${name}"]`);
      await expect(control).toHaveAttribute('aria-invalid', 'true');
      const id = await control.getAttribute('id');
      await expect(control).toHaveAttribute('aria-describedby', new RegExp(`${id}-error`));
      await expect(page.locator(`#${id}-error`)).toBeVisible();
    }
    // Optional fields stay valid.
    await expect(form.locator('[name="email"]')).not.toHaveAttribute('aria-invalid', /.*/);

    // A summary link moves focus to its field.
    await summary.getByRole('link', { name: 'Enter your name' }).click();
    await expect(form.locator('[name="name"]')).toBeFocused();

    // Fixing a field clears its error and its summary line.
    await form.locator('[name="name"]').fill('Asha Verma');
    await expect(form.locator('[name="name"]')).not.toHaveAttribute('aria-invalid', /.*/);
    await expect(summary).toContainText('Please check 2 answers');
  });

  test('rejects invalid phone numbers and accepts Indian formats in the browser', async ({
    page,
  }) => {
    // Each invalid value starts from a freshly loaded form, so a submit-time error cannot be
    // left over from the value before it.
    for (const value of ['4201591', '98916 7732', '+1 415 555 0100', '1234567890']) {
      await open(page, '/contact');
      const invalid = page.locator('#enquiry');
      await invalid.locator('[name="name"]').fill('Asha Verma');
      await invalid.locator('[name="message"]').fill('A weekend trip to Jaipur for four.');
      await expect(invalid.locator('[name="phone"]')).not.toHaveAttribute('aria-invalid', /.*/);
      await invalid.locator('[name="phone"]').fill(value);
      await invalid.locator('button[type="submit"]').click();
      await expect(invalid.locator('[name="phone"]'), value).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      await expect(page.locator('#enquiry-phone-error'), value).toContainText('10-digit mobile');
      await expect(invalid.locator('[data-error-summary]'), value).toContainText(
        'Please check 1 answer',
      );
    }
    await open(page, '/contact');
    const form = page.locator('#enquiry');
    await form.locator('[name="name"]').fill('Asha Verma');
    await form.locator('[name="message"]').fill('A weekend trip to Jaipur for four.');
    const phone = form.locator('[name="phone"]');
    for (const value of ['+91 98916 77321', '0120-420-1591', '098916 77321']) {
      await phone.fill(value);
      await form.locator('button[type="submit"]').click();
      await expect(page.locator('#enquiry-success'), value).toBeVisible();
      await page.locator('#enquiry-success [data-edit]').click();
      await expect(form).toBeVisible();
      await expect(phone).toHaveValue(value);
    }
  });

  test('rejects an invalid email and accepts a valid one', async ({ page }) => {
    await open(page, '/contact');
    const form = page.locator('#enquiry');
    await form.locator('[name="name"]').fill('Asha Verma');
    await form.locator('[name="phone"]').fill('9891677321');
    await form.locator('[name="message"]').fill('Hotels in Goa for December.');
    await form.locator('[name="email"]').fill('asha@example');
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[name="email"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#enquiry-email-error')).toContainText('email address');
    await form.locator('[name="email"]').fill('asha@example.com');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#enquiry-success')).toBeVisible();
  });

  test('checks the GSTIN on the corporate form only when it is filled', async ({ page }) => {
    await open(page, '/corporate-travel');
    const form = page.locator('#enquiry');
    await form.locator('[name="name"]').fill('Rohan Mehta');
    await form.locator('[name="phone"]').fill('+91 98100 82665');
    await form.locator('[name="company"]').fill('Example Systems Pvt Ltd');
    const gstin = form.locator('[name="gstin"]');
    await gstin.fill('09AAACU1234');
    await form.locator('button[type="submit"]').click();
    await expect(gstin).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#enquiry-gstin-error')).toContainText('15-character GSTIN');
    // Typed in lower case, shown in upper case, and accepted.
    await gstin.fill('');
    await gstin.pressSequentially('09aaacu1234f1z5');
    await expect(gstin).toHaveValue('09AAACU1234F1Z5');
    await form.locator('button[type="submit"]').click();
    const success = page.locator('#enquiry-success');
    await expect(success).toBeVisible();
    await expect(success.locator('[data-summary]')).toContainText('09AAACU1234F1Z5');
    const message = whatsappText(
      await success.locator('[data-handoff="whatsapp"]').getAttribute('href'),
    );
    expect(message).toContain('Company name: Example Systems Pvt Ltd');
    expect(message).toContain('GSTIN: 09AAACU1234F1Z5');
    expect(message).toContain('corporate travel');
  });

  test('keyboard only: fill, submit and reach the WhatsApp and email hand-off', async ({
    page,
  }) => {
    await open(page, '/services/visa-passport');
    await tabTo(page, '#enquiry-name');
    await page.keyboard.type('Asha Verma');
    await page.keyboard.press('Tab');
    await page.keyboard.type('98916 77321');
    await page.keyboard.press('Tab');
    await page.keyboard.type('asha@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Japan');
    await page.keyboard.press('Tab');
    expect(await focusedId(page)).toBe('enquiry-purpose');
    await page.keyboard.press('ArrowDown'); // Tourism
    // The headless browser cannot type into date fields, so the optional date is left empty here
    // (dates are checked in their own test below).
    await tabTo(page, '#enquiry-travellers');
    await page.keyboard.type('3');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Two adults and a child, first trip to Japan.');
    await tabTo(page, '#enquiry button[type="submit"]');
    await page.keyboard.press('Enter');

    const success = page.locator('#enquiry-success');
    await expect(success).toBeVisible();
    await expect(success.locator('[data-success-title]')).toBeFocused();
    await expect(page.locator('#enquiry')).toBeHidden();

    const expected = [
      'Hello Unicorp Travel, I would like to ask about visa and passport assistance.',
      'Name: Asha Verma',
      'Phone: +91 98916 77321',
      'Email: asha@example.com',
      'Country you are visiting: Japan',
      'Purpose of the trip: Tourism',
      'Number of travellers: 3',
      'Two adults and a child, first trip to Japan.',
      'Travel ideas and offers: No',
      'Sent from: /services/visa-passport',
    ];
    // The hand-off links must exist: a hidden fact in site.ts would fail here, not skip.
    if (!mobile || !email) throw new Error('site.ts must show a mobile number and an email');
    const wa = success.locator('[data-handoff="whatsapp"]');
    await expect(wa).toHaveCount(1);
    const href = await wa.getAttribute('href');
    expect(new URL(href ?? '').pathname).toBe(`/${mobile.e164.slice(1)}`);
    const text = whatsappText(href);
    for (const line of expected) expect(text).toContain(line);

    const emailLink = success.locator('[data-handoff="email"]');
    await expect(emailLink).toHaveCount(1);
    const mail = mailtoParts(await emailLink.getAttribute('href'));
    expect(mail.to).toBe(email);
    expect(mail.subject).toBe('Enquiry: Visa and passport assistance');
    for (const line of expected) expect(mail.body).toContain(line);

    // The visitor can go back and change an answer; the values are kept.
    await tabTo(page, '#enquiry-success [data-edit]');
    await page.keyboard.press('Enter');
    await expect(page.locator('#enquiry-name')).toBeFocused();
    await expect(page.locator('#enquiry-name')).toHaveValue('Asha Verma');
  });

  test('dates must not be in the past, and check-out follows check-in', async ({ page }) => {
    await open(page, '/services/hotels');
    const form = page.locator('#enquiry');
    await form.locator('[name="name"]').fill('Asha Verma');
    await form.locator('[name="phone"]').fill('9891677321');
    await form.locator('[name="destination"]').fill('Udaipur');
    await form.locator('[name="startDate"]').fill('2020-01-10');
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#enquiry-startDate-error')).toContainText('today or a later date');
    const checkIn = futureDate(40);
    const checkOut = futureDate(35);
    await form.locator('[name="startDate"]').fill(checkIn.iso);
    await form.locator('[name="endDate"]').fill(checkOut.iso);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#enquiry-endDate-error')).toContainText(
      'on or after the first date',
    );
    const later = futureDate(43);
    await form.locator('[name="endDate"]').fill(later.iso);
    await form.locator('button[type="submit"]').click();
    const success = page.locator('#enquiry-success');
    await expect(success).toBeVisible();
    await expect(success.locator('[data-summary]')).toContainText(readable(checkIn.iso));
    await expect(success.locator('[data-summary]')).toContainText(readable(later.iso));
  });

  test('the package form carries the package name, reference and opt-in choice', async ({
    page,
  }) => {
    const pkg = packageFacts[0];
    if (!pkg) throw new Error('No packages');
    await open(page, `/holidays/${pkg.slug}`);
    const form = page.locator('#enquiry');
    await expect(form.locator('[name="holiday"]')).toHaveValue(pkg.title);
    await expect(form.locator('input[type="hidden"][name="packageRef"]')).toHaveValue(pkg.slug);
    await form.locator('[name="name"]').fill('Meera Iyer');
    await form.locator('[name="phone"]').fill('9810082665');
    await form.locator('[name="adults"]').fill('2');
    await form.locator('[data-optin]').check();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#enquiry-success')).toBeVisible();
    const text = whatsappText(
      await page.locator('#enquiry-success [data-handoff="whatsapp"]').getAttribute('href'),
    );
    expect(text).toContain(`I would like to ask about the ${pkg.title} holiday.`);
    expect(text).toContain(`Holiday: ${pkg.title}`);
    expect(text).toContain(`Package reference: ${pkg.slug}`);
    expect(text).toContain('Adults: 2');
    expect(text).toContain('Travel ideas and offers: Yes, please');
  });

  test('no network request is made on submit', async ({ page }) => {
    await open(page, '/services/hotels');
    await page.waitForLoadState('networkidle');
    const form = page.locator('#enquiry');
    await form.locator('[name="name"]').fill('Asha Verma');
    await form.locator('[name="phone"]').fill('9891677321');
    await form.locator('[name="destination"]').fill('Udaipur');
    await form.locator('button[type="submit"]').scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');

    const requests: Request[] = [];
    const record = (request: Request) => requests.push(request);
    page.on('request', record);
    await form.locator('button[type="submit"]').click();
    await expect(page.locator('#enquiry-success')).toBeVisible();
    await page.waitForTimeout(500);
    page.off('request', record);

    // Lazy photos may load as the page scrolls; nothing else may leave the page.
    const traffic = requests
      .filter((request) => request.resourceType() !== 'image')
      .map((request) => `${request.method()} ${request.resourceType()} ${request.url()}`);
    expect(traffic).toEqual([]);
    expect(requests.every((request) => request.method() === 'GET')).toBe(true);
    // Nothing is stored either.
    expect(
      await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]),
    ).toEqual([0, 0, '']);
  });
});

test.describe('callback form', () => {
  for (const path of ['/services/forex', `/holidays/${packageFacts[1]?.slug ?? ''}`]) {
    test(`${path}: errors, keyboard-only request and the call-back message`, async ({ page }) => {
      await open(page, path);
      const form = page.locator('#callback');
      const topic = (await form.locator('[name="topic"]').inputValue()).trim();
      expect(topic.length).toBeGreaterThan(3);
      expect(await unlabelled(page)).toEqual([]);

      // Empty submit: errors and focus on the summary.
      await form.locator('button[type="submit"]').click();
      await expect(form.locator('[data-error-summary]')).toBeFocused();
      await expect(form.locator('[data-error-summary]')).toContainText('Please check 3 answers');

      // An invalid phone is rejected.
      await form.locator('[name="phone"]').fill('12345');
      await form.locator('button[type="submit"]').click();
      await expect(page.locator('#callback-phone-error')).toContainText('10-digit mobile');

      // Keyboard only from here.
      await page.reload();
      await page.locator('form[data-bound]').first().waitFor({ state: 'attached' });
      await tabTo(page, '#callback-name');
      await page.keyboard.type('Vikram Rao');
      await page.keyboard.press('Tab');
      await page.keyboard.type('+91 98916 77321');
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowDown'); // first time window
      await tabTo(page, '#callback button[type="submit"]');
      await page.keyboard.press('Enter');

      const success = page.locator('#callback-success');
      await expect(success.locator('[data-success-title]')).toBeFocused();
      const time = await page.locator('#callback-time option').nth(1).textContent();
      const href = await success.locator('[data-handoff="whatsapp"]').getAttribute('href');
      const text = whatsappText(href);
      expect(text).toContain(`Hello Unicorp Travel, please call me back about ${topic}.`);
      expect(text).toContain('Name: Vikram Rao');
      expect(text).toContain('Phone: +91 98916 77321');
      expect(text).toContain(`Best time to call: ${time?.trim()}`);
      expect(text).toContain(`Sent from: ${path}`);
      const mail = mailtoParts(
        await success.locator('[data-handoff="email"]').getAttribute('href'),
      );
      expect(mail.subject).toBe(`Callback request: ${topic}`);
      expect(mail.body).toContain('Name: Vikram Rao');
    });
  }

  test('preferred times claim no hours the site does not show', async ({ page }) => {
    await open(page, '/contact');
    const labels = await page.locator('#callback-time option').allTextContents();
    if (!shown(site.hours)) {
      for (const label of labels) expect(label).not.toMatch(/\d/);
    }
  });
});

test.describe('FAQ accordions beside the new forms', () => {
  for (const path of ['/services/visa-passport', '/corporate-travel']) {
    test(`${path}: buttons with aria-expanded, operable by keyboard`, async ({ page }) => {
      await open(page, path);
      const button = page.locator('main [data-accordion-button]').first();
      const panel = page.locator(`#${await button.getAttribute('aria-controls')}`);
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(panel).toBeVisible();
      await page.keyboard.press('Space');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
    });
  }
});

test('without JavaScript the forms are hidden and the direct routes remain', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/services/visa-passport');
  await expect(page.locator('form[data-enquiry-form]').first()).toBeHidden();
  await expect(page.locator('.form-nojs').first()).toBeVisible();
  await expect(page.locator('[data-enquiry] a[href^="https://wa.me/"]')).toBeVisible();
  await context.close();
});
