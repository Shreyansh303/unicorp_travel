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
  /** True when the number is also on WhatsApp. */
  whatsapp: boolean;
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

/** A person in the company, for the "Who to contact" and "Directors" displays. */
export interface StaffContact {
  name: string;
  phone: Phone;
  email: string;
}

export interface ContactDesk {
  id: 'international' | 'domestic' | 'visa' | 'accounts';
  /** Heading shown above the people on the desk. */
  name: string;
  /** Where the desk is shown: the Contact page, or only the visa service page. */
  shownOn: 'contact' | 'visa-passport';
  status: FactStatus;
  people: StaffContact[];
}

export interface Director {
  name: string;
  title: string;
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
    status: 'verified',
    value: 'Unicorp Holidays & Business Travel Private Limited',
  } satisfies Fact<string>,
  /** The name Google shows for the agency's Maps listing. */
  mapsListingName: {
    status: 'verified',
    value: 'Unicorp Holidays & Business Travel',
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

  /** Order here is the order shown. `mobile` is the primary: all Call and WhatsApp buttons use it. */
  phones: {
    mobile: {
      status: 'verified',
      value: { e164: '+919891677321', display: '+91 98916 77321', whatsapp: true },
    } satisfies Fact<Phone>,
    landline: {
      status: 'verified',
      value: { e164: '+911205109212', display: '+91 120 5109212', whatsapp: false },
    } satisfies Fact<Phone>,
    /** Secondary WhatsApp number. */
    secondMobile: {
      status: 'verified',
      value: { e164: '+918826206177', display: '+91 88262 06177', whatsapp: true },
    } satisfies Fact<Phone>,
    /** Calls only, not on WhatsApp. */
    thirdMobile: {
      status: 'verified',
      value: { e164: '+918800434190', display: '+91 88004 34190', whatsapp: false },
    } satisfies Fact<Phone>,
  },

  email: { status: 'confirm', value: 'info@unicorptravel.com' } satisfies Fact<string>,

  /** Names and titles only: no phone or email is shown for a director. */
  directors: {
    status: 'verified',
    value: [
      { name: 'Vishal Tyagi', title: 'Managing Director' },
      { name: 'Barkha Tyagi', title: 'Director' },
    ],
  } satisfies Fact<Director[]>,

  /**
   * Staff contacts by desk, from the client's company profile. International, domestic and
   * accounts show on the Contact page; the visa desk shows only on the visa service page.
   * Not used in the header, footer or the "Talk to us" list.
   */
  contactDesks: [
    {
      id: 'international',
      name: 'International flight and hotel bookings',
      shownOn: 'contact',
      status: 'verified',
      people: [
        {
          name: 'Prabhanshu Nirwan',
          phone: { e164: '+918826206177', display: '+91 88262 06177', whatsapp: true },
          email: 'prabhanshu@unicorptravel.com',
        },
        {
          name: 'Vishal Tyagi',
          phone: { e164: '+919891677321', display: '+91 98916 77321', whatsapp: true },
          email: 'vishal@unicorptravel.com',
        },
      ],
    },
    {
      id: 'domestic',
      name: 'Domestic flight and hotel bookings',
      shownOn: 'contact',
      status: 'verified',
      people: [
        {
          name: 'Sumit Sharma',
          phone: { e164: '+919643509314', display: '+91 96435 09314', whatsapp: false },
          email: 'domestic@unicorptravel.com',
        },
        {
          name: 'Nalin Tyagi',
          phone: { e164: '+918800434190', display: '+91 88004 34190', whatsapp: false },
          email: 'domestic@unicorptravel.com',
        },
        {
          name: 'Prabhanshu Nirwan',
          phone: { e164: '+918826206177', display: '+91 88262 06177', whatsapp: true },
          email: 'prabhanshu@unicorptravel.com',
        },
      ],
    },
    {
      id: 'visa',
      name: 'Visa assistance',
      shownOn: 'visa-passport',
      status: 'verified',
      people: [
        {
          name: 'Hans Raj',
          phone: { e164: '+919818219616', display: '+91 98182 19616', whatsapp: false },
          email: 'visa@unicorptravel.com',
        },
        {
          name: 'Amar Singh',
          phone: { e164: '+919718753983', display: '+91 97187 53983', whatsapp: false },
          email: 'visa@unicorptravel.com',
        },
      ],
    },
    {
      id: 'accounts',
      name: 'Accounts',
      shownOn: 'contact',
      status: 'verified',
      people: [
        {
          name: 'Sharad Jain',
          phone: { e164: '+919716147321', display: '+91 97161 47321', whatsapp: false },
          email: 'sharad@unicorptravel.com',
        },
        // Same number and email as Sharad Jain, as given in the profile. Flag to the client.
        {
          name: 'Himanshu Verma',
          phone: { e164: '+919716147321', display: '+91 97161 47321', whatsapp: false },
          email: 'sharad@unicorptravel.com',
        },
      ],
    },
  ] satisfies ContactDesk[],

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
    instagram: { status: 'verified', value: 'https://www.instagram.com/unicorptravel/' },
    linkedin: { status: 'clientToSupply', value: null },
    x: { status: 'clientToSupply', value: null },
    youtube: {
      status: 'verified',
      value: 'https://www.youtube.com/@UnicorpHolidaysBusinessTravelP',
    },
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
        {
          id: 'air-ticketing-business',
          name: 'Air ticketing, domestic and international',
          status: 'verified',
        },
        { id: 'travel-management', name: 'Travel management', status: 'verified' },
        { id: 'policy-adherence', name: 'Travel-policy adherence', status: 'verified' },
        { id: 'supplier-negotiations', name: 'Supplier negotiations', status: 'verified' },
        { id: 'travel-implant', name: 'Dedicated team and travel implant', status: 'verified' },
        { id: 'support-24x7', name: '24/7 support', status: 'verified' },
        { id: 'airport-assist', name: 'Meet and assist at Delhi Airport', status: 'verified' },
      ],
    },
    {
      id: 'leisure',
      name: 'Leisure travel',
      items: [
        {
          id: 'air-ticketing-leisure',
          name: 'Air ticketing, domestic and international',
          status: 'verified',
        },
        { id: 'domestic-holidays', name: 'Domestic holidays', status: 'verified' },
        { id: 'international-holidays', name: 'International holidays', status: 'verified' },
      ],
    },
    {
      id: 'related',
      name: 'Travel-related services',
      items: [
        {
          id: 'air-ticketing',
          name: 'Air ticketing, domestic and international',
          status: 'verified',
        },
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

const phoneLabels: [keyof Site['phones'], (phone: Phone) => string][] = [
  ['mobile', (p) => (p.whatsapp ? 'Mobile and WhatsApp' : 'Mobile')],
  ['landline', () => 'Office'],
  ['secondMobile', (p) => (p.whatsapp ? 'Mobile and WhatsApp' : 'Mobile')],
  ['thirdMobile', (p) => (p.whatsapp ? 'Mobile and WhatsApp' : 'Mobile')],
];

/** Phones that may be shown, in display order, with their labels. */
export function listedPhones(): { label: string; phone: Phone }[] {
  return phoneLabels.flatMap(([key, label]) => {
    const phone = shown<Phone>(site.phones[key]);
    return phone ? [{ label: label(phone), phone }] : [];
  });
}

/** Desks that may be shown on a page, with their people. A desk with nobody to show is dropped. */
export function desksFor(place: ContactDesk['shownOn']): ContactDesk[] {
  return site.contactDesks.filter(
    (desk: ContactDesk) =>
      desk.shownOn === place &&
      (desk.status === 'verified' || desk.status === 'confirm') &&
      desk.people.length > 0,
  );
}

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

/**
 * "Open in Google Maps" link: the Maps URLs API search for the listing name plus the address,
 * so Google opens the agency's own listing. No map loads on the page and no API key is needed.
 */
export function mapsHref(address: PostalAddress): string {
  const query = [
    shown(site.mapsListingName),
    address.streetAddress,
    address.locality,
    address.region,
    address.postalCode,
  ]
    .filter((part): part is string => Boolean(part))
    .concat(address.country)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** `mailto:` href with optional encoded subject and body. */
export function mailtoHref(
  email: string,
  options: { subject?: string; body?: string } = {},
): string {
  const params: string[] = [];
  if (options.subject) params.push(`subject=${encodeURIComponent(options.subject)}`);
  // CRLF line breaks, as mail clients on Windows collapse bare line feeds.
  if (options.body) {
    const body = options.body.replace(/\r?\n/g, '\r\n');
    params.push(`body=${encodeURIComponent(body)}`);
  }
  return params.length > 0 ? `mailto:${email}?${params.join('&')}` : `mailto:${email}`;
}
