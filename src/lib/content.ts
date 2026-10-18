/**
 * Typed data access for the content collections. Pages read content through these helpers
 * so that ordering and grouping rules live in one place.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type ServiceEntry = CollectionEntry<'services'>;
export type PackageEntry = CollectionEntry<'packages'>;
export type FaqEntry = CollectionEntry<'faqs'>;
export type ServiceCategory = ServiceEntry['data']['category'];

export const serviceCategoryOrder: readonly ServiceCategory[] = ['corporate', 'leisure', 'related'];

function byServiceOrder(a: ServiceEntry, b: ServiceEntry): number {
  return a.data.order - b.data.order;
}

/** Every service, in display order. */
export async function getServices(): Promise<ServiceEntry[]> {
  return (await getCollection('services')).sort(byServiceOrder);
}

/** Services in one category, in display order. */
export async function getServicesByCategory(category: ServiceCategory): Promise<ServiceEntry[]> {
  return (await getServices()).filter((service) => service.data.category === category);
}

/** Services grouped by category, in the order corporate, leisure, related. */
export async function getServicesGrouped(): Promise<Record<ServiceCategory, ServiceEntry[]>> {
  const services = await getServices();
  return {
    corporate: services.filter((service) => service.data.category === 'corporate'),
    leisure: services.filter((service) => service.data.category === 'leisure'),
    related: services.filter((service) => service.data.category === 'related'),
  };
}

/** FAQs that list this service, in order. A FAQ can appear under more than one service. */
export async function getFaqsForService(slug: string): Promise<FaqEntry[]> {
  const faqs = await getCollection('faqs', (faq) =>
    faq.data.services.some((service) => service.id === slug),
  );
  return faqs.sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}

/** One service with its FAQs, or `undefined` when the slug is unknown. */
export async function getServiceWithFaqs(
  slug: string,
): Promise<{ service: ServiceEntry; faqs: FaqEntry[] } | undefined> {
  const service = await getEntry('services', slug);
  if (!service) return undefined;
  return { service, faqs: await getFaqsForService(slug) };
}

export interface FaqGroup {
  service: ServiceEntry;
  faqs: FaqEntry[];
}

/** All FAQs grouped by service (for the /faqs page). Services without FAQs are left out. */
export async function getFaqsGroupedByService(): Promise<FaqGroup[]> {
  const [services, faqs] = await Promise.all([getServices(), getCollection('faqs')]);
  return services
    .map((service) => ({
      service,
      faqs: faqs
        .filter((faq) => faq.data.services.some((ref) => ref.id === service.id))
        .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id)),
    }))
    .filter((group) => group.faqs.length > 0);
}

export type PackageSort = 'featured' | 'price-asc' | 'price-desc' | 'duration' | 'title';

/** All packages sorted. `featured` puts featured ones first, then the cheapest. */
export async function getPackages(sort: PackageSort = 'featured'): Promise<PackageEntry[]> {
  const items = await getCollection('packages');
  const compare: Record<PackageSort, (a: PackageEntry, b: PackageEntry) => number> = {
    featured: (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) || a.data.fromPrice - b.data.fromPrice,
    'price-asc': (a, b) => a.data.fromPrice - b.data.fromPrice,
    'price-desc': (a, b) => b.data.fromPrice - a.data.fromPrice,
    duration: (a, b) => a.data.duration.days - b.data.duration.days,
    title: (a, b) => a.data.title.localeCompare(b.data.title),
  };
  return items.sort((a, b) => compare[sort](a, b) || a.data.title.localeCompare(b.data.title));
}

/** Packages marked featured, cheapest first. */
export async function getFeaturedPackages(): Promise<PackageEntry[]> {
  return (await getPackages('featured')).filter((item) => item.data.featured);
}

/** One package by slug. */
export async function getPackage(slug: string): Promise<PackageEntry | undefined> {
  return getEntry('packages', slug);
}
