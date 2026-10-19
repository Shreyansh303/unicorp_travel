# Unicorp Travel

Demo website for Unicorp Travel, a corporate and leisure travel agency in Noida. It is an information site for two audiences: corporate travel buyers (HR, admin and finance teams) and leisure travellers in Delhi NCR. Every page leads to an enquiry by form, callback, WhatsApp or phone. There is no booking, payment or login.

> **Demo build.** Search engines are told not to index it (`noindex`), and sample content (packages, prices, FAQ answers, legal text) is labelled on the page. Production builds refuse sample content.

This repository is private.

## Status

| Milestone | What it covers | State |
|---|---|---|
| M0 Kickoff decisions | Stack, display name, creative direction, preview hosting | Done |
| M1 Foundation | Astro scaffold, facts config, `DEMO` flag and noindex, lint and test scripts | Done |
| M2 Design system and art direction | Tokens, components, motion primitives, `/styleguide` | Done |
| M3 Content model and sample content | Zod-validated collections for services, packages and FAQs; sample content; demo-content build check | Done |
| M4 Pages (static) | Every public route, from home to legal pages and 404 | Done |
| M5 Interactive features | Enquiry forms, package filters, "Plan my trip" planner, FAQ accordions, form notices | Done |
| M6 Motion and polish | Hero sequence, route-line storytelling, page transitions, visual QA at five widths | Done |
| M7 Quality gates | Performance, accessibility, SEO basics, links and browser checks on every page | Not started |
| M8 Demo deploy and handoff | Preview deploy on Vercel, presenter walkthrough, launch checklist | Not started |

The full plan, with acceptance criteria for each milestone, is in [`docs/demo-roadmap.md`](docs/demo-roadmap.md).

## Tech stack

| Layer | Tool | Version | Why |
|---|---|---|---|
| Framework | Astro (static output) | 7.4.0 | Ships no JavaScript by default. Interactive parts hydrate only where used. |
| Interactive islands | React and `@astrojs/react` | 19.3.1, 7.1.0 | The "Plan my trip" planner is the one island (`client:visible`). Forms and filters are plain Astro markup with small scripts. |
| Styling | Tailwind CSS and `@tailwindcss/vite` | 4.3.3 | Fast iteration, with design tokens as CSS variables. |
| Component motion | Motion (`motion`) | 14.3.0 | Planner step transitions, through the small `motion/mini` animate function. |
| Scroll storytelling | GSAP with ScrollTrigger | 3.15.0 | Scroll-linked sequences. Loaded lazily, only where needed. |
| Smooth scroll | Lenis (`lenis`) | 1.3.27 | Not used: smooth scrolling hurts responsiveness and keyboard scrolling. Due for removal. |
| Page transitions | Astro view transitions (`ClientRouter`) | Part of Astro | Cross-fade between pages; islands re-initialise on `astro:page-load`. |
| Content | Astro content collections, validated with Zod | Part of Astro | Typed data files; a bad entry fails the build. Zod is imported from `astro/zod`. |
| Fonts | `@fontsource-variable` Bricolage Grotesque and Figtree | 5.3.0 each | Self-hosted, Latin subset. |
| Hosting | Vercel through `@astrojs/vercel` | 11.0.15 | Static output with preview URLs and control over response headers. |
| Sitemap | `@astrojs/sitemap` | 3.7.4 | Installed; not yet added to `astro.config.mjs`. |
| Language | TypeScript (Astro `strictest` preset) | 6.0.3 | Strict typing across the project. |
| Type checks | `@astrojs/check` | 0.9.10 | Checks Astro files; runs with `tsc`. |
| Linting | ESLint 10 with typescript-eslint, eslint-plugin-astro, jsx-a11y and react-hooks | 10.13.0, 8.71.2, 3.2.1, 6.10.2, 7.1.1 | Code and accessibility lint rules. |
| Formatting | Prettier with the Astro and Tailwind plugins | 3.9.10 | One style across code and markup. |
| End-to-end and accessibility tests | Playwright and `@axe-core/playwright` | 1.64.1, 4.14.0 | Browser tests, keyboard checks and automated accessibility scans. |
| Performance budget | Lighthouse CI (`@lhci/cli`) | 0.15.1 | Mobile performance budget. |

All versions are pinned exactly in `package.json`.

## Requirements

- **Node.js 22.22 or later.** The `engines` field in `package.json` sets this minimum. Node 24 LTS is recommended.
- **npm.** It ships with Node. The repository includes `package-lock.json`, so use `npm install` (or `npm ci` for a clean install).
- **Playwright's Chromium**, for the test suites:

  ```bash
  npx playwright install chromium
  ```

- **Chrome** (optional), for the Lighthouse budget. See [Testing and quality](#testing-and-quality).

## Getting started

```bash
npm install
npm run dev
```

The dev server prints its local address (Astro's default is `http://localhost:4321`). These pages are useful from the start:

| Path | What it shows |
|---|---|
| `/` | Home: offer, services, featured sample holidays, corporate teaser |
| `/holidays`, `/holidays/<slug>` | Sample holiday listing and one page per package |
| `/corporate-travel` | Corporate travel offer, with FAQs |
| `/services`, `/services/<slug>` | Travel-related services and one page per service, with FAQs |
| `/plan-my-trip` | The five-step guided trip request, plus the direct routes |
| `/about`, `/contact`, `/faqs` | Company, contact details with a map link, all FAQs |
| `/privacy`, `/terms` | Legal drafts, pending legal review |
| `/styleguide` | Every design token and component, in every state (internal, not linked) |

Every page ends with an enquiry band (WhatsApp, call and a link to Plan my trip or Contact) and has the floating WhatsApp and call buttons with a page-specific message. Service, package, corporate and contact pages also carry an enquiry form and a call-back request, and `/holidays` has filters. Unknown paths show the 404 page.

Stop the dev server before running the test suites. Playwright reuses a server that is already running on port 4321 when it is not in CI, so the tests would run against the dev server instead of the build.

## Scripts

All scripts are defined in `package.json`.

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `astro dev` | Starts the dev server with hot reload. |
| `npm run build` | `astro build`, then `node scripts/vercel-noindex-header.mjs` | Builds the static site to `dist/` and the Vercel output to `.vercel/output/`. The second step adds the noindex header when `DEMO` is on. |
| `npm run preview` | `astro preview` | Serves the last build locally. Run `npm run build` first. |
| `npm run lint` | `eslint .` | Runs ESLint over the whole project. |
| `npm run format` | `prettier --write .` | Formats the project in place. It rewrites files. |
| `npm run typecheck` | `astro check && tsc --noEmit` | Checks Astro and TypeScript types. |
| `npm run test:e2e` | `playwright test --project=e2e` | Runs the end-to-end tests in `tests/e2e/`. |
| `npm run test:a11y` | `playwright test --project=a11y` | Runs the axe accessibility tests in `tests/a11y/`. |
| `npm run test:perf` | `node scripts/lighthouse.mjs` | Runs the Lighthouse mobile budget against `dist/`. Builds first if `dist/index.html` is missing. |
| `npm run test:content` | `node scripts/test-content.mjs` | Checks the demo-content rule with two real builds. The `DEMO=false` build must fail and name the entries with `demo: true`. The default build must pass. Builds go to a temporary folder, so `dist/` and `.vercel/` are not touched. |
| `npm run test:links` | `node scripts/check-links.mjs` | Crawls every HTML file in `dist/` and fails on a broken internal `href`, `src` or `srcset`, a missing `#fragment`, an empty or `#` href, a `javascript:` link, an `<a>` without `href`, or a malformed external link (`tel:` must start `tel:+91`, `wa.me` must use the number in `site.ts`). Run `npm run build` first. |

## Testing and quality

**Playwright** (`playwright.config.ts`). Both suites run on Desktop Chrome. Before the tests start, Playwright runs `npm run build && npm run preview` on `127.0.0.1:4321`. In CI it retries failed tests once and refuses `test.only`.

**End-to-end tests** (`tests/e2e/`):

- `smoke.spec.ts`: the home page has one `h1`, `lang="en-IN"`, and a robots meta tag that follows the `DEMO` flag.
- `pages.spec.ts`: every route (the list is derived from the content collections in `tests/routes.ts`) returns 200 and has one `h1`, a title ending in the brand, a description, Open Graph tags, breadcrumbs on inner pages, an enquiry band with working WhatsApp and call links as the last thing in `main`, the "Sample content" label where sample content appears, and footer address and phones equal to `site.ts` (F-15). Titles and descriptions are unique across all routes. An unknown path returns the 404 page. Canonical, `og:url` and `og:image` are checked when `SITE_URL` is set and must be absent when it is not.
- `components.spec.ts`: a keyboard pass over the styleguide, with a visible focus ring on every interactive component. It also covers the navigation submenu (Enter, Space and Escape), the dialog (focus trap, Escape, focus returned to the trigger), accordions, filter chips and the mobile drawer. At 375 px it checks that the floating contact buttons never cover focus or content on `/`, a package page, `/styleguide`, a service page, `/corporate-travel`, `/contact`, `/holidays` and `/plan-my-trip`, and never cover a form control while errors show. Under reduced motion it checks that nothing moves on `/`, a package page and `/styleguide`, and that hover and press states do not move. It also checks that every header link is reachable on a phone without JavaScript.
- `forms.spec.ts` (F-01, F-02, F-14): table-driven phone (valid and invalid Indian formats), email and GSTIN rules; on every form page, visible labels, an unticked opt-in and a purpose notice tied to the submit button; each service page uses its service's form type. Submitting empty shows each error (`aria-invalid`, `aria-describedby`) and focuses the summary; invalid phone and email are rejected in the browser and valid formats accepted; the corporate GSTIN is checked only when filled; dates may not be in the past. A keyboard-only run fills and submits the visa form and checks that the decoded wa.me and mailto links hold the answers and the page; the package form carries the package name and reference; no network request is made and nothing is stored on submit. The callback form is run by keyboard on a service page and a package page. FAQ accordions on pages with forms work by keyboard. Without JavaScript the forms are hidden and the direct routes remain.
- `filters.spec.ts` (F-04): every chip narrows the list to the packages the content files say match; choices combine (any within a group, all across groups); the query string follows the filters; a shared link, a reload, and back and forward restore them without reloading the page; the live region counts the results; the empty state links to Plan my trip; chips work by keyboard; the phone toggle; without JavaScript every package is listed.
- `planner.spec.ts` (F-13): a keyboard-only run through all five steps, the summary and the hand-off; every step blocks Next until valid and focuses the first problem; a refresh restores the step and the answers; Back keeps them; the summary links back to each step; session storage is cleared after sending.
- `navigation.spec.ts`: after client-side navigation from the home page, focus is on the new page's `h1`, the route announcer reads the new title, the holiday filters narrow the list and write the query string, back restores the unfiltered list and then the home page, and the planner hydrates and moves to step 2.
- `reduced-motion.spec.ts`: on every route and the 404 page, under `prefers-reduced-motion: reduce`, no animation or transition with a duration is running after load or after scrolling to the bottom, and nothing in `main` is left hidden or offset by a reveal, an undrawn route line or a parallax frame.
- `hero-crossfade.spec.ts`: on `/holidays`, `/services` and `/plan-my-trip`, exactly one photo is in the HTML and the rest follow after load; there is no pause button; it keeps changing with the pointer over the hero; keyboard focus inside the hero holds it; there is no second timer after navigating away and back; under reduced motion it never starts.

**Accessibility tests** (`tests/a11y/`):

- `home.spec.ts`: axe finds no violations on the home page.
- `pages.spec.ts`: axe finds no violations on every route and the 404 page, at 375 px and 1366 px, and on `/faqs` with an accordion open.
- `styleguide.spec.ts`: axe finds no violations on `/styleguide` at 375 px and 1366 px, with the submenu and dialog open, and with the mobile drawer open on the home page.
- `forms.spec.ts`: axe finds no violations, at 375 px and 1366 px, on a service page, a package page, `/corporate-travel` and `/contact` with both forms in the error state and on their success screens; on `/holidays` with filters applied and in the empty state; and on every planner step (with and without errors), the summary and the success screen.

All axe scans use the WCAG 2.0 A and AA, 2.1 A and AA, and 2.2 AA rule sets.

**Lighthouse budget** (`lighthouserc.json`, `scripts/lighthouse.mjs`). The budget runs in mobile mode, with a 412 x 823 viewport at 1.75 device pixel ratio, and three runs. The thresholds are:

| Metric | Budget |
|---|---|
| Performance score | at least 0.9 |
| Largest Contentful Paint | at most 2,500 ms |
| Cumulative Layout Shift | below 0.1 (set to 0.0999) |
| Total Blocking Time | at most 200 ms |

The config serves `dist/` and lists its URLs explicitly: home, `/holidays`, one package page, one service page, `/contact` and `/plan-my-trip`. Reports go to `.lighthouseci/`, which Git ignores.

Lighthouse needs a Chrome binary. The script uses `CHROME_PATH` if you set it. Otherwise it uses a Chrome installed on the machine. If there is none, it falls back to Playwright's Chromium, which `npx playwright install chromium` installs.

## SEO and the site origin

`BaseLayout.astro` gives every page a unique `<title>` (built with `pageTitle()` in `src/lib/seo.ts`), a meta description, and the Open Graph tags `og:title`, `og:description`, `og:type`, `og:locale` (`en_IN`) and `og:site_name`.

Canonical links, `og:url` and `og:image` need absolute URLs, so they depend on the environment variable `SITE_URL`, which `astro.config.mjs` passes to Astro as `site`. When it is unset, pages emit no canonical, `og:url` or `og:image` rather than invent a domain. When it is set, the share image is a 1200 x 630 JPEG cut from a licensed photo: the package's hero photo on package pages, the service photo on service and corporate pages, and the Udaipur photo elsewhere. M8 sets `SITE_URL` to the preview URL. JSON-LD and the sitemap come in M7.

## The DEMO flag

`src/config/env.ts` exports `DEMO`. It is on unless the environment variable `DEMO` is exactly `false`. Other values, such as `0`, leave it on.

When `DEMO` is on:

- Every page includes `<meta name="robots" content="noindex, nofollow">`. This is set in `src/layouts/BaseLayout.astro`.
- `scripts/vercel-noindex-header.mjs`, which runs after `astro build`, adds an `X-Robots-Tag: noindex, nofollow` route for all paths to `.vercel/output/config.json`. When `DEMO` is off, the script removes that route if it is present.

To make a production build with the demo off:

```bash
# macOS or Linux
DEMO=false npm run build

# Windows PowerShell
$env:DEMO = "false"; npm run build
```

A production build fails if any content entry has `demo: true`, and the error lists every such entry. The rule lives in `src/content.config.ts`, and `npm run test:content` checks it. Until the client supplies real packages, FAQ answers and confirmations, a `DEMO=false` build is expected to fail.

## Business facts

Every business fact lives in `src/config/site.ts`: names, offices, phone numbers, email, hours, social profiles, memberships and the service list. Components read these facts from there. Never hard-code a phone number, address, email or name in a page or component.

Each fact has a status. The status decides whether the fact is shown.

| Status | Meaning | Shown? |
|---|---|---|
| `verified` | Confirmed by a source the team has checked. | Yes |
| `confirm` | Taken from a source but still to be confirmed by the client before launch. | Yes, in the demo |
| `clientToSupply` | Not yet supplied by the client. | No |
| `doNotShow` | Must not be shown (for example, an unconfirmed founding year). | No |

The helper `shown(fact)` returns the value only for `verified` and `confirm`. A fact with a `null` value, or an empty list, renders nothing: no label, no blank and no link. Opening hours and the full week are currently `clientToSupply`, so they are not displayed yet.

Link helpers in the same file:

- `telHref(phone)` returns a `tel:+91...` link from the E.164 number.
- `whatsappHref(message?, phone?)` returns a `https://wa.me/...` link with an optional encoded message. It uses the verified mobile number by default and throws if no WhatsApp number is configured.
- `mailtoHref(email, { subject, body })` returns a `mailto:` link with optional encoded subject and body.

## Design system

**Palette.** Unicorp red `#ED0000` (`--red-600`, the accent), ink `#141110` (text and focus ring), white, and a warm paper background `#faf7f2`. Warm sand and stone neutrals and semantic success, warning, error and info tones complete the palette.

**Typography.** Bricolage Grotesque for display headings and Figtree for text. Both are self-hosted through `@fontsource-variable`, use the Latin subset, and load with `font-display: swap`.

**Tokens.** `src/styles/tokens.css` holds every design value as a CSS variable: colour, a fluid type scale (`--text-xs` to `--text-display`), spacing, radii, shadows, minimum target size (`--tap`) and motion. The motion tokens are durations from `--duration-instant` (100 ms) to `--duration-route` (2800 ms), and the easings `--ease-out`, `--ease-in-out`, `--ease-bounce` and `--ease-route`. Global styles are in `src/styles/global.css`.

**Components** in `src/components/ui/`:

- Navigation and layout: `Header`, `Footer`, `Breadcrumbs`, `FloatingContact`, `Section`, `Link`.
- Actions and feedback: `Button`, `Dialog`, `Toast` (with `toast.ts`), `Stepper`, `Accordion`, `FilterChips`.
- Content: `ServiceCard`, `PackageCard`, `FactsBlock`, `SampleLabel` (the visible "Sample content" label), `Icon`. Icons are inline line icons based on the Lucide set (ISC licence).
- Page building blocks: `PageHero` (breadcrumbs, the H1, lede and optional photo), `EnquiryBand` (the closing enquiry option on every page, marked `data-enquiry`), `HowItWorks` (numbered steps), `TickList` (inclusions and what we handle) and `MapPanel` (an illustrated office panel with an "Open in Google Maps" link; no map loads on the page).
- Forms in `src/components/ui/form/`: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `FieldMessage`. Each field has a visible label, a hint and an error message, wired with `aria-describedby`. Their look is in `field.css`; buttons, chips and the stepper also keep their look in plain CSS files (`button.css`, `chips.css`, `stepper.css`), so the React planner shares it.

**Motion primitives** in `src/components/motion/`:

- `Reveal` and `Stagger` fade and rise content as it scrolls into view, once. Only elements that start below the fold are armed, so nothing on the first screen is hidden. Any element with `data-reveal` works the same way; section headings use it.
- `RouteLine` draws an SVG path by animating its stroke. It is the route-line motif: it draws on load in the home hero, and on scroll under the home page's trips, down a package's day-by-day itinerary and across the "How it works" steps (from 1024 px).
- `Parallax` drifts an image against the scroll. It never runs on the LCP image.
- `PageTransitions` uses Astro's view transitions for a short cross-fade with a small rise; the header and the floating contact bar hold still. After a client-side navigation focus moves to the new page's `h1` and Astro's route announcer reads the title. Scripts start on `astro:page-load`, so forms, filters and the planner work after navigation.
- `gsap-fallback.ts` loads GSAP and ScrollTrigger lazily, after first paint. It does this only where the browser lacks CSS scroll-driven animation, the visitor has not asked for reduced motion, and the page has something to animate.

**Where motion is used.**

- Hero entrance (`.hero-enter`, `.hero-pop` in `global.css`): the lede, actions and price rise into place; the home tag and photo chip pop in. The `h1` and the hero photo are never animated, and text pieces move without fading.
- Section headings, the enquiry band, "How it works" steps, card grids and itinerary days reveal as they scroll in.
- Hover and press: buttons lift and tilt, cards and tiles lift and press in (`--press-scale-card`), chips press, arrows nudge, package photos zoom. Colours and shadows change at once; only transforms animate.
- Planner steps slide and fade, using the `--duration-base` and `--ease-out` tokens.
- Hero photo crossfade (`HeroCrossfade.astro`, used through `PageHero`'s `photos` prop): four photos in the arch with the route line. Only the first is in the HTML (eager, high priority, the LCP image); the others are inserted by a small script after the page has loaded. It is a slow opacity fade (`--duration-photo-fade`, 1.2 s) with each photo held for `--duration-photo-hold` (5.8 s), so about 7 s per photo. There is no pause button (the client's choice; it falls short of WCAG 2.2.2). It pauses while the tab is hidden and while keyboard focus is inside the hero. Under reduced motion, or without JavaScript, the first photo stays. The timer is cleared before a client-side navigation, so it never doubles up.
**Motion rules.**

- Animate only `transform` and `opacity`, plus the SVG stroke for the route line.
- The LCP element is visible in the HTML from the start. Animation decorates it and never delays it.
- Under `prefers-reduced-motion`, nothing moves: no smooth scroll, no parallax, no reveal, no hero entrance, route lines drawn at once and pages swapped without animation.
- No auto-advancing carousels, with one exception: the hero photo crossfade on `/holidays`, `/services` and `/plan-my-trip` (see below). Any other carousel needs visible controls and a pause button.

**Accessibility baseline.**

- A visible focus ring on every interactive element (`:focus-visible`).
- Navigation submenus, the dialog and accordions work with the keyboard.
- Touch targets are at least 24 px square (the WCAG 2.5.8 minimum). Buttons and filter chips use the 44 px `--tap` token as their minimum height.

The styleguide at `/styleguide` shows the full system.

## Enquiries, filters and the planner

**One submission point.** Every form builds an `EnquiryData` and calls `submitEnquiry()` in `src/lib/submit-enquiry.ts`. The demo implementation checks the contact details, stores nothing, makes no network request, and resolves with a summary plus a wa.me link and a mailto link built with the `site.ts` helpers. The success screen offers "Send on WhatsApp" and "Email instead", so the visitor sends the request themselves. To connect a real endpoint at launch, write another `EnquirySubmitter` and assign it to `activeSubmitter` in that file; the forms do not change.

**Forms** in `src/components/forms/`:

- `EnquiryForm` (F-01): one component configured by a form type. The field sets per type (general, corporate, visa, hotel, forex, insurance, cruise, MICE, transport, rail, FRRO, holiday) are in `src/lib/forms.ts`; services pick theirs with `formType`. Corporate forms check the 15-character GSTIN format when it is filled. On package pages the form is pre-filled with the package name and sends a hidden package reference.
- `CallbackForm` (F-02): name, phone, a preferred time (no clock times while the office hours are not shown in `site.ts`) and a topic set by the page.
- `EnquirySection` places both on `/corporate-travel`, each service page, each package page and `/contact`; `/holidays` has the callback form.
- `form-controller.ts` checks the answers in the browser (Indian phone formats from `src/lib/validation.ts`: a 10-digit mobile starting 6 to 9, or a landline with its STD code, with or without +91 or 0), shows errors under the fields and in a summary that receives focus, and moves focus to the success screen.
- Every form has the purpose notice beside its button and a separate, unticked marketing opt-in whose answer goes into the message (F-14). The copy is in `src/lib/form-copy.ts`.
- Without JavaScript the forms, filters and planner are hidden (`data-needs-js`) and the direct routes that end every page remain.

**Holiday filters** (F-04, `src/components/holidays/`): type, region, length, budget band and theme chips (`aria-pressed`) on top of the server-rendered list. Filters live in the query string, so links can be shared and reload, back and forward restore them. A polite live region reads "Showing 3 of 8 holidays"; a "Clear filters" control and an empty state with a Plan my trip link complete it. Options come from `src/lib/packages.ts`.

**Plan my trip** (F-13, `src/components/planner/`): a React island with five steps (trip type, destinations, dates, travellers with budget and interests, contact and consent), then a summary with a Change button per step. Each step is checked before Next moves on; focus goes to the first problem or to the new step heading. The draft is kept in session storage so a refresh restores it, and is cleared after sending. Step changes slide and fade (transform and opacity only), and not at all under reduced motion.

## Project structure

```
unicorp_travel/
├── astro.config.mjs            Static output, Vercel adapter, React, Tailwind
├── playwright.config.ts        E2E and a11y projects, and the local server they use
├── lighthouserc.json           Lighthouse mobile budget
├── eslint.config.js            ESLint rules
├── prettier.config.mjs         Prettier rules
├── tsconfig.json               TypeScript settings
├── docs/
│   ├── demo-roadmap.md         Scope, decisions, rules and milestones
│   └── image-credits.md        Source and licence for every photo
├── scripts/
│   ├── check-links.mjs         Link checker for dist/ (test:links)
│   ├── lighthouse.mjs          Runs the Lighthouse budget (test:perf)
│   ├── vercel-noindex-header.mjs   Adds the X-Robots-Tag route when DEMO is on
│   └── test-content.mjs        Checks the demo-content rule (test:content)
├── src/
│   ├── assets/photos/          Licensed photos, optimised at build time
│   ├── components/
│   │   ├── forms/              Enquiry and callback forms, notice, success screen, controller
│   │   ├── holidays/           Holiday filters (F-04)
│   │   ├── motion/             Reveal, Stagger, RouteLine, Parallax, page transitions
│   │   ├── planner/            Plan my trip island (F-13)
│   │   └── ui/                 UI components; form/ holds the form fields
│   ├── config/
│   │   ├── site.ts             Every business fact and the link helpers
│   │   └── env.ts              The DEMO flag
│   ├── content/                Services (11), sample packages (8), FAQs (36) and legal drafts (2)
│   ├── content.config.ts       Collection schemas, the demo rule and data checks
│   ├── layouts/
│   │   ├── BaseLayout.astro    Document shell: lang, robots meta, SEO and Open Graph tags
│   │   ├── PageLayout.astro    Public page: header, enquiry band, footer, floating contact
│   │   └── LegalLayout.astro   Privacy and terms pages from the legal collection
│   ├── lib/
│   │   ├── format.ts           Indian rupee formatting
│   │   ├── contrast.ts         WCAG contrast maths for the styleguide
│   │   ├── packages.ts         Package regions, themes and budget bands
│   │   ├── content.ts          Typed access to content collections
│   │   ├── enquiry.ts          Pre-filled WhatsApp and email messages
│   │   ├── forms.ts            Enquiry field sets per form type and callback times
│   │   ├── form-copy.ts        Purpose notice, opt-in and success copy
│   │   ├── submit-enquiry.ts   submitEnquiry(): the one submission point
│   │   ├── validation.ts       Phone, email, GSTIN and date checks
│   │   ├── nav.ts              Header and footer navigation
│   │   ├── routes.ts           Route paths and service and package links
│   │   └── seo.ts              Page titles with the brand suffix from site.ts
│   ├── pages/                  Every route in the site map, plus 404 and the styleguide
│   └── styles/
│       ├── tokens.css          Design tokens, including motion
│       └── global.css          Base styles, focus, reduced-motion rules
└── tests/
    ├── routes.ts               Route list and package facts derived from the content collections
    ├── keyboard.ts             Keyboard and hand-off link helpers
    ├── e2e/                    smoke, components, pages, forms, filters and planner specs
    └── a11y/                   home, styleguide, pages and forms specs
```

## Content rules

The full rules are in sections 5 and 9 of [`docs/demo-roadmap.md`](docs/demo-roadmap.md). In short:

- No placeholder text, lorem ipsum or theme demo content.
- Sample content (packages, prices, FAQ answers, legal text) is allowed only in a content entry marked `demo: true`, and the page shows the "Sample content" label.
- Copy is written fresh in plain Indian English, with one brand name, "Unicorp Travel". No unverifiable claims: no awards, counts, ratings or "best".
- Photos are licensed, downloaded and optimised, never hot-linked, and credited in `docs/image-credits.md`.
- No live map on page load. The map uses the verified Noida address only.
- Show only facts the client can document.
- No dead buttons and no `#` links. Every page ends with an enquiry option.
- Form fields have visible labels. Phone links use `tel:+91...`.
- Legal pages and form notices are part of the demo from the start.

## Deployment

The site builds as static output with `@astrojs/vercel`, so Vercel serves it as static files. The post-build script writes the noindex header into `.vercel/output/config.json`.

The preview deployment is milestone M8 and has not started. Deploys go through the Vercel CLI, signed in to the project owner's Vercel account, and need the owner's approval. Noindex stays on for the demo. Removing it is a launch step, listed in section 8 of the roadmap.

## Contributing workflow

- Work one milestone at a time, in order. A milestone is done only when its checks pass.
- Before committing, run `npm run build`, `npm run lint`, `npm run typecheck` and the test suites that the change affects. Run `npm run test:perf` for changes that affect page weight or layout.
- Write plain, descriptive commit messages.
- Push to `main`.
- Facts go in `src/config/site.ts`, sample content goes in its content collection with `demo: true`, and design values go in `src/styles/tokens.css`. Do not hard-code them in a page.

## Docs and credits

- [`docs/demo-roadmap.md`](docs/demo-roadmap.md): scope, decisions, content and design rules, and milestones.
- [`docs/image-credits.md`](docs/image-credits.md): the source, photographer and licence for every photo. Most photos come from Unsplash under the [Unsplash License](https://unsplash.com/license). One image, `texture-map.jpg`, is public domain, dual-licensed with the Unsplash License.
