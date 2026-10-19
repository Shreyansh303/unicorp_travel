/**
 * Shared vocabulary for holiday packages: regions, themes and budget bands.
 * The content schema (src/content.config.ts) validates against these lists, and the
 * package filters (F-04) read the same lists, so labels and options never drift apart.
 */
import { formatINR } from './format';

export const packageTypes = ['domestic', 'international'] as const;
export type PackageType = (typeof packageTypes)[number];

export const packageTypeLabels: Record<PackageType, string> = {
  domestic: 'Domestic',
  international: 'International',
};

export interface RegionInfo {
  label: string;
  /** A region belongs to one package type. */
  type: PackageType;
}

export const regions = {
  'south-india': { label: 'South India', type: 'domestic' },
  'north-india': { label: 'North India', type: 'domestic' },
  himalaya: { label: 'Himalaya', type: 'domestic' },
  islands: { label: 'Islands', type: 'domestic' },
  'southeast-asia': { label: 'Southeast Asia', type: 'international' },
  'middle-east': { label: 'Middle East', type: 'international' },
  europe: { label: 'Europe', type: 'international' },
} as const satisfies Record<string, RegionInfo>;

export type RegionId = keyof typeof regions;

export const regionIds = Object.keys(regions) as [RegionId, ...RegionId[]];

export const regionLabels: Record<RegionId, string> = Object.fromEntries(
  Object.entries(regions).map(([id, info]) => [id, info.label]),
) as Record<RegionId, string>;

export const themeIds = [
  'honeymoon',
  'family',
  'adventure',
  'wildlife',
  'heritage',
  'beach',
  'nature',
  'culture',
  'group',
] as const;
export type ThemeId = (typeof themeIds)[number];

export const themeLabels: Record<ThemeId, string> = {
  honeymoon: 'Honeymoon',
  family: 'Family',
  adventure: 'Adventure',
  wildlife: 'Wildlife',
  heritage: 'Heritage',
  beach: 'Beach',
  nature: 'Nature',
  culture: 'Culture',
  group: 'Group',
};

export interface BudgetBand {
  id: 'under-40k' | '40k-75k' | '75k-150k' | 'above-150k';
  label: string;
  /** Inclusive lower bound in INR per person. */
  min: number;
  /** Exclusive upper bound in INR per person; `null` for the open-ended top band. */
  max: number | null;
}

/** Indicative "from" price bands, per person, in INR. Lower bound inclusive, upper bound exclusive. */
export const budgetBands: readonly BudgetBand[] = [
  { id: 'under-40k', label: `Under ${formatINR(40000)}`, min: 0, max: 40000 },
  {
    id: '40k-75k',
    label: `${formatINR(40000)} to ${formatINR(75000)}`,
    min: 40000,
    max: 75000,
  },
  {
    id: '75k-150k',
    label: `${formatINR(75000)} to ${formatINR(150000)}`,
    min: 75000,
    max: 150000,
  },
  { id: 'above-150k', label: `Above ${formatINR(150000)}`, min: 150000, max: null },
];

export type BudgetBandId = BudgetBand['id'];

/** The band a "from" price (INR per person) falls in. */
export function budgetBandFor(price: number): BudgetBand {
  const band = budgetBands.find(
    (item) => price >= item.min && (item.max === null || price < item.max),
  );
  if (!band) {
    throw new Error(`No budget band for price ${price}`);
  }
  return band;
}

/** Duration filter buckets for F-04, by number of days. */
export interface DurationBand {
  id: 'short' | 'week' | 'long';
  label: string;
  minDays: number;
  maxDays: number | null;
}

export const durationBands: readonly DurationBand[] = [
  { id: 'short', label: 'Up to 5 days', minDays: 1, maxDays: 5 },
  { id: 'week', label: '6 to 7 days', minDays: 6, maxDays: 7 },
  { id: 'long', label: '8 days or more', minDays: 8, maxDays: null },
];

export function durationBandFor(days: number): DurationBand {
  const band = durationBands.find(
    (item) => days >= item.minDays && (item.maxDays === null || days <= item.maxDays),
  );
  if (!band) {
    throw new Error(`No duration band for ${days} days`);
  }
  return band;
}
