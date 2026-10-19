/**
 * Every public route and every page that shows sample content, derived from the files on disk
 * (src/pages and the content collections), so new pages and entries are covered by the page
 * tests without editing a list. Mirrors src/lib/routes.ts: corporate and leisure have their own
 * routes; related services live under /services.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = join(import.meta.dirname, '..', 'src');
const contentDir = join(srcDir, 'content');
const pagesDir = join(srcDir, 'pages');

interface Entry {
  id: string;
  text: string;
}

function entries(collection: string): Entry[] {
  return readdirSync(join(contentDir, collection))
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.md'))
    .sort()
    .map((file) => ({
      id: file.replace(/\.[^.]+$/, ''),
      text: readFileSync(join(contentDir, collection, file), 'utf8'),
    }));
}

/** A top-level scalar field, e.g. `category: 'related'` gives "related". */
function field(entry: Entry, name: string): string | undefined {
  return new RegExp(`^${name}:\\s*['"]?([^'"\\n#]+?)['"]?\\s*(#.*)?$`, 'm').exec(entry.text)?.[1];
}

/** A top-level list field written as `name:` followed by `  - item` lines. */
function listField(entry: Entry, name: string): string[] {
  const lines = entry.text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trimEnd() === `${name}:`);
  if (start === -1) return [];
  const items: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const match = /^\s+-\s+['"]?([^'"]+?)['"]?\s*$/.exec(line);
    if (!match?.[1]) break;
    items.push(match[1]);
  }
  return items;
}

/** The `slug` field when present (the glob loader uses it as the id), else the file name. */
const slugOf = (entry: Entry) => field(entry, 'slug') ?? entry.id;
const isDemo = (entry: Entry) => field(entry, 'demo') === 'true';

const packages = entries('packages');
const services = entries('services');
const faqs = entries('faqs');
const legal = entries('legal');

/** Page for a service entry: corporate and leisure have their own routes. */
function serviceRoute(entry: Entry): string {
  const category = field(entry, 'category');
  if (category === 'corporate') return '/corporate-travel';
  if (category === 'leisure') return '/holidays';
  return `/services/${slugOf(entry)}`;
}

export const packageRoutes = packages.map((entry) => `/holidays/${slugOf(entry)}`);

export const serviceRoutes = services
  .filter((entry) => field(entry, 'category') === 'related')
  .map((entry) => `/services/${slugOf(entry)}`);

export const legalRoutes = legal.map((entry) => `/${entry.id}`);

/** Static pages from src/pages: `about.astro` is /about, `holidays/index.astro` is /holidays. */
function staticPages(): string[] {
  const internal = new Set(['404', 'styleguide']);
  const found: string[] = [];
  for (const name of readdirSync(pagesDir).sort()) {
    const path = join(pagesDir, name);
    if (statSync(path).isDirectory()) {
      if (existsSync(join(path, 'index.astro'))) found.push(`/${name}`);
    } else if (name.endsWith('.astro') && !name.startsWith('[') && !name.startsWith('_')) {
      const base = name.replace(/\.astro$/, '');
      if (internal.has(base)) continue;
      found.push(base === 'index' ? '/' : `/${base}`);
    }
  }
  return found;
}

export const staticRoutes = staticPages();

/** Every public page (the 404 page is tested on its own). */
export const allRoutes = [
  ...new Set([...staticRoutes, ...packageRoutes, ...serviceRoutes, ...legalRoutes]),
];

/** Slug to demo flag for every package, so tests can check each package card's label. */
export const packageDemo = new Map(packages.map((entry) => [slugOf(entry), isDemo(entry)]));

const corporate = services.find((entry) => field(entry, 'category') === 'corporate');
/** True while the corporate offer is sample content (it then needs a label wherever it shows). */
export const corporateDemo = corporate ? isDemo(corporate) : false;

/** Pages that show sample content, so each must carry the visible "Sample content" label. */
function samplePages(): string[] {
  const pages = new Set<string>();
  for (const entry of packages.filter(isDemo)) {
    pages.add(`/holidays/${slugOf(entry)}`);
    pages.add('/holidays');
    if (field(entry, 'featured') === 'true') pages.add('/');
  }
  for (const entry of services.filter(isDemo)) {
    pages.add(serviceRoute(entry));
    // The corporate offer is summarised on the home, about and services pages.
    if (field(entry, 'category') === 'corporate')
      ['/', '/about', '/services'].forEach((p) => pages.add(p));
  }
  for (const entry of faqs.filter(isDemo)) {
    pages.add('/faqs');
    // FAQs are shown on related service pages and the corporate page (leisure FAQs only on /faqs).
    for (const id of listField(entry, 'services')) {
      const service = services.find((item) => slugOf(item) === id);
      if (service && field(service, 'category') !== 'leisure') pages.add(serviceRoute(service));
    }
  }
  for (const entry of legal.filter(isDemo)) pages.add(`/${entry.id}`);
  return [...pages].sort();
}

export const sampleRoutes = samplePages();
export const demoLegalRoutes = legal.filter(isDemo).map((entry) => `/${entry.id}`);

/** Facts the holiday filters (F-04) work on, read from each package file. */
export interface PackageFacts {
  slug: string;
  title: string;
  type: string;
  region: string;
  days: number;
  fromPrice: number;
  themes: string[];
}

export const packageFacts: PackageFacts[] = packages.map((entry) => ({
  slug: slugOf(entry),
  title: field(entry, 'title') ?? entry.id,
  type: field(entry, 'type') ?? '',
  region: field(entry, 'region') ?? '',
  days: Number(/^\s+days:\s*(\d+)/m.exec(entry.text)?.[1] ?? 0),
  fromPrice: Number(field(entry, 'fromPrice') ?? 0),
  themes: listField(entry, 'themes'),
}));

/** Pages with an enquiry form, and the form type each uses. */
export const enquiryFormPages: { path: string; formType: string }[] = [
  { path: '/corporate-travel', formType: 'corporate' },
  { path: '/contact', formType: 'general' },
  ...services
    .filter((entry) => field(entry, 'category') === 'related')
    .map((entry) => ({
      path: `/services/${slugOf(entry)}`,
      formType: field(entry, 'formType') ?? '',
    })),
  ...packageRoutes.map((path) => ({ path, formType: 'holiday' })),
];

/** Pages with a callback form: every service and package page, and the contact page. */
export const callbackPages = [...enquiryFormPages.map((page) => page.path), '/holidays'];
