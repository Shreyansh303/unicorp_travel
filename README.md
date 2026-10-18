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
| M4 Pages (static) | Every public route, from home to legal pages and 404 | Not started |
| M5 Interactive features | Enquiry forms, package filters, "Plan my trip" planner, FAQ accordions, form notices | Not started |
| M6 Motion and polish | Hero sequence, route-line storytelling, page transitions, visual QA at five widths | Not started |
| M7 Quality gates | Performance, accessibility, SEO basics, links and browser checks on every page | Not started |
| M8 Demo deploy and handoff | Preview deploy on Vercel, presenter walkthrough, launch checklist | Not started |

The full plan, with acceptance criteria for each milestone, is in [`docs/demo-roadmap.md`](docs/demo-roadmap.md).

## Tech stack

| Layer | Tool | Version | Why |
|---|---|---|---|
| Framework | Astro (static output) | 7.4.0 | Ships no JavaScript by default. Interactive parts hydrate only where used. |
| Interactive islands | React and `@astrojs/react` | 19.3.1, 7.1.0 | Filters and the multi-step form only. No island exists yet. |
| Styling | Tailwind CSS and `@tailwindcss/vite` | 4.3.3 | Fast iteration, with design tokens as CSS variables. |
| Component motion | Motion (`motion`) | 14.3.0 | Declarative React animation for islands. Installed; not yet imported. |
| Scroll storytelling | GSAP with ScrollTrigger | 3.15.0 | Scroll-linked sequences. Loaded lazily, only where needed. |
| Smooth scroll | Lenis (`lenis`) | 1.3.27 | Works with ScrollTrigger; off under reduced motion. Installed; not yet imported. |
| Page transitions | Astro view transitions (`ClientRouter`) | Part of Astro | Cross-page transitions without a single-page-app router. |
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
| `/` | Home page |
| `/styleguide` | Every design token and component, in every state |
| `/mocks` | Design review index for the mock pages |
| `/mocks/c` | Home page of the chosen direction, built on the design system |
| `/mocks/c/package` | Package page of the chosen direction |

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

## Testing and quality

**Playwright** (`playwright.config.ts`). Both suites run on Desktop Chrome. Before the tests start, Playwright runs `npm run build && npm run preview` on `127.0.0.1:4321`. In CI it retries failed tests once and refuses `test.only`.

**End-to-end tests** (`tests/e2e/`):

- `smoke.spec.ts`: the home page has one `h1`, `lang="en-IN"`, and a robots meta tag that follows the `DEMO` flag.
- `components.spec.ts`: a keyboard pass over the styleguide, with a visible focus ring on every interactive component. It also covers the navigation submenu (Enter, Space and Escape), the dialog (focus trap, Escape, focus returned to the trigger), accordions, filter chips and the mobile drawer. It checks that the floating contact buttons never cover focus or content on the checked pages. Under reduced motion it checks that nothing moves on each page, and that hover and press states do not move. It also checks that every header link is reachable on a phone without JavaScript.

**Accessibility tests** (`tests/a11y/`):

- `home.spec.ts`: axe finds no violations on the home page.
- `styleguide.spec.ts`: axe finds no violations on `/styleguide`, `/mocks/c` and `/mocks/c/package`, at 375 px and 1366 px. The WCAG 2.0 A and AA, 2.1 A and AA, and 2.2 AA rule sets are checked. It also scans the styleguide with the submenu and dialog open, and the mobile drawer when it is open.

**Lighthouse budget** (`lighthouserc.json`, `scripts/lighthouse.mjs`). The budget runs in mobile mode, with a 412 x 823 viewport at 1.75 device pixel ratio, and three runs. The thresholds are:

| Metric | Budget |
|---|---|
| Performance score | at least 0.9 |
| Largest Contentful Paint | at most 2,500 ms |
| Cumulative Layout Shift | below 0.1 (set to 0.0999) |
| Total Blocking Time | at most 200 ms |

The config collects from `dist/` and does not list URLs. Reports go to `.lighthouseci/`, which Git ignores.

Lighthouse needs a Chrome binary. The script uses `CHROME_PATH` if you set it. Otherwise it uses a Chrome installed on the machine. If there is none, it falls back to Playwright's Chromium, which `npx playwright install chromium` installs.

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
- Forms in `src/components/ui/form/`: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `FieldMessage`. Each field has a visible label, a hint and an error message, wired with `aria-describedby`.

**Motion primitives** in `src/components/motion/`:

- `Reveal` and `Stagger` fade and rise content as it scrolls into view.
- `RouteLine` draws an SVG path by animating its stroke. It is the route-line motif.
- `Parallax` drifts an image against the scroll. It never runs on the LCP image.
- `PageTransitions` uses Astro's view transitions for a short cross-fade.
- `gsap-fallback.ts` loads GSAP and ScrollTrigger lazily, after first paint. It does this only where the browser lacks CSS scroll-driven animation, the visitor has not asked for reduced motion, and the page has something to animate.

**Motion rules.**

- Animate only `transform` and `opacity`, plus the SVG stroke for the route line.
- The LCP element is visible in the HTML from the start. Animation decorates it and never delays it.
- Under `prefers-reduced-motion`, nothing moves: no smooth scroll, no parallax and no reveal.
- No auto-advancing carousels.

**Accessibility baseline.**

- A visible focus ring on every interactive element (`:focus-visible`).
- Navigation submenus, the dialog and accordions work with the keyboard.
- Touch targets are at least 24 px square (the WCAG 2.5.8 minimum). Buttons and filter chips use the 44 px `--tap` token as their minimum height.

The styleguide at `/styleguide` shows the full system.

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
│   ├── lighthouse.mjs          Runs the Lighthouse budget (test:perf)
│   ├── vercel-noindex-header.mjs   Adds the X-Robots-Tag route when DEMO is on
│   └── test-content.mjs        Checks the demo-content rule (test:content)
├── src/
│   ├── assets/photos/          Licensed photos, optimised at build time
│   ├── components/
│   │   ├── motion/             Reveal, Stagger, RouteLine, Parallax, page transitions
│   │   └── ui/                 UI components; form/ holds the form fields
│   ├── config/
│   │   ├── site.ts             Every business fact and the link helpers
│   │   └── env.ts              The DEMO flag
│   ├── content/                Services (11), sample packages (8) and FAQs (36)
│   ├── content.config.ts       Collection schemas, the demo rule and data checks
│   ├── layouts/
│   │   └── BaseLayout.astro    Page shell: lang, robots meta, head tags
│   ├── lib/
│   │   ├── format.ts           Indian rupee formatting
│   │   ├── contrast.ts         WCAG contrast maths for the styleguide
│   │   ├── packages.ts         Package regions, themes and budget bands
│   │   ├── content.ts          Typed access to content collections
│   │   └── seo.ts              Page titles with the brand suffix from site.ts
│   ├── pages/
│   │   ├── index.astro         Home page
│   │   ├── styleguide.astro    Design system reference
│   │   └── mocks/              Design review pages for the chosen direction
│   └── styles/
│       ├── tokens.css          Design tokens, including motion
│       └── global.css          Base styles, focus, reduced-motion rules
└── tests/
    ├── e2e/                    smoke.spec.ts, components.spec.ts
    └── a11y/                   home.spec.ts, styleguide.spec.ts
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
