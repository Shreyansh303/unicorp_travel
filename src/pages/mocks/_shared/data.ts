/**
 * Shared content for the M2a direction mocks. Packages, prices and itinerary are sample
 * content: every page that shows them carries a visible "Sample content" label.
 * Business facts are read from site.ts only.
 */
import type { ImageMetadata } from 'astro';
import { shown, site, telHref, whatsappHref, mailtoHref } from '../../../config/site';

import keralaWide from '../../../assets/photos/kerala-backwaters-1.jpg';
import keralaDusk from '../../../assets/photos/kerala-backwaters-2.jpg';
import ladakhLake from '../../../assets/photos/ladakh-1.jpg';
import andamanBeach from '../../../assets/photos/andaman-1.jpg';
import baliTerraces from '../../../assets/photos/bali-1.jpg';
import swissLake from '../../../assets/photos/switzerland-1.jpg';

export interface SamplePackage {
  slug: string;
  name: string;
  region: string;
  kind: 'Domestic' | 'International';
  days: number;
  nights: number;
  fromPrice: number;
  validTo: string;
  theme: string;
  image: ImageMetadata;
  alt: string;
}

const priceFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

export const packages: SamplePackage[] = [
  {
    slug: 'kerala',
    name: 'Kerala backwaters and hills',
    region: 'Kerala',
    kind: 'Domestic',
    days: 6,
    nights: 5,
    fromPrice: 38500,
    validTo: '31 March 2027',
    theme: 'Family',
    image: keralaWide,
    alt: 'A traditional houseboat gliding along a palm-lined backwater in Kerala',
  },
  {
    slug: 'ladakh',
    name: 'Ladakh lakes and high passes',
    region: 'Ladakh',
    kind: 'Domestic',
    days: 7,
    nights: 6,
    fromPrice: 46000,
    validTo: '30 September 2027',
    theme: 'Adventure',
    image: ladakhLake,
    alt: 'A turquoise lake ringed by bare mountains under a blue sky',
  },
  {
    slug: 'andaman',
    name: 'Andaman island days',
    region: 'Andaman Islands',
    kind: 'Domestic',
    days: 5,
    nights: 4,
    fromPrice: 42000,
    validTo: '31 May 2027',
    theme: 'Honeymoon',
    image: andamanBeach,
    alt: 'Coconut palms leaning over a white sand beach and turquoise water',
  },
  {
    slug: 'bali',
    name: 'Bali rice terraces and temples',
    region: 'Bali, Indonesia',
    kind: 'International',
    days: 6,
    nights: 5,
    fromPrice: 68000,
    validTo: '31 March 2027',
    theme: 'Honeymoon',
    image: baliTerraces,
    alt: 'Green rice terraces among palm trees in Tegalalang, Bali',
  },
  {
    slug: 'switzerland',
    name: 'Swiss lakes and mountain railways',
    region: 'Switzerland',
    kind: 'International',
    days: 8,
    nights: 7,
    fromPrice: 185000,
    validTo: '30 June 2027',
    theme: 'Family',
    image: swissLake,
    alt: 'A still alpine lake below snow-capped Swiss peaks',
  },
];

/** The package shown on every mock detail page. */
export const featured = {
  ...(packages[0] as SamplePackage),
  route: 'Kochi to Kochi',
  intro:
    'Six unhurried days from the tea hills of Munnar to a night on the Alappuzha backwaters, with drives short enough to enjoy the views on the way.',
  secondImage: keralaDusk,
  secondAlt: 'A houseboat on calm backwater beneath tall coconut palms',
  highlights: [
    {
      title: 'A night on a houseboat',
      text: 'Cruise the Alappuzha backwaters and sleep on the water.',
    },
    {
      title: 'Tea hills of Munnar',
      text: 'Cool air, estate walks and wide views over the Western Ghats.',
    },
    {
      title: 'Spice gardens at Thekkady',
      text: 'A guided walk through cardamom and pepper plantations.',
    },
    {
      title: 'Evening in Fort Kochi',
      text: 'Old streets, Chinese fishing nets and a sunset by the harbour.',
    },
  ],
  itinerary: [
    {
      day: 1,
      place: 'Kochi',
      title: 'Arrive in Kochi',
      text: 'We meet you at the airport and take you to your hotel. Spend the evening walking the lanes of Fort Kochi.',
    },
    {
      day: 2,
      place: 'Munnar',
      title: 'Up into the tea hills',
      text: 'A scenic drive into the Western Ghats, with stops at waterfalls on the way. Evening at leisure in Munnar.',
    },
    {
      day: 3,
      place: 'Munnar',
      title: 'Estates and viewpoints',
      text: 'Visit a tea estate and its small museum, then head out to the viewpoints around the town.',
    },
    {
      day: 4,
      place: 'Thekkady',
      title: 'Down to the spice country',
      text: 'Drive to Thekkady near Periyar. In the afternoon, a guided walk through a spice plantation.',
    },
    {
      day: 5,
      place: 'Alappuzha',
      title: 'Onto the backwaters',
      text: 'Board your houseboat at noon and cruise past villages and paddy fields. Dinner and overnight on board.',
    },
    {
      day: 6,
      place: 'Kochi',
      title: 'Back to Kochi',
      text: 'Breakfast on the houseboat, then a drive back to Kochi airport for your flight home.',
    },
  ],
};

/** Short descriptions for the three service groups in site.ts. Copy is written fresh. */
export const groupCopy: Record<'corporate' | 'leisure' | 'related', string> = {
  corporate:
    'One desk for your company’s flights, hotels and visas, booked within your travel policy and reported clearly.',
  leisure:
    'Holidays in India and abroad, planned day by day around who is travelling and what they enjoy.',
  related:
    'The paperwork and bookings around a trip: visas, forex, insurance, hotels, rail, cruises and ground transport.',
};

/** One-line descriptions and short board codes for the corporate services. */
export const corporateDetail: Record<string, { code: string; text: string }> = {
  'travel-management': {
    code: 'TMS',
    text: 'Bookings, changes and records for every business trip, kept in one place.',
  },
  'policy-adherence': {
    code: 'POL',
    text: 'Fares and hotels checked against your travel policy before anything is booked.',
  },
  'supplier-negotiations': {
    code: 'NEG',
    text: 'Rates discussed with airlines and hotels on the routes your teams use most.',
  },
  'travel-implant': {
    code: 'DSK',
    text: 'A named team for your account, or a travel desk placed in your office.',
  },
  'support-24x7': {
    code: '24H',
    text: 'Someone to call when plans change outside office hours.',
  },
};

/** Service groups from site.ts, keeping only items that may be shown. */
export const serviceGroups = site.services.map((group) => ({
  id: group.id,
  name: group.name,
  copy: groupCopy[group.id],
  items: group.items.filter((item) => item.status === 'verified' || item.status === 'confirm'),
}));

export const brand = site.displayName;
export const mobile = shown(site.phones.mobile);
export const email = shown(site.email);
export const office = shown(site.offices.operating);

export const callHref = mobile ? telHref(mobile) : null;
export const mailHref = email ? mailtoHref(email, { subject: 'Travel enquiry' }) : null;

export function whatsappFor(topic?: string): string {
  return whatsappHref(
    topic
      ? `Hello ${site.displayName}, I would like to know more about ${topic}.`
      : `Hello ${site.displayName}, I would like help planning a trip.`,
  );
}
