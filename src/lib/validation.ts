/**
 * Input checks shared by the enquiry and callback forms, the trip planner and submitEnquiry.
 * Pure functions with no DOM access, so the server, the browser and tests use the same rules.
 */

export interface PhoneNumber {
  /** E.164, e.g. +919891677321. */
  e164: string;
  /** Readable form, e.g. +91 98916 77321. */
  display: string;
  kind: 'mobile' | 'landline';
}

/**
 * A 10-digit landline: an STD code of 2 to 4 digits followed by a subscriber number that does not
 * start with 0 or 1, and not a run of one digit or of consecutive digits (1234567890, 9876543210).
 */
function isPlausibleLandline(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return false;
  const steps = Array.from(
    digits.slice(1),
    (digit, i) => (Number(digit) - Number(digits[i]) + 10) % 10,
  );
  if (steps.every((step) => step === 1) || steps.every((step) => step === 9)) return false;
  return [2, 3, 4].some((std) => /^[2-9]/.test(digits.slice(std)));
}

/**
 * Reads an Indian phone number. Accepts a 10-digit mobile starting with 6 to 9, or a landline
 * with its STD code (10 digits in all, without the leading 0), each with or without +91, 91 or 0
 * in front, and with spaces, dashes, dots or brackets anywhere. Returns null for anything else.
 */
export function parseIndianPhone(input: string): PhoneNumber | null {
  const compact = input.trim().replace(/[\s\-.()]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;
  let digits = compact;
  if (digits.startsWith('+')) {
    if (!digits.startsWith('+91')) return null;
    digits = digits.slice(3);
  } else if (digits.startsWith('0091')) {
    digits = digits.slice(4);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // A trunk 0 before the STD code or mobile number, also after +91 as in "+91 (0)120 ...".
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[1-9]\d{9}$/.test(digits)) return null;

  const kind = /^[6-9]/.test(digits) ? 'mobile' : 'landline';
  if (kind === 'landline' && !isPlausibleLandline(digits)) return null;
  const display =
    kind === 'mobile' ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : `+91 ${digits}`;
  return { e164: `+91${digits}`, display, kind };
}

export function isIndianPhone(input: string): boolean {
  return parseIndianPhone(input) !== null;
}

/** A practical email check: something@domain.tld, no spaces. */
export function isEmail(input: string): boolean {
  const match = /^[^\s@"]+@([^\s@]+)$/.exec(input.trim());
  const labels = match?.[1]?.split('.') ?? [];
  const tld = labels.at(-1) ?? '';
  return (
    labels.length >= 2 &&
    labels.every((label) => label !== '' && !label.startsWith('-') && !label.endsWith('-')) &&
    tld.length >= 2 &&
    !/^\d+$/.test(tld)
  );
}

/**
 * GSTIN format: 2-digit state code, 10-character PAN (5 letters, 4 digits, 1 letter), entity
 * number, the letter Z, and a check character. 15 characters in all. Format only: the check
 * character is not verified.
 */
export function isGstin(input: string): boolean {
  return /^(?:0[1-9]|[12]\d|3[0-8]|97|99)[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
    input.trim().toUpperCase(),
  );
}

/** A name: at least two letters (combining vowel signs count, as in Devanagari names). */
export function isName(input: string): boolean {
  return (input.match(/[\p{L}\p{M}]/gu) ?? []).length >= 2;
}

/** Today's date as YYYY-MM-DD in the visitor's time zone. */
export function todayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** A YYYY-MM-DD date that exists. */
export function isIsoDate(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const date = new Date(`${input}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === input;
}

/** A whole number within the range, given as text. */
export function isCount(input: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(input.trim())) return false;
  const value = Number(input);
  return value >= min && value <= max;
}

/** "12 December 2026" for a YYYY-MM-DD date. */
export function readableDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** The standard messages, so every form words its errors the same way. */
export const messages = {
  name: { required: 'Enter your name', invalid: 'Enter your name using letters' },
  phone: {
    required: 'Enter a phone number',
    invalid: 'Enter a 10-digit mobile number, or a landline with its STD code',
  },
  email: { invalid: 'Enter an email address like name@example.com' },
  gstin: { invalid: 'Enter a 15-character GSTIN, like the one on your GST certificate' },
  date: {
    invalid: 'Enter a real date',
    past: 'Choose today or a later date',
    beforeStart: 'Choose a date on or after the first date',
  },
  count: (min: number, max: number) => `Enter a whole number from ${min} to ${max}`,
  /** Title of a form's error summary. */
  summary: (count: number) =>
    count === 1 ? 'Please check 1 answer' : `Please check ${count} answers`,
} as const;
