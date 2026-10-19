/**
 * Header and footer navigation, built from the routes and the services collection, so a new
 * service appears in the Services submenu and the footer without editing a list by hand.
 */
import type { NavItem, NavLink } from '../components/ui/types';
import { getServicesByCategory } from './content';
import { routes, serviceHref, serviceLabel } from './routes';

export interface FooterGroup {
  title: string;
  links: NavLink[];
}

/** Links to every travel-related service page, in display order. */
export async function getServiceLinks(): Promise<NavLink[]> {
  const related = await getServicesByCategory('related');
  return related.map((service) => ({
    label: serviceLabel(service),
    href: serviceHref(service),
    description: service.data.summary,
  }));
}

export async function getMainNav(): Promise<NavItem[]> {
  const serviceLinks = await getServiceLinks();
  return [
    { label: 'Holidays', href: routes.holidays },
    { label: 'Corporate travel', href: routes.corporate },
    {
      label: 'Services',
      children: [
        {
          label: 'All services',
          href: routes.services,
          description: 'Visas, forex, insurance, hotels and more',
        },
        ...serviceLinks.map(({ label, href }) => ({ label, href })),
      ],
    },
    { label: 'Plan my trip', href: routes.planMyTrip },
    { label: 'About', href: routes.about },
    { label: 'Contact', href: routes.contact },
  ];
}

export function getFooterGroups(): FooterGroup[] {
  return [
    {
      title: 'Travel',
      links: [
        { label: 'Holidays', href: routes.holidays },
        { label: 'Corporate travel', href: routes.corporate },
        { label: 'Travel services', href: routes.services },
        { label: 'Plan my trip', href: routes.planMyTrip },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: routes.about },
        { label: 'Contact', href: routes.contact },
        { label: 'FAQs', href: routes.faqs },
        { label: 'Privacy', href: routes.privacy },
        { label: 'Terms', href: routes.terms },
      ],
    },
  ];
}
