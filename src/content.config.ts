/**
 * Content collections: services, packages and FAQs (roadmap sections 4 and 5).
 *
 * Rules enforced here, at build time:
 * - Every entry declares `demo` explicitly (no default).
 * - A build with `DEMO=false` fails if any entry has `demo: true` (see `assertNoDemoContent`).
 * - Services must match the service list in `src/config/site.ts` exactly (see `assertServicesMatchSite`).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader, LoaderContext } from 'astro/loaders';
import { z } from 'astro/zod';
import { DEMO } from './config/env';
import { site } from './config/site';
import { containsBrand, maxContentTitleLength } from './lib/seo';
import { packageTypes, regionIds, regions, themeIds } from './lib/packages';

/** The F-01 field sets a service page's enquiry form can use. */
export const formTypes = [
  'general',
  'corporate',
  'visa',
  'hotel',
  'forex',
  'insurance',
  'cruise',
  'mice',
  'transport',
  'rail',
  'frro',
  'holiday',
] as const;

export const serviceCategories = ['corporate', 'leisure', 'related'] as const;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower-case words joined by hyphens');

const seo = z.object({
  /** Without the brand: `pageTitle()` in src/lib/seo.ts adds the display name. */
  title: z
    .string()
    .min(10)
    .max(maxContentTitleLength)
    .refine((value) => !containsBrand(value), {
      message: 'Leave the brand name out of seo.title; pageTitle() adds it from site.ts',
    }),
  description: z.string().min(50).max(160),
});

// ---------------------------------------------------------------------------
// Build-time checks, run by the collection loaders after entries are loaded.
// They read the loaded store, so they also hold when Astro reuses cached entries.
// ---------------------------------------------------------------------------

interface LoadedEntry {
  id: string;
  /** Path of the source file, relative to the project root. */
  filePath: string | undefined;
  data: Record<string, unknown>;
}

function loadedEntries(context: LoaderContext): LoadedEntry[] {
  return context.store
    .entries()
    .map(([id, entry]) => ({ id, filePath: entry.filePath, data: entry.data }));
}

const contentRoot = fileURLToPath(new URL('./content/', import.meta.url));
const collectionNames = ['services', 'packages', 'faqs'] as const;

/** Entries in every collection whose file sets a top-level `demo: true` (read from disk). */
function demoEntriesOnDisk(): string[] {
  const found: string[] = [];
  for (const collection of collectionNames) {
    const dir = `${contentRoot}${collection}`;
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      const text = readFileSync(`${dir}/${file}`, 'utf8');
      if (/^demo:\s*true\s*(#.*)?$/m.test(text)) {
        found.push(`${collection}/${file.replace(/\.[^.]+$/, '')}`);
      }
    }
  }
  return found;
}

/**
 * With `DEMO=false`, refuses to build while any entry still carries sample content.
 * Lists the offenders in all collections, not only the one being loaded.
 */
function assertNoDemoContent(collection: string, entries: LoadedEntry[]): void {
  if (DEMO) return;
  const loaded = entries
    .filter((entry) => entry.data['demo'] === true)
    .map((entry) => `${collection}/${entry.id}`);
  const offenders = [...new Set([...demoEntriesOnDisk(), ...loaded])];
  if (offenders.length === 0) return;
  throw new Error(
    [
      `Production build refused (DEMO=false): ${offenders.length} content ` +
        `${offenders.length === 1 ? 'entry has' : 'entries have'} demo: true.`,
      'Sample content must be replaced or approved by the client, then set to demo: false.',
      ...offenders.map((name) => `  - ${name}`),
    ].join('\n'),
  );
}

/** Every service in site.ts needs exactly one entry with the same name, and no extras. */
function assertServicesMatchSite(entries: LoadedEntry[]): void {
  const expected: { slug: string; title: string; category: string }[] = [];
  for (const group of site.services) {
    if (group.id === 'related') {
      for (const item of group.items) {
        expected.push({ slug: item.id, title: item.name, category: 'related' });
      }
    } else {
      expected.push({ slug: group.id, title: group.name, category: group.id });
    }
  }

  const problems: string[] = [];
  for (const want of expected) {
    const entry = entries.find((item) => item.id === want.slug);
    if (!entry) {
      problems.push(
        `Missing service entry "${want.slug}" for "${want.title}" (listed in site.ts).`,
      );
      continue;
    }
    if (entry.data['title'] !== want.title) {
      problems.push(
        `Service "${want.slug}" is titled "${String(entry.data['title'])}" but site.ts names it "${want.title}".`,
      );
    }
    if (entry.data['category'] !== want.category) {
      problems.push(
        `Service "${want.slug}" has category "${String(entry.data['category'])}" but site.ts puts it in "${want.category}".`,
      );
    }
  }
  for (const entry of entries) {
    if (!expected.some((want) => want.slug === entry.id)) {
      problems.push(`Service entry "${entry.id}" has no matching service in site.ts.`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Services do not match src/config/site.ts:\n- ${problems.join('\n- ')}`);
  }
}

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const imagePattern = /\.(?:jpe?g|png|webp|avif|gif|svg)$/i;

function collectImagePaths(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') {
    if (imagePattern.test(value)) found.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectImagePaths(item, found);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectImagePaths(item, found);
  }
  return found;
}

/**
 * Astro only resolves `image()` paths when an entry is rendered, so a wrong path would go
 * unnoticed until a page used it. Check that every referenced photo exists at build time.
 */
function assertImagesExist(collection: string, entries: LoadedEntry[]): void {
  const problems: string[] = [];
  for (const entry of entries) {
    if (!entry.filePath) continue;
    for (const path of collectImagePaths(entry.data)) {
      if (!existsSync(resolve(projectRoot, dirname(entry.filePath), path))) {
        problems.push(`${collection}/${entry.id} points to a missing image: ${path}`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`Missing image files:\n- ${problems.join('\n- ')}`);
  }
}

/** Every service a FAQ points to must exist, so no FAQ is orphaned. */
function assertFaqServicesExist(entries: LoadedEntry[]): void {
  const dir = `${contentRoot}services`;
  const known = new Set(
    existsSync(dir) ? readdirSync(dir).map((file) => file.replace(/\.[^.]+$/, '')) : [],
  );
  const problems: string[] = [];
  for (const entry of entries) {
    const refs = Array.isArray(entry.data['services']) ? entry.data['services'] : [];
    for (const ref of refs as { id?: string }[]) {
      if (!ref.id || !known.has(ref.id)) {
        problems.push(`FAQ "${entry.id}" points to unknown service "${String(ref.id)}".`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`FAQs reference services that do not exist:\n- ${problems.join('\n- ')}`);
  }
}

/** Wraps a loader so `check` runs on the loaded entries and can fail the build. */
function withChecks(loader: Loader, check: (entries: LoadedEntry[]) => void): Loader {
  return {
    ...loader,
    load: async (context) => {
      await loader.load(context);
      check(loadedEntries(context));
    },
  };
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

const services = defineCollection({
  loader: withChecks(glob({ pattern: '*.yaml', base: './src/content/services' }), (entries) => {
    assertNoDemoContent('services', entries);
    assertImagesExist('services', entries);
    assertServicesMatchSite(entries);
  }),
  schema: ({ image }) =>
    z.object({
      slug,
      /** Must equal the service name in site.ts. */
      title: z.string().min(3),
      /** Short label for cards and menus, when the full name is long. */
      shortTitle: z.string().min(3).max(40).optional(),
      category: z.enum(serviceCategories),
      order: z.number().int().positive(),
      /** One line, for cards. */
      summary: z.string().min(20).max(160),
      intro: z.string().min(80).max(600),
      whatWeHandle: z.array(z.string().min(5)).min(3).max(8),
      /** Enquiry-led process: you tell us, we propose, we arrange. No turnaround times. */
      howItWorks: z
        .array(z.object({ title: z.string().min(3).max(40), text: z.string().min(20).max(260) }))
        .min(3)
        .max(4),
      whoItsFor: z.array(z.string().min(5)).min(1).max(5).optional(),
      formType: z.enum(formTypes),
      image: z.object({ src: image(), alt: z.string().min(10) }),
      seo,
      demo: z.boolean(),
    }),
});

const packages = defineCollection({
  loader: withChecks(glob({ pattern: '*.yaml', base: './src/content/packages' }), (entries) => {
    assertNoDemoContent('packages', entries);
    assertImagesExist('packages', entries);
  }),
  schema: ({ image }) => {
    const photo = z.object({ src: image(), alt: z.string().min(10) });
    return z
      .object({
        slug,
        title: z.string().min(5),
        /** One line, for cards. */
        summary: z.string().min(20).max(160),
        type: z.enum(packageTypes),
        region: z.enum(regionIds),
        destinations: z.array(z.string().min(2)).min(1),
        duration: z.object({
          days: z.number().int().min(2),
          nights: z.number().int().min(1),
        }),
        themes: z.array(z.enum(themeIds)).min(1).max(4),
        /** Indicative "from" price in whole INR, per person. */
        fromPrice: z.number().int().positive(),
        /** What the price covers, e.g. "per person, twin sharing". */
        priceBasis: z.string().min(10),
        /** Last date the indicative price is shown as valid. Must be in the future at build time. */
        priceValidUntil: z.coerce.date(),
        highlights: z.array(z.string().min(5)).min(4).max(6),
        itinerary: z
          .array(
            z.object({
              day: z.number().int().positive(),
              title: z.string().min(3),
              description: z.string().min(30),
            }),
          )
          .min(2),
        inclusions: z.array(z.string().min(3)).min(3),
        exclusions: z.array(z.string().min(3)).min(3),
        images: z.object({ hero: photo, gallery: z.array(photo).min(1).max(6) }),
        seo,
        featured: z.boolean(),
        demo: z.boolean(),
      })
      .superRefine((pkg, ctx) => {
        if (pkg.duration.days !== pkg.duration.nights + 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['duration'],
            message: `days (${pkg.duration.days}) must equal nights (${pkg.duration.nights}) + 1`,
          });
        }
        if (pkg.itinerary.length !== pkg.duration.days) {
          ctx.addIssue({
            code: 'custom',
            path: ['itinerary'],
            message: `itinerary has ${pkg.itinerary.length} days but duration.days is ${pkg.duration.days}`,
          });
        }
        pkg.itinerary.forEach((item, index) => {
          if (item.day !== index + 1) {
            ctx.addIssue({
              code: 'custom',
              path: ['itinerary', index, 'day'],
              message: `itinerary day numbers must run 1, 2, 3 in order; found ${item.day} at position ${index + 1}`,
            });
          }
        });
        if (regions[pkg.region].type !== pkg.type) {
          ctx.addIssue({
            code: 'custom',
            path: ['region'],
            message: `region "${pkg.region}" is a ${regions[pkg.region].type} region but the package type is ${pkg.type}`,
          });
        }
        if (new Set(pkg.themes).size !== pkg.themes.length) {
          ctx.addIssue({ code: 'custom', path: ['themes'], message: 'themes must not repeat' });
        }
        if (pkg.priceValidUntil.getTime() <= Date.now()) {
          ctx.addIssue({
            code: 'custom',
            path: ['priceValidUntil'],
            message: 'priceValidUntil must be a date in the future; refresh the price or the date',
          });
        }
      });
  },
});

const faqs = defineCollection({
  loader: withChecks(glob({ pattern: '*.md', base: './src/content/faqs' }), (entries) => {
    assertNoDemoContent('faqs', entries);
    assertFaqServicesExist(entries);
  }),
  schema: z.object({
    question: z.string().min(10).max(160),
    /** Service slugs this FAQ appears under. The first is its main service. */
    services: z.array(reference('services')).min(1),
    order: z.number().int().positive(),
    demo: z.boolean(),
  }),
});

export const collections = { services, packages, faqs };
