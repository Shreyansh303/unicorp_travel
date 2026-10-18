# Unicorp Travel

Demo website for Unicorp Travel, a corporate and leisure travel agency in Noida. It is an information site that leads visitors to an enquiry by form, callback, WhatsApp or phone. There is no booking, payment or login.

> **Demo build.** Search engines are told not to index it, and sample content (packages, prices, FAQ answers, legal text) is labelled on the page and kept out of production builds.

## Status

| Milestone | State |
|---|---|
| M0 Kickoff decisions | Done |
| M1 Foundation (scaffold, facts config, noindex, test scripts) | Done |
| M2 Design system and styleguide | Done |
| M3 Content model and sample content | In progress |
| M4 to M8 (pages, interactive features, motion, quality gates, preview deploy) | Not started |

The full plan is in [`docs/demo-roadmap.md`](docs/demo-roadmap.md).

## Stack

Astro (static output) with React islands, Tailwind CSS v4, Motion and GSAP for animation, Zod-validated content collections, Playwright with axe for tests and Lighthouse for performance budgets. Hosted on Vercel.

## Getting started

Requires Node 22.22 or later (Node 24 LTS recommended).

```bash
npm install
npm run dev
```

Then open:

- `/styleguide`: every design token and component, in every state
- `/mocks/c`: reference home and package pages built on the design system

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build the static site (adds the noindex header for Vercel when `DEMO` is on) |
| `npm run preview` | Serve the built site locally |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run typecheck` | Astro and TypeScript checks |
| `npm run test:e2e` | Playwright end-to-end tests, including keyboard and reduced-motion checks |
| `npm run test:a11y` | Accessibility tests with axe |
| `npm run test:perf` | Lighthouse performance budget (mobile) |

## Design

Unicorp red (`#ED0000`), black and white, with Bricolage Grotesque for headings and Figtree for text, both self-hosted. A thin red route line runs through the site as the visual motif. All tokens, including motion timings, are CSS variables in `src/styles/tokens.css`. Animation uses only transform, opacity and SVG stroke, and stops under `prefers-reduced-motion`.

## Project layout

| Path | Contents |
|---|---|
| `src/config/site.ts` | Every business fact: name, address, phones, email, hours, services |
| `src/config/env.ts` | The `DEMO` flag |
| `src/styles/` | Design tokens and global styles |
| `src/components/ui/` | Components: buttons, cards, header and nav, footer, form fields, accordion, dialog and more |
| `src/components/motion/` | Reveal, stagger, route line, parallax and page transitions |
| `src/assets/photos/` | Licensed photography, credited in `docs/image-credits.md` |
| `tests/` | Playwright end-to-end and accessibility tests |

## Demo flag

`DEMO` defaults to on. It adds `noindex` (meta tag and `X-Robots-Tag` header) and allows sample content. `DEMO=false npm run build` makes a production build. Once the content collections land (M3), that build fails if any sample content remains.

## Business details

Every business fact lives in `src/config/site.ts`. Change it there, never in a page. Facts the client hasn't supplied are left empty, and the site shows nothing for them.

## Docs

- [`docs/demo-roadmap.md`](docs/demo-roadmap.md): scope, decisions, content and design rules, milestones
- [`docs/image-credits.md`](docs/image-credits.md): photo sources and licences
