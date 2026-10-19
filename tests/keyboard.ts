/** Helpers for keyboard-only runs and for reading the hand-off links the forms produce. */
import type { Page } from '@playwright/test';

/** Presses Tab (or Shift+Tab) until the focused element matches the selector. */
export async function tabTo(page: Page, selector: string, { max = 150, back = false } = {}) {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
    const hit = await page.evaluate(
      (sel) => document.activeElement?.matches(sel) ?? false,
      selector,
    );
    if (hit) return;
  }
  throw new Error(`Tab never reached ${selector}`);
}

/** The id of the focused element. */
export function focusedId(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.id ?? '');
}

/** The pre-filled message of a wa.me link. */
export function whatsappText(href: string | null): string {
  return new URL(href ?? '').searchParams.get('text') ?? '';
}

/** Subject and body of a mailto link. */
export function mailtoParts(href: string | null): { to: string; subject: string; body: string } {
  const url = new URL(href ?? '');
  return {
    to: url.pathname,
    subject: url.searchParams.get('subject') ?? '',
    body: url.searchParams.get('body') ?? '',
  };
}

/** A date some days ahead, as YYYY-MM-DD. */
export function futureDate(daysAhead: number): { iso: string } {
  return { iso: new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10) };
}

/** "12 December 2026" for a YYYY-MM-DD date, as the summaries write it. */
export function readable(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}
