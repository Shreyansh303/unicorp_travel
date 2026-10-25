import { expect, test, type Page } from '@playwright/test';

/** Elements a keyboard user should reach on the page, tagged with data-tab-id. */
async function tagFocusables(page: Page): Promise<number> {
  return page.evaluate(() => {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const seenRadioGroups = new Set<string>();
    let count = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      if (el.closest('dialog:not([open]), [hidden], [inert]')) continue;
      if (el.closest('fieldset:disabled')) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (el.getClientRects().length === 0) continue;
      if (el instanceof HTMLInputElement && el.type === 'radio') {
        // Tab stops once per radio group.
        if (seenRadioGroups.has(el.name)) continue;
        seenRadioGroups.add(el.name);
        const group = document.querySelectorAll<HTMLInputElement>(
          `input[type="radio"][name="${el.name}"]`,
        );
        group.forEach((radio) => radio.setAttribute('data-tab-id', String(count)));
        count += 1;
        continue;
      }
      el.setAttribute('data-tab-id', String(count));
      count += 1;
    }
    return count;
  });
}

/**
 * Reads the focused element's tag id and checks the design system's focus indicator exactly:
 * a 3px solid outline in the --focus colour of its surface. Whole-card links draw the ring on
 * the card instead: a 3px ink outline with a white gap shadow, so it shows on any background.
 */
async function focusedState(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const toRgb = (value: string) => {
      const probe = document.createElement('span');
      probe.style.color = value;
      document.body.append(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return rgb;
    };
    const card = el.closest<HTMLElement>('.svc-card, .pkg-card');
    const target = card ?? el;
    const style = getComputedStyle(target);
    const expectedColour = card
      ? toRgb('var(--ink)')
      : toRgb(getComputedStyle(el).getPropertyValue('--focus').trim());
    const outlineOk =
      style.outlineStyle === 'solid' &&
      style.outlineWidth === '3px' &&
      style.outlineColor === expectedColour;
    const cardShadowOk = card
      ? /rgb\(255, 255, 255\) 0px 0px 0px (7|9)px/.test(style.boxShadow)
      : true;
    return {
      id: el.getAttribute('data-tab-id'),
      label: `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40)}" (outline ${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}, expected ${expectedColour})`,
      focusVisible: el.matches(':focus-visible'),
      ring: outlineOk && cardShadowOk,
    };
  });
}

/** Tabs through the whole page and returns every focused element the floating bar covers. */
async function focusCoveredByBar(page: Page): Promise<string[]> {
  const total = await tagFocusables(page);
  const covered: string[] = [];
  for (let i = 0; i < total + 5; i += 1) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const bar = document.querySelector('.floating-fixed');
      if (!el || el === document.body || !bar || bar.contains(el)) return null;
      const rect = el.getBoundingClientRect();
      const barTop = bar.getBoundingClientRect().top;
      return rect.bottom > barTop + 0.5
        ? `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" bottom ${Math.round(rect.bottom)} > bar ${Math.round(barTop)}`
        : null;
    });
    if (hit) covered.push(hit);
  }
  return covered;
}

test.describe('styleguide keyboard pass', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('Tab reaches every interactive component, each with a visible focus ring', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/styleguide');
    const total = await tagFocusables(page);
    expect(total).toBeGreaterThan(50);

    const reached = new Set<string>();
    const missingRing: string[] = [];
    for (let i = 0; i < total + 20; i += 1) {
      await page.keyboard.press('Tab');
      const state = await focusedState(page);
      if (!state) continue;
      if (state.id !== null) reached.add(state.id);
      if (!state.focusVisible || !state.ring) missingRing.push(state.label);
    }

    const all = Array.from({ length: total }, (_, index) => String(index));
    const unreached = all.filter((id) => !reached.has(id));
    const unreachedLabels = await page.evaluate(
      (ids) =>
        ids.map((id) => {
          const el = document.querySelector(`[data-tab-id="${id}"]`);
          return `${el?.tagName.toLowerCase()} "${el?.textContent?.trim().slice(0, 40)}"`;
        }),
      unreached,
    );
    expect(unreachedLabels).toEqual([]);
    expect(missingRing).toEqual([]);
  });

  // site-submenu-2 is the Services submenu (the third item in the main navigation).
  test('nav submenu opens with Enter and Space and closes with Escape', async ({ page }) => {
    await page.goto('/styleguide');
    const trigger = page.locator('[aria-controls="site-submenu-2"]');
    const menu = page.locator('#site-submenu-2');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(menu.locator('a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('dialog traps focus, closes with Escape and returns focus', async ({ page }) => {
    await page.goto('/styleguide');
    const trigger = page.getByRole('button', { name: 'Request a callback', exact: true });
    const dialog = page.locator('#sg-dialog');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const inside = () =>
      page.evaluate(() => document.querySelector('#sg-dialog')?.contains(document.activeElement));
    expect(await inside()).toBe(true);
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      expect(await inside()).toBe(true);
    }
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside()).toBe(true);
    }
    // The page behind is inert while the modal is open.
    expect(await page.evaluate(() => document.querySelector('#sg-dialog')?.matches(':modal'))).toBe(
      true,
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('accordion toggles aria-expanded and its region', async ({ page }) => {
    await page.goto('/styleguide');
    const button = page.locator('#sg-faq-button-0');
    const panel = page.locator('#sg-faq-panel-0');
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

  test('filter chips toggle aria-pressed', async ({ page }) => {
    await page.goto('/styleguide');
    const chip = page.getByRole('button', { name: 'Honeymoon' });
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('menu opens full screen, closes with Escape and returns focus', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Menu', exact: true });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#site-nav-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#site-nav-menu')).toBeHidden();
    await expect(button).toBeFocused();
  });

  for (const path of [
    '/',
    '/holidays/kerala-backwaters-and-hills',
    '/styleguide',
    // Pages with the M5 forms, filters and planner.
    '/services/visa-passport',
    '/corporate-travel',
    '/contact',
    '/holidays',
    '/plan-my-trip',
  ]) {
    test(`keyboard focus is never hidden under the floating bar on ${path}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(path);
      expect(await focusCoveredByBar(page)).toEqual([]);
    });

    test(`floating contact never covers content on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const { contentBottom, barTop, scrollWidth } = await page.evaluate(() => {
        const footer = document.querySelector('footer');
        const bar = document.querySelector('.floating-fixed');
        return {
          contentBottom: footer?.getBoundingClientRect().bottom ?? 0,
          barTop: bar?.getBoundingClientRect().top ?? 0,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(barTop).toBeGreaterThan(0);
      expect(contentBottom).toBeLessThanOrEqual(barTop + 1);
      expect(scrollWidth).toBeLessThanOrEqual(375);
    });
  }

  for (const path of ['/services/visa-passport', '/holidays/kerala-backwaters-and-hills']) {
    test(`the floating bar covers no form control in the error state on ${path}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.goto(path);
      await page.locator('form[data-bound]').first().waitFor({ state: 'attached' });
      // Pages that fold their forms on phones: open each fold first.
      const folds = page.locator('[data-fold-button]:visible');
      while ((await folds.count()) > 0) await folds.first().click();
      for (const id of ['enquiry', 'callback']) {
        await page.locator(`#${id} button[type="submit"]`).click();
        await expect(page.locator(`#${id} [data-error-summary]`)).toBeFocused();
      }
      // From the focused summary, Tab through the rest of the page with errors showing.
      expect(await focusCoveredByBar(page)).toEqual([]);
      // Every control of both forms can sit fully above the bar.
      const hidden = await page.evaluate(() => {
        const bar = document.querySelector('.floating-fixed');
        const barTop = bar?.getBoundingClientRect().top ?? innerHeight;
        const out: string[] = [];
        for (const el of Array.from(
          document.querySelectorAll<HTMLElement>(
            'form[data-enquiry-form] :is(input:not([type="hidden"]), select, textarea, button)',
          ),
        )) {
          el.focus();
          const rect = el.getBoundingClientRect();
          if (rect.bottom > barTop + 0.5) out.push(el.id || el.textContent?.trim() || el.tagName);
        }
        return out;
      });
      expect(hidden).toEqual([]);
    });
  }
});

const identity = ['none', 'matrix(1, 0, 0, 1, 0, 0)'];

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1366, height: 900 } });

  for (const path of ['/styleguide', '/', '/holidays/kerala-backwaters-and-hills']) {
    test(`nothing moves on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      });
      const report = await page.evaluate(() => {
        const moving: string[] = [];
        // No running animation or transition may change a transform.
        for (const animation of document.getAnimations()) {
          const effect = animation.effect as KeyframeEffect | null;
          const frames = effect?.getKeyframes() ?? [];
          const name =
            animation instanceof CSSAnimation
              ? animation.animationName
              : animation instanceof CSSTransition
                ? animation.transitionProperty
                : 'script';
          const changesTransform = frames.some((frame) =>
            ['transform', 'translate', 'rotate', 'scale'].some(
              (prop) => prop in frame && frame[prop] !== 'none',
            ),
          );
          if (changesTransform) moving.push(name);
          if (name === 'route-draw') moving.push('route-draw');
        }
        const armed = document.querySelectorAll('.reveal-armed').length;
        const parallax = Array.from(document.querySelectorAll('.parallax-inner')).map(
          (el) => getComputedStyle(el).transform,
        );
        const routes = Array.from(document.querySelectorAll('.route-path')).map(
          (el) => getComputedStyle(el).strokeDashoffset,
        );
        const root = getComputedStyle(document.documentElement);
        return {
          moving,
          armed,
          parallax,
          routes,
          tokens: [
            root.getPropertyValue('--reveal-distance').trim(),
            root.getPropertyValue('--lift').trim(),
            root.getPropertyValue('--tilt').trim(),
            root.getPropertyValue('--parallax-shift').trim(),
          ],
        };
      });
      expect(report.moving).toEqual([]);
      expect(report.armed).toBe(0);
      expect(report.parallax.every((value) => value === 'none')).toBe(true);
      expect(report.routes.every((value) => value === '0px' || value === '0')).toBe(true);
      expect(report.tokens).toEqual(['0px', '0px', '0deg', '0%']);

      // Hovering a primary button does not lift or tilt it.
      const button = page.locator('main .btn-primary').first();
      await button.scrollIntoViewIfNeeded();
      await button.hover();
      const transform = await button.evaluate((el) => getComputedStyle(el).transform);
      expect(identity).toContain(transform);
    });
  }

  test('hover, press and open states do not move under reduced motion', async ({ page }) => {
    await page.goto('/styleguide');
    const transformOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).transform);

    // Pressing a primary button and a chip does not shrink them.
    for (const selector of ['main .btn-primary', 'main [data-chip]:not([disabled])']) {
      const target = page.locator(selector).first();
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      if (!box) throw new Error(`No box for ${selector}`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      expect(identity, selector).toContain(await transformOf(selector));
      await page.mouse.up();
    }

    // Hovered cards, card photos and arrows stay put.
    await page.locator('main .svc-card-link').first().hover();
    expect(identity).toContain(await transformOf('main .svc-card-link'));
    expect(identity).toContain(await transformOf('main .svc-card-link .svc-arrow'));
    await page.locator('main .pkg-card-link').first().hover();
    expect(identity).toContain(await transformOf('main .pkg-card-link img'));
    await page.locator('main .link-standalone').first().hover();
    expect(identity).toContain(await transformOf('main .link-standalone .link-arrow'));

    // Open submenu and accordion chevrons do not turn.
    await page.locator('[aria-controls="site-submenu-2"]').click();
    expect(identity).toContain(await transformOf('[aria-controls="site-submenu-2"] .nav-chevron'));
    await page.keyboard.press('Escape');
    await page.locator('#sg-faq-button-0').click();
    await expect(page.locator('#sg-faq-button-0')).toHaveAttribute('aria-expanded', 'true');
    expect(identity).toContain(await transformOf('#sg-faq-button-0 .acc-icon'));
  });

  test('round floating buttons do not grow on hover under reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const button = page.locator('.floating-fixed .floating-btn').first();
    await button.hover();
    expect(identity).toContain(await button.evaluate((el) => getComputedStyle(el).transform));
  });
});

test('without JavaScript every header link is reachable on a phone', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.menu-btn').first()).toBeHidden();
  const fallback = page.getByRole('navigation', { name: 'Main (all links)' });
  await expect(fallback).toBeVisible();
  // Submenu links (Services) and top-level links are all listed.
  await expect(fallback.getByRole('link', { name: 'Visa and passport' })).toBeVisible();
  await expect(fallback.getByRole('link', { name: 'Contact' })).toBeVisible();
  await context.close();
});
