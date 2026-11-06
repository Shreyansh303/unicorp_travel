/**
 * Browser side of the /holidays filters (F-04).
 *
 * State lives in the query string, one repeated parameter per group, e.g.
 * `?type=domestic&theme=family&theme=beach`. Within a group any choice matches; across groups
 * every group must match. Each change pushes a history entry, so back and forward step through
 * filter states, and a reload or a shared link restores them.
 *
 * Astro's view-transition router also listens for popstate and would reload the page for a
 * history step on the same path. A capture listener runs first and keeps those steps on the
 * page; steps to other pages still go to the router.
 */
const groups = ['type', 'region', 'duration', 'budget', 'theme'] as const;
type Group = (typeof groups)[number];
type State = Record<Group, string[]>;

interface Parts {
  root: HTMLElement;
  cards: HTMLElement[];
  count: HTMLElement | null;
  clear: HTMLButtonElement[];
  empty: HTMLElement | null;
  drops: HTMLElement[];
  total: number;
  more: HTMLButtonElement | null;
}

/** Phones show this many matching holidays first; "Show more" reveals the rest. */
const firstBatch = 6;
/** True once the visitor has pressed "Show more" for the current filters. */
let expanded = false;

let current: Parts | null = null;

function find(): Parts | null {
  const root = document.querySelector<HTMLElement>('[data-holiday-filters]');
  if (!root) return null;
  return {
    root,
    cards: Array.from(document.querySelectorAll<HTMLElement>('[data-package]')),
    count: root.querySelector('[data-filter-count]'),
    clear: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filters-clear]')),
    empty: document.querySelector('[data-filter-empty]'),
    drops: Array.from(root.querySelectorAll<HTMLElement>('[data-drop]')),
    total: Number(root.dataset['total'] ?? 0),
    more: document.querySelector<HTMLButtonElement>('[data-show-more]'),
  };
}

function chipsOf(root: HTMLElement, group: Group): HTMLButtonElement[] {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(`[data-chips="${group}"] [data-chip]`),
  );
}

function emptyState(): State {
  return { type: [], region: [], duration: [], budget: [], theme: [] };
}

/** Filters in the URL, keeping only values that have a chip on the page. */
function fromUrl(root: HTMLElement): State {
  const params = new URLSearchParams(location.search);
  const state = emptyState();
  for (const group of groups) {
    const known = new Set(chipsOf(root, group).map((chip) => chip.value));
    state[group] = [...new Set(params.getAll(group))].filter((value) => known.has(value));
  }
  return state;
}

function fromChips(root: HTMLElement): State {
  const state = emptyState();
  for (const group of groups) {
    state[group] = chipsOf(root, group)
      .filter((chip) => chip.getAttribute('aria-pressed') === 'true')
      .map((chip) => chip.value);
  }
  return state;
}

function toSearch(state: State): string {
  const params = new URLSearchParams(location.search);
  for (const group of groups) {
    params.delete(group);
    for (const value of state[group]) params.append(group, value);
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

function matches(card: HTMLElement, state: State): boolean {
  const data = card.dataset;
  const themes = (data['themes'] ?? '').split(' ');
  return (
    (state.type.length === 0 || state.type.includes(data['type'] ?? '')) &&
    (state.region.length === 0 || state.region.includes(data['region'] ?? '')) &&
    (state.duration.length === 0 || state.duration.includes(data['duration'] ?? '')) &&
    (state.budget.length === 0 || state.budget.includes(data['budget'] ?? '')) &&
    (state.theme.length === 0 || state.theme.some((theme) => themes.includes(theme)))
  );
}

function render(parts: Parts, state: State): void {
  for (const group of groups) {
    for (const chip of chipsOf(parts.root, group)) {
      chip.setAttribute('aria-pressed', String(state[group].includes(chip.value)));
    }
  }
  let shown = 0;
  for (const card of parts.cards) {
    const visible = matches(card, state);
    card.hidden = !visible;
    // The class only has an effect on phones (see the page's styles); every card stays in the DOM.
    card.classList.toggle('is-folded', visible && !expanded && shown >= firstBatch);
    if (visible) shown += 1;
  }
  if (parts.more) parts.more.hidden = expanded || shown <= firstBatch;
  const active = groups.reduce((sum, group) => sum + state[group].length, 0);
  const text = `Showing ${shown} of ${parts.total} ${parts.total === 1 ? 'holiday' : 'holidays'}`;
  if (parts.count && parts.count.textContent !== text) parts.count.textContent = text;
  for (const button of parts.clear) {
    // The empty state's own clear button shows with the empty state.
    if (!button.closest('[data-filter-empty]')) button.hidden = active === 0;
  }
  if (parts.empty) parts.empty.hidden = shown > 0;
  // Each dropdown button says how many of its options are on.
  for (const drop of parts.drops) {
    const on = state[drop.dataset['drop'] as Group]?.length ?? 0;
    const button = drop.querySelector<HTMLElement>('[data-drop-btn]');
    const count = drop.querySelector<HTMLElement>('[data-drop-count]');
    button?.classList.toggle('is-active', on > 0);
    if (count) count.textContent = on > 0 ? `(${on})` : '';
  }
}

function update(parts: Parts, state: State): void {
  const search = toSearch(state);
  expanded = false;
  if (search !== location.search) {
    const url = `${location.pathname}${search}${location.hash}`;
    history.pushState({ ...(history.state ?? {}), holidayFilters: true }, '', url);
  }
  render(parts, state);
}

/** Opens one dropdown (or none, with `null`) and closes the rest. */
function openDrop(parts: Parts, which: HTMLElement | null): void {
  for (const drop of parts.drops) {
    const open = drop === which;
    drop.querySelector('[data-drop-btn]')?.setAttribute('aria-expanded', String(open));
    const panel = drop.querySelector<HTMLElement>('[data-drop-panel]');
    if (panel) panel.hidden = !open;
  }
}

function openOne(parts: Parts): HTMLElement | null {
  return (
    parts.drops.find(
      (drop) => drop.querySelector('[data-drop-btn]')?.getAttribute('aria-expanded') === 'true',
    ) ?? null
  );
}

function bind(): void {
  const parts = find();
  current = parts;
  if (!parts || parts.root.dataset['bound']) return;
  parts.root.dataset['bound'] = 'true';

  render(parts, fromUrl(parts.root));

  // Dropdowns: a button opens its list and closes the others; Escape, a click outside or moving
  // focus out of the filters closes it. Picking options keeps the list open.
  for (const drop of parts.drops) {
    drop.querySelector('[data-drop-btn]')?.addEventListener('click', () => {
      openDrop(parts, openOne(parts) === drop ? null : drop);
    });
  }
  parts.root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = openOne(parts);
    if (!open) return;
    openDrop(parts, null);
    open.querySelector<HTMLElement>('[data-drop-btn]')?.focus();
  });
  document.addEventListener('click', (event) => {
    const open = openOne(parts);
    if (open && !open.contains(event.target as Node)) openDrop(parts, null);
  });
  parts.root.addEventListener('focusout', (event) => {
    const next = (event as FocusEvent).relatedTarget as Node | null;
    const open = openOne(parts);
    if (open && next && !open.contains(next)) openDrop(parts, null);
  });

  parts.more?.addEventListener('click', () => {
    expanded = true;
    const firstFolded = parts.cards.find((card) => card.classList.contains('is-folded'));
    render(parts, fromChips(parts.root));
    firstFolded?.querySelector<HTMLElement>('a')?.focus();
  });
  parts.root.addEventListener('chips:change', () => update(parts, fromChips(parts.root)));
  for (const button of parts.clear) {
    button.addEventListener('click', () => {
      update(parts, emptyState());
      // The clear button hides itself, so move focus to the first dropdown button.
      openDrop(parts, null);
      parts.root.querySelector<HTMLElement>('[data-drop-btn]')?.focus();
    });
  }
}

/** The path the filters are bound on, so popstate can tell same-page steps from page changes. */
let pagePath: string | null = null;

window.addEventListener(
  'popstate',
  (event) => {
    const parts = current;
    if (!parts || !document.contains(parts.root) || location.pathname !== pagePath) return;
    event.stopImmediatePropagation();
    render(parts, fromUrl(parts.root));
  },
  { capture: true },
);

document.addEventListener('astro:page-load', () => {
  bind();
  pagePath = current ? location.pathname : null;
});
