/** WCAG 2.x relative luminance and contrast ratio, for the styleguide's colour tables. */

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Rounded down to two decimals, so a ratio never looks better than it is. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

export type Use = 'body' | 'large' | 'ui';

export const threshold: Record<Use, number> = { body: 4.5, large: 3, ui: 3 };

/** Reads `--name: #rrggbb;` declarations from a CSS source (the first :root block wins). */
export function readColourTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const pattern = /--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi;
  for (const match of css.matchAll(pattern)) {
    const [, name, hex] = match;
    if (name && hex && !tokens.has(name)) tokens.set(name, hex.toLowerCase());
  }
  return tokens;
}
