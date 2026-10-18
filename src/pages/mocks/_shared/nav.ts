/**
 * Navigation for the direction C mock pages and the styleguide. Only routes that exist today
 * (M4 replaces this with the real site navigation).
 */
import type { NavItem, NavLink } from '../../../components/ui/types';

export const mockNav: NavItem[] = [
  {
    label: 'Holidays',
    children: [
      {
        label: 'Kerala backwaters and hills',
        href: '/mocks/c/package',
        description: 'A sample six-day package page',
      },
      {
        label: 'Trips to start dreaming about',
        href: '/mocks/c#packages',
        description: 'Sample holidays on the home mock',
      },
    ],
  },
  { label: 'Services', href: '/mocks/c#services' },
  { label: 'Styleguide', href: '/styleguide' },
  { label: 'All mocks', href: '/mocks' },
];

export const mockFooterGroups: { title: string; links: NavLink[] }[] = [
  {
    title: 'Explore',
    links: [
      { label: 'Home (mock)', href: '/mocks/c' },
      { label: 'Sample package', href: '/mocks/c/package' },
      { label: 'Styleguide', href: '/styleguide' },
    ],
  },
];
