/**
 * /chatbot-knowledge.txt: a compact plain-text summary of the site, built at deploy time, to be
 * pasted into the chat assistant's instructions (see docs/chatbot-setup.md). Business facts come
 * from site.ts and only the ones components may show; sample content (demo: true) is left out
 * without comment. Packages and FAQs are added only while the file stays within the size budget.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
  shown,
  site,
  weekdays,
  desksFor,
  whatsappHref,
  type Fact,
  type Phone,
} from '../config/site';
import { getServices } from '../lib/content';
import { packageHref, routes, serviceHref } from '../lib/routes';

/** Characters the file should stay within, so it can be pasted into the bot's instructions. */
const BUDGET = 8000;

// Absolute links when an origin is known: SITE_URL (Astro's site), else the Vercel production
// domain; local builds fall back to paths.
const vercelHost = process.env['VERCEL_PROJECT_PRODUCTION_URL']?.trim();
const origin: string | undefined =
  import.meta.env.SITE || (vercelHost ? `https://${vercelHost}` : undefined);
const link = (path: string): string => (origin ? new URL(path, origin).href : path);

const lines: string[] = [];
const size = (): number => lines.join('\n').length;
const add = (...text: string[]): void => {
  lines.push(...text);
};
const label = (title: string): void => add('', `${title.toUpperCase()}:`);

/** Markdown to plain text on one line. */
function plain(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const phoneText = (phone: Phone): string =>
  phone.whatsapp ? `${phone.display} (WhatsApp too)` : phone.display;

// --- Business facts ---------------------------------------------------------------------------
add(`${site.displayName}, a travel agency in Noida.`);
const legalName = shown(site.legalName);
if (legalName) add(`Company: ${legalName}.`);
const address = shown(site.offices.operating);
if (address) add(`Office: ${address.lines.join(', ')}.`);

const hours = shown(site.hours);
if (hours) {
  const parts = weekdays.flatMap((day) => {
    const entry = hours[day];
    if (!entry || !entry.opens) return [];
    const name = `${day[0]?.toUpperCase()}${day.slice(1)}`;
    return [`${name} ${entry.opens}${entry.closes ? ` to ${entry.closes}` : ''}`];
  });
  if (parts.length > 0) add(`Hours: ${parts.join('; ')}.`);
}

label('How to reach the team');
add(`Enquiry form (guided): ${link(routes.planMyTrip)}`);
add(`Contact page, enquiry form and call-back request: ${link(routes.contact)}`);
const main = shown(site.phones.mobile);
if (main) add(`WhatsApp: ${whatsappHref(undefined, main)}`);
const phones: Phone[] = [];
for (const fact of Object.values(site.phones) as Fact<Phone>[]) {
  const phone = shown(fact);
  if (phone) phones.push(phone);
}
if (phones.length > 0) add(`Phone: ${phones.map(phoneText).join('; ')}.`);
const emails = [...new Set([shown(site.email), shown(site.floatingEmail)])].filter(
  (value): value is string => !!value,
);
if (emails.length > 0) add(`Email: ${emails.join('; ')}.`);

const desks = [...desksFor('contact'), ...desksFor('visa-passport')];
if (desks.length > 0) {
  label('Contact desks');
  for (const desk of desks) {
    const people = desk.people.map((person) => `${person.name} ${person.phone.display}`);
    add(`${desk.name}: ${people.join('; ')}.`);
  }
}

// --- Services ---------------------------------------------------------------------------------
const services = (await getServices()).filter((service) => !service.data.demo);
if (services.length > 0) {
  label('Services');
  for (const service of services) {
    add(`- ${service.data.title}: ${service.data.summary} ${link(serviceHref(service))}`);
  }
}

// --- Company vehicles (car and coach rentals) ---------------------------------------------------
const withVehicles = services.filter((service) => (service.data.vehicles ?? []).length > 0);
if (withVehicles.length > 0) {
  label('Company-owned vehicles, chauffeur-driven');
  for (const service of withVehicles) {
    for (const vehicle of service.data.vehicles ?? []) {
      add(
        `- ${vehicle.name} (${vehicle.edition}): ${vehicle.passengers} passengers. Best for: ${vehicle.bestFor}. ${vehicle.features.join('; ')}. ${link(serviceHref(service))}`,
      );
    }
  }
}
label('Other pages');
add(`- Holiday packages: ${link(routes.holidays)}`);
add(`- All services: ${link(routes.services)}`);
add(`- Frequently asked questions: ${link(routes.faqs)}`);
add(`- About us: ${link(routes.about)}`);

// --- Packages and FAQs, while they fit --------------------------------------------------------
const packages = (await getCollection('packages'))
  .filter((pkg) => !pkg.data.demo)
  .sort((a, b) => a.data.order - b.data.order);
if (packages.length > 0) {
  const start = lines.length;
  label('Holiday packages');
  for (const pkg of packages) {
    const { title, summary, duration } = pkg.data;
    add(`- ${title} (${duration.days} days): ${summary} ${link(packageHref(pkg))}`);
  }
  if (size() > BUDGET) lines.length = start;
}

const faqs = (await getCollection('faqs'))
  .filter((faq) => !faq.data.demo)
  .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
if (faqs.length > 0) {
  const start = lines.length;
  label('Questions and answers');
  let kept = false;
  for (const faq of faqs) {
    const before = lines.length;
    add(`Q: ${faq.data.question}`, `A: ${plain(faq.body ?? '')}`);
    if (size() > BUDGET) {
      lines.length = before;
      break;
    }
    kept = true;
  }
  if (!kept) lines.length = start;
}

export const GET: APIRoute = () =>
  new Response(`${lines.join('\n').trim()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
