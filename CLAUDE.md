# Unicorp Travel demo website

An information website for a Noida travel agency. It leads every visitor to an enquiry (form, callback, WhatsApp, call). There is no booking, payment or login. Scope, decisions, milestones and rules live in `docs/demo-roadmap.md`, which is the source of truth; read it before starting work.

## Stack

Astro (static output) with React islands, Tailwind CSS v4 (`@tailwindcss/vite`), Motion, GSAP with ScrollTrigger, Lenis, Zod via `astro/zod`, Playwright with axe, Lighthouse CI. Hosted on Vercel through `@astrojs/vercel`. TypeScript runs in Astro's `strictest` preset. Versions are pinned exactly in `package.json`.

Astro 7 needs Node 22.22 or newer.

## Scripts

| Script              | Purpose                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`       | Dev server                                                                          |
| `npm run build`     | `astro build`, then `scripts/vercel-noindex-header.mjs` (header route when DEMO on) |
| `npm run preview`   | Serve the build                                                                     |
| `npm run lint`      | ESLint (typescript-eslint, astro, jsx-a11y, react-hooks)                            |
| `npm run format`    | Prettier                                                                            |
| `npm run typecheck` | `astro check` and `tsc --noEmit`                                                    |
| `npm run test:e2e`  | Playwright, `tests/e2e`                                                             |
| `npm run test:a11y` | Playwright with axe, `tests/a11y`                                                   |
| `npm run test:perf` | Lighthouse CI, mobile, budget in `lighthouserc.json`                                |

## The DEMO flag

`src/config/env.ts` exports `DEMO`. It is on unless the environment variable `DEMO` is exactly `false`. When on, every page carries `<meta name="robots" content="noindex, nofollow">` (in `BaseLayout.astro`) and the Vercel output config gets an `X-Robots-Tag: noindex, nofollow` header for all paths. A production build uses `DEMO=false`.

## Business facts

Every fact (names, address, phones, email, hours, social profiles, services) comes from `src/config/site.ts`. Never hard-code a phone, address, email or name anywhere else. Use its helpers for `tel:`, `wa.me` and `mailto:` links. A fact that is unknown or must not be shown is `null` or an empty list there, and components render nothing for it.

## Hard rules (summaries; the roadmap sections are the source)

Section 5, content:

- No placeholder text and no theme demo content.
- Sample content (packages, prices, FAQ answers, legal text) is allowed only with `demo: true` in its content-collection entry and a visible "Sample content" label. A `DEMO=false` build must fail if any `demo: true` content exists.
- Write all copy fresh in plain Indian English, one brand name, no unverifiable claims (awards, counts, ratings, "best").
- Photography is licensed, downloaded and optimised, never hot-linked, and credited in `docs/image-credits.md`.
- No live map iframe on load.

Section 6, design and motion:

- Tokens as CSS variables, including motion tokens. One display face and one text face, self-hosted, Latin subset, `font-display: swap`.
- Animate only `transform` and `opacity` (plus SVG stroke for the route line). CLS under 0.1.
- The LCP element is visible in the HTML at once; animation never delays it.
- Respect `prefers-reduced-motion` (no smooth scroll, no parallax).
- No auto-advancing carousel. GSAP and ScrollTrigger load only where used, after first paint.
- Mobile-first at 375 px, then 768, 1024, 1366 and 1920. On phones the offer and call to action come before decoration.

Section 9, do not repeat the old site's mistakes:

- No theme demo or filler content; samples labelled and blocked from production.
- Show only facts the client can document (no unsourced counters, no unconfirmed founding year).
- Maps use the verified Noida address only.
- No dead buttons or `#` links; no icon without a real destination.
- Every page ends with an enquiry option.
- Visible form labels; `tel:+91...` links.
- Enforce the performance budget on every page.
- Build in SEO basics (titles, descriptions, sitemap); only the demo is `noindex`.
- Zero axe violations and a keyboard pass.
- Legal pages and form notices from the start.
