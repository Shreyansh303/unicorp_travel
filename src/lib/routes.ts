/**
 * Site routes in one place, so pages, navigation, the footer and tests never spell a path
 * differently. Paths have no trailing slash (the home page is `/`).
 */
import type { PackageEntry, ServiceEntry } from './content';

export const routes = {
  home: '/',
  about: '/about',
  corporate: '/corporate-travel',
  holidays: '/holidays',
  services: '/services',
  planMyTrip: '/plan-my-trip',
  contact: '/contact',
  faqs: '/faqs',
  privacy: '/privacy',
  terms: '/terms',
} as const;

/** Corporate and leisure have their own routes; travel-related services live under /services. */
export function serviceHref(service: Pick<ServiceEntry, 'id' | 'data'>): string {
  switch (service.data.category) {
    case 'corporate':
      return routes.corporate;
    case 'leisure':
      return routes.holidays;
    default:
      return `${routes.services}/${service.id}`;
  }
}

export function packageHref(pkg: Pick<PackageEntry, 'id'>): string {
  return `${routes.holidays}/${pkg.id}`;
}

/** Name for menus and cards: the short title when the full one is long. */
export function serviceLabel(service: Pick<ServiceEntry, 'data'>): string {
  return service.data.shortTitle ?? service.data.title;
}

/** A label as it reads mid-sentence: "visa and passport", while acronyms stay ("FRRO assistance"). */
export function midSentence(label: string): string {
  return /^[A-Z]{2,}/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}
