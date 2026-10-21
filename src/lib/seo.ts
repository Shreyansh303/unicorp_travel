/**
 * Page titles. Content stores `seo.title` without the brand; this helper adds the display name
 * from site.ts in one place (M4's layout uses it), so the name is never typed into content.
 */
import { site } from '../config/site';

export const titleSeparator = ' | ';

/** Search engines show roughly 60 characters; the brand suffix counts toward them. */
export const maxTitleLength = 60;

/** Room left for the content's own title once the brand suffix is added. */
export const maxContentTitleLength =
  maxTitleLength - titleSeparator.length - site.displayName.length;

/** True when the text contains the display name or its first word (e.g. "Unicorp"). */
export function containsBrand(text: string): boolean {
  const lower = text.toLowerCase();
  const brandWord = site.displayName.split(/\s+/)[0]?.toLowerCase() ?? '';
  return (
    lower.includes(site.displayName.toLowerCase()) ||
    (brandWord !== '' && lower.includes(brandWord))
  );
}

/**
 * `"Kerala backwaters and hills, 6 days"` becomes `"Kerala backwaters and hills, 6 days | Unicorp Travel"`.
 * With `brandFirst` (the home page), the brand leads, so a narrow browser tab still shows it.
 */
export function pageTitle(title: string, brandFirst = false): string {
  return brandFirst
    ? `${site.displayName}${titleSeparator}${title}`
    : `${title}${titleSeparator}${site.displayName}`;
}
