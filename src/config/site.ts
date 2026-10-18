/**
 * Single source of truth for every business fact (roadmap section 3, F-15).
 *
 * Rules:
 * - Read facts from here everywhere. Never hard-code a phone, address, email or name elsewhere.
 * - A fact that is not supplied, or must not be shown, has `value: null` (or an empty list).
 *   Components render nothing for it. Never put placeholder text here.
 * - Use `shown()` to get a value only when its status allows it to be displayed.
 */

export type FactStatus = 'verified' | 'confirm' | 'clientToSupply' | 'doNotShow';

export interface Fact<T> {
  status: FactStatus;
  /** `null` when the fact is unknown, not supplied or must not be shown. */
  value: T | null;
}

/** Returns the value only when the fact may be displayed (verified, or in the demo to confirm). */
export function shown<T>(fact: Fact<T>): T | null {
  return fact.status === 'verified' || fact.status === 'confirm' ? fact.value : null;
}

export interface Phone {
  /** E.164 with the +91 country code, for `tel:` links and WhatsApp. */
  e164: string;
  /** Human-readable form. */
  display: string;
}

export interface PostalAddress {
  /** Lines in reading order, for display. */
  lines: string[];
  streetAddress: string;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/** 24-hour "HH:MM". A `null` time means that part is unknown (not that the office is closed). */
export interface DayHours {
  opens: string | null;
  closes: string | null;
}

export interface ServiceItem {
  id: string;
  name: string;
  status: FactStatus;
}

export interface ServiceGroup {
  id: 'corporate' | 'leisure' | 'related';
  name: string;
  items: ServiceItem[];
}

export const weekdays: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const site = {
  displayName: 'Unicorp Travel',
  displayNameStatus: 'confirm' as FactStatus,
  legalName: {
    status: 'confirm',
    value: 'Unicorp Holidays & Business Travel Private Limited',
  } satisfies Fact<string>,
  cin: { status: 'confirm', value: 'U74140DL2014PTC272416' } satisfies Fact<string>,
  gstin: { status: 'clientToSupply', value: null } satisfies Fact<string>,
  /** Do not show until confirmed: registry says incorporated 2014, old site said 2024. */
  foundingYear: { status: 'doNotShow', value: null } satisfies Fact<number>,

  offices: {
    operating: {
      status: 'confirm',
      value: {
        lines: [
          '16th Floor, Office No. 7, A Silver Wing',
          'Wave One, Plot No. L-2A, Sector 18',
          'Noida, Uttar Pradesh 201301',
        ],
        streetAddress:
          '16th Floor, Office No. 7, A Silver Wing, Wave One, Plot No. L-2A, Sector 18',
        locality: 'Noida',
        region: 'Uttar Pradesh',
        postalCode: '201301',
        country: 'India',
        countryCode: 'IN',
      },
    } satisfies Fact<PostalAddress>,
    registered: {
      status: 'confirm',
      value: { lines: ['Bhikaji Cama Place, New Delhi'] },
    } satisfies Fact<{ lines: string[] }>,
  },

  phones: {
    /** Also the WhatsApp number. */
    mobile: {
      status: 'verified',
      value: { e164: '+919891677321', display: '+91 98916 77321' },
    } satisfies Fact<Phone>,
    landline: {
      status: 'confirm',
      value: { e164: '+911204201591', display: '+91 120 4201591' },
    } satisfies Fact<Phone>,
    secondMobile: {
      status: 'confirm',
      value: { e164: '+919810082665', display: '+91 98100 82665' },
    } satisfies Fact<Phone>,
  },

  email: { status: 'confirm', value: 'info@unicorptravel.com' } satisfies Fact<string>,

  /**
   * Only what is known. `null` means unknown, never "closed".
   * Known (Google listing, 2026-10-17): Saturday 10:00 to 19:00; opens 10:00 on Monday.
   */
  hours: {
    status: 'clientToSupply',
    value: {
      monday: { opens: '10:00', closes: null },
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: { opens: '10:00', closes: '19:00' },
      sunday: null,
    } satisfies Record<Weekday, DayHours | null>,
  } satisfies Fact<Record<Weekday, DayHours | null>>,

  /** A profile that is not supplied has `value: null`; render no icon for it. */
  social: {
    facebook: { status: 'confirm', value: 'https://facebook.com/unicorptravel' },
    instagram: { status: 'clientToSupply', value: null },
    linkedin: { status: 'clientToSupply', value: null },
    x: { status: 'clientToSupply', value: null },
    youtube: { status: 'clientToSupply', value: null },
  } satisfies Record<string, Fact<string>>,

  /** Not verified: render nothing while empty. Badges need proof from the client. */
  memberships: [] as readonly string[],
  /** Unsourced counters are not used. */
  counters: [] as readonly string[],
  /** Permission unknown: not used in the demo. */
  testimonials: [] as readonly string[],
  clientLogos: [] as readonly string[],

  /** Service names as listed on the old site. All copy is written fresh elsewhere. */
  services: [
    {
      id: 'corporate',
      name: 'Corporate travel',
      items: [
        { id: 'travel-management', name: 'Travel management', status: 'verified' },
        { id: 'policy-adherence', name: 'Travel-policy adherence', status: 'verified' },
        { id: 'supplier-negotiations', name: 'Supplier negotiations', status: 'verified' },
        { id: 'travel-implant', name: 'Dedicated team and travel implant', status: 'verified' },
        // The 24/7 claim must be confirmed by the client.
        { id: 'support-24x7', name: '24/7 support', status: 'confirm' },
      ],
    },
    {
      id: 'leisure',
      name: 'Leisure travel',
      items: [
        { id: 'domestic-holidays', name: 'Domestic holidays', status: 'verified' },
        { id: 'international-holidays', name: 'International holidays', status: 'verified' },
      ],
    },
    {
      id: 'related',
      name: 'Travel-related services',
      items: [
        { id: 'visa-passport', name: 'Visa and passport assistance', status: 'verified' },
        { id: 'hotels', name: 'Hotel reservations', status: 'verified' },
        { id: 'forex', name: 'Foreign exchange facilitation', status: 'verified' },
        { id: 'insurance', name: 'Travel insurance', status: 'verified' },
        { id: 'cruises', name: 'Cruise reservations', status: 'verified' },
        {
          id: 'mice',
          name: 'MICE (meetings, incentives, conferences, events)',
          status: 'verified',
        },
        { id: 'car-coach', name: 'Car and coach rentals', status: 'verified' },
        { id: 'rail', name: 'International rail reservations', status: 'verified' },
        {
          id: 'frro',
          name: 'FRRO (Foreigners Regional Registration Office) assistance',
          status: 'verified',
        },
      ],
    },
  ] satisfies ServiceGroup[],
};

export type Site = typeof site;

/** `tel:` href for an E.164 number, e.g. `tel:+919891677321`. */
export function telHref(phone: Phone): string {
  return `tel:${phone.e164}`;
}

/** `https://wa.me/<number>?text=<encoded message>`; the number is the verified mobile by default. */
export function whatsappHref(message?: string, phone?: Phone | null): string {
  const target = phone ?? shown(site.phones.mobile);
  if (!target) {
    throw new Error('No WhatsApp number is configured in site.ts');
  }
  const digits = target.e164.replace(/^\+/, '');
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** `mailto:` href with optional encoded subject and body. */
export function mailtoHref(
  email: string,
  options: { subject?: string; body?: string } = {},
): string {
  const params: string[] = [];
  if (options.subject) params.push(`subject=${encodeURIComponent(options.subject)}`);
  if (options.body) params.push(`body=${encodeURIComponent(options.body)}`);
  return params.length > 0 ? `mailto:${email}?${params.join('&')}` : `mailto:${email}`;
}
