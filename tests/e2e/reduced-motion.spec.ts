/**
 * Reduced motion on every route: with `prefers-reduced-motion: reduce` nothing moves after load
 * or after scrolling to the bottom, and nothing inside <main> is left hidden or offset by a
 * reveal, an undrawn route line or a parallax frame.
 */
import { expect, test, type Page } from '@playwright/test';
import { allRoutes } from '../routes';

test.use({ reducedMotion: 'reduce' });

/** Animations and transitions that are running and take time (an instant swap does not). */
function moving(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => {
        if (animation.playState !== 'running') return false;
        const duration = animation.effect?.getComputedTiming().duration;
        return typeof duration === 'number' && duration > 0;
      })
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        const name =
          'animationName' in animation
            ? (animation as CSSAnimation).animationName
            : 'transitionProperty' in animation
              ? (animation as CSSTransition).transitionProperty
              : 'script';
        return `${name} on ${target?.nodeName ?? '?'}.${target instanceof Element ? target.className : ''}`;
      }),
  );
}

/** Elements in <main> that a reveal, route line or parallax frame would hide or move. */
function hidden(page: Page) {
  return page.evaluate(() => {
    const found: string[] = [];
    const describe = (el: Element) => `${el.nodeName}.${String(el.getAttribute('class'))}`;
    const main = document.querySelector('main');
    if (!main) return ['no <main>'];
    main
      .querySelectorAll(
        '[data-reveal], [data-stagger] > *, .reveal-armed, .parallax-inner, .hero-enter, .hero-pop',
      )
      .forEach((el) => {
        const style = getComputedStyle(el);
        if (style.opacity !== '1') found.push(`${describe(el)} opacity ${style.opacity}`);
        if (style.transform !== 'none') found.push(`${describe(el)} transform ${style.transform}`);
      });
    main.querySelectorAll('.route-path').forEach((el) => {
      const offset = parseFloat(getComputedStyle(el).strokeDashoffset);
      if (offset !== 0) found.push(`${describe(el)} undrawn (${offset})`);
    });
    main.querySelectorAll('.route-marker').forEach((el) => {
      const opacity = getComputedStyle(el).opacity;
      if (opacity !== '1') found.push(`${describe(el)} opacity ${opacity}`);
    });
    return found;
  });
}

for (const route of [...allRoutes, '/no-such-page']) {
  test(`reduced motion: nothing moves or hides on ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    expect(await moving(page), 'running animations after load').toEqual([]);
    // The hero photo crossfade never starts: one photo, no toggle.
    expect(await page.locator('[data-hero-fade] [data-slide]').count()).toBeLessThanOrEqual(1);
    expect(await page.locator('[data-fade-toggle]:visible').count()).toBe(0);
    expect(await hidden(page), 'hidden or offset after load').toEqual([]);
    // Reveals stay unarmed under reduced motion; check they were found, so the test is not vacuous.
    if (route === '/') {
      expect(await page.locator('main [data-reveal], main .hero-enter').count()).toBeGreaterThan(0);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    expect(await moving(page), 'running animations after scrolling').toEqual([]);
    expect(await hidden(page), 'hidden or offset after scrolling').toEqual([]);
  });
}
