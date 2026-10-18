# Unicorp Travel

Demo website for Unicorp Travel, a corporate and leisure travel agency in Noida. It is an information site that leads visitors to an enquiry by form, callback, WhatsApp or phone. There is no booking, payment or login.

> **Demo build.** Search engines are told not to index it, and sample content (packages, prices, FAQ answers, legal text) is labelled on the page and blocked from production builds.

## Stack

Astro with React islands, Tailwind CSS, Motion and GSAP for animation, Zod-validated content collections, Playwright with axe for tests and Lighthouse for performance budgets. Hosted on Vercel.

## Getting started

Requires Node 22.22 or later (Node 24 LTS recommended).

```bash
npm install
npm run dev
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build the static site |
| `npm run preview` | Serve the built site locally |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run typecheck` | Astro and TypeScript checks |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run test:a11y` | Accessibility tests with axe |
| `npm run test:perf` | Lighthouse performance budget |

## Demo flag

`DEMO` defaults to on. It adds `noindex` (meta tag and `X-Robots-Tag` header) and allows sample content. `DEMO=false npm run build` makes a production build, which fails if any sample content remains.

## Business details

Every business fact (name, address, phones, email, hours) lives in `src/config/site.ts`. Change it there, never in a page.

## Docs

- [`docs/demo-roadmap.md`](docs/demo-roadmap.md): scope, decisions, content and design rules, milestones
- [`docs/image-credits.md`](docs/image-credits.md): photo sources and licences
