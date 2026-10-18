/** A link in the header, drawer or footer. */
export interface NavLink {
  label: string;
  href: string;
  /** Short line shown under the label in a submenu. */
  description?: string;
}

/** A top-level navigation entry: a link, or a button that opens a submenu of links. */
export type NavItem = NavLink | { label: string; children: NavLink[] };

export function hasChildren(item: NavItem): item is { label: string; children: NavLink[] } {
  return 'children' in item;
}

export interface Crumb {
  label: string;
  /** Omit for the current page (the last crumb). */
  href?: string;
}
