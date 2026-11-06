/**
 * Phone contact launcher (below 768px): a primary pill plus a round More button that opens a
 * stack of labelled pills. Also the chat link: absent while site.chatbot.url is null, otherwise a
 * plain new-tab link at every size, with nothing requested from Zapier by our pages.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { site } from '../../src/config/site';

const chatOn = site.chatbot.url !== null;
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const more = (page: Page) => page.getByRole('button', { name: 'More contact options' });
const stack = (page: Page) => page.locator('#floating-more-menu');
const zapierRequests = (page: Page) => {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (/zapier/i.test(new URL(request.url()).hostname)) urls.push(request.url());
  });
  return urls;
};

test.describe('launcher at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens a stack with Email and Call, closes on Escape and returns focus', async ({
    page,
  }) => {
    await page.goto('/services');
    await expect(more(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(more(page)).toHaveAttribute('aria-controls', 'floating-more-menu');
    await expect(stack(page)).toBeHidden();
    await more(page).click();
    await expect(more(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(stack(page).getByRole('link', { name: /^Call \+91/ })).toBeVisible();
    await expect(stack(page).getByRole('link', { name: 'Email' })).toBeVisible();
    expect(
      await page.evaluate(() => !!document.activeElement?.closest('#floating-more-menu')),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(more(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(stack(page)).toBeHidden();
    await expect(more(page)).toBeFocused();
  });

  test('a tap on the scrim closes it; choosing an option closes it', async ({ page }) => {
    await page.goto('/services');
    await more(page).click();
    await expect(page.locator('[data-more-scrim]')).toBeVisible();
    await page.mouse.click(195, 200);
    await expect(more(page)).toHaveAttribute('aria-expanded', 'false');
    await more(page).click();
    const email = stack(page).getByRole('link', { name: 'Email' });
    await email.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault()));
    await email.click();
    await expect(more(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(more(page)).toBeFocused();
  });

  test('works by keyboard', async ({ page }) => {
    await page.goto('/services');
    await more(page).focus();
    await page.keyboard.press('Enter');
    await expect(stack(page)).toBeVisible();
    await expect(stack(page).locator('a, button').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(more(page)).toBeFocused();
  });

  test('trip pages: Enquire is the primary and WhatsApp joins the stack', async ({ page }) => {
    await page.goto('/holidays/andaman-islands');
    await expect(
      page.locator('.floating-fixed').getByRole('button', { name: 'Enquire' }),
    ).toBeVisible();
    await more(page).click();
    await expect(stack(page).getByRole('link', { name: /WhatsApp/ })).toBeVisible();
    await expect(stack(page).getByRole('link', { name: /^Call/ })).toBeVisible();
  });

  test('has no axe violations closed or open', async ({ page }) => {
    await page.goto('/services');
    expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
    await more(page).click();
    await expect(stack(page)).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  });

  test('without JavaScript the stack shows in the bar and Call is reachable', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.goto('/services');
    await expect(more(page)).toBeHidden();
    await expect(
      page.locator('.floating-fixed').getByRole('link', { name: /^Call/ }),
    ).toBeVisible();
    await context.close();
  });
});

test.describe('no-JavaScript bar fits narrow phones', () => {
  for (const width of [320, 375]) {
    test(`at ${width}px nothing is clipped or overflowing`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height: 700 },
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      await page.goto('/services');
      const result = await page.evaluate(() => {
        const bar = document.querySelector('.floating-fixed') as HTMLElement;
        const primary = bar.querySelector('.floating-primary') as HTMLElement;
        const label = primary.querySelector('.floating-text') as HTMLElement;
        const buttons = Array.from(
          bar.querySelectorAll<HTMLElement>('.floating-menu .floating-btn'),
        );
        return {
          barOverflow: bar.scrollWidth - bar.clientWidth,
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
          labelClipped: primary.clientWidth < label.scrollWidth,
          buttonWidths: buttons.map((el) => Math.round(el.getBoundingClientRect().width)),
          lastRight: Math.max(...buttons.map((el) => el.getBoundingClientRect().right)),
        };
      });
      expect(result.barOverflow).toBeLessThanOrEqual(0);
      expect(result.pageOverflow).toBeLessThanOrEqual(0);
      expect(result.labelClipped).toBe(false);
      expect(result.buttonWidths.every((w) => w === 48)).toBe(true);
      expect(result.lastRight).toBeLessThanOrEqual(width);
      await context.close();
    });
  }
});

test.describe('launcher with reduced motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('the stack and scrim do not animate', async ({ page }) => {
    await page.goto('/services');
    expect(await stack(page).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(
      await page
        .locator('[data-more-scrim]')
        .evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe('0s');
  });
});

test('/chatbot-knowledge.txt has real facts and no sample content', async ({ request }) => {
  const response = await request.get('/chatbot-knowledge.txt');
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toContain(site.phones.mobile.value.display);
  expect(text).toContain('Noida');
  expect(text).toContain('/plan-my-trip');
  expect(text).not.toMatch(/Andaman islands|demo/i);
  expect(text.length).toBeLessThanOrEqual(8000);
});

test.describe('without a chatbot URL (build with CHATBOT_TEST_URL=none)', () => {
  test.skip(chatOn, 'built with a chatbot URL');

  for (const width of [390, 1024, 1600]) {
    test(`no chat link and no Zapier request at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const requests = zapierRequests(page);
      await page.goto('/');
      await expect(page.locator('.floating-chat')).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      expect(requests).toEqual([]);
    });
  }

  test('the privacy page has no chat paragraph', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('#chat')).toHaveCount(0);
  });
});

test.describe('with a chatbot URL', () => {
  test.skip(!chatOn, 'built without a chatbot URL');

  test('phones: Chat with us is a new-tab link in the More stack; no Zapier request on load', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requests = zapierRequests(page);
    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    expect(requests).toEqual([]);
    await more(page).click();
    const chat = stack(page).getByRole('link', { name: /Chat with us/ });
    await expect(chat).toBeVisible();
    await expect(chat).toHaveAttribute('href', site.chatbot.url ?? '');
    await expect(chat).toHaveAttribute('target', '_blank');
    await expect(chat).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(chat).toHaveAccessibleName('Chat with us (opens in a new tab)');
  });

  for (const width of [1024, 1600]) {
    test(`a Chat button at ${width}px is a new-tab link`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/services');
      const chat = page.locator('.floating-fixed .floating-chat');
      await expect(chat).toBeVisible();
      await expect(chat).toHaveAttribute('href', site.chatbot.url ?? '');
      await expect(chat).toHaveAttribute('target', '_blank');
      await expect(chat).toHaveAccessibleName('Chat with us (opens in a new tab)');
    });
  }

  test('no dialog or Zapier script is on the page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#chat-dialog')).toHaveCount(0);
    await expect(page.locator('script[src*="zapier"]')).toHaveCount(0);
  });

  test('the privacy page mentions the chat', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('#chat')).toBeVisible();
    await expect(page.getByText(/page run by Zapier/)).toBeVisible();
  });
});
