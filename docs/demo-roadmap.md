# Unicorp Travel: demo website roadmap

Build a new, design-led, animated information website for Unicorp Travel as a client demo. It replaces the current WordPress site entirely; nothing from the old site carries over except verified business facts.

Prepared 2026-10-18 from the website audit of unicorptravel.com (17-18 October 2026).

- **Audit doc (client-facing):** https://claude.ai/code/artifact/cd8d2fc3-29b4-4427-9bf7-512b2468b04b
- **Local copy of the audit:** `D:/Programming/unicorp_travel/.orchestrator-research/results/DRAFT.md`. P-ids (problems) and F-ids (features) below refer to it.

## Decisions

Confirmed with the user on 2026-10-18 (M0).

| Decision | Choice |
|---|---|
| Stack | Astro with React islands, as in section 2: Tailwind CSS, Motion, GSAP with ScrollTrigger, optional Lenis, Zod content collections, Playwright with axe, Lighthouse budget. Next.js is not used. |
| Display name | "Unicorp Travel", everywhere. The legal name appears only in the facts block (F-09) and the footer. |
| Creative direction | "The journey" route-line direction from section 6. M2 mocks 2 or 3 variations of it for the user to pick from. |
| Visual direction (M2) | Mock C "Monsoon" (warm, expressive, holiday-first; Bricolage Grotesque and Figtree; route line looping through arched photos), recoloured to Unicorp's brand colours: mainly red, black and white. The reference red is `#ED0000`, the dominant colour on the old site. Chosen by the user on 2026-10-18. |
| Hero photos (after M6) | /holidays, /services and /plan-my-trip get a slow crossfade of photos in the hero, about 5 s per photo, without a pause button (the user removed it on 2026-10-19, accepting that this falls short of WCAG 2.2.2). This is the only exception to the no-carousel rule in section 6. Requested by the user on 2026-10-19. |
| Home hero photos (mobile redesign) | Home gets the same crossfade at every width: Udaipur, Kerala backwaters, Tegalalang (Bali), Marina Bay (Singapore) and the Swiss Alps, each with a destination chip that changes with the photo. Only photos whose location the credits confirm are captioned. Requested by the user on 2026-10-21. |
| Sample content labels | Sample content (`demo: true`) is no longer labelled on the page (user decision, 2026-10-25). It stays blocked from production by the `DEMO=false` build failure. |
| Preview hosting | Vercel. `X-Robots-Tag` set in `vercel.json`, driven by the `DEMO` flag. The user signs in to the Vercel CLI; deploys happen only with the user's approval. |

---

## 1. Brief

| Item | Decision |
|---|---|
| What | A brand-new marketing and information website about the business. Design-heavy, with rich animation. |
| Not in scope | Any buying: no cart, checkout, payments, online booking, prices payable online, user accounts or logins. No CMS for the demo. |
| Features in scope | F-01, F-02, F-03, F-04, F-09, F-10, F-13, F-14, F-15 (section 4). |
| Features out of scope | F-05, F-06, F-07, F-08, F-11, F-12, F-16 to F-19. The site structure may leave room for them later; do not build them. |
| Office address | Noida (client confirmed on 2026-10-18). See section 3. |
| Audience | Corporate travel buyers (HR, admin, finance teams) and leisure travellers in Delhi NCR. |
| Primary goal | Every page leads to an enquiry: form, callback, WhatsApp or call. |
| Demo status | The demo is not the launch. It must not be indexed by search engines (section 7, M8). |

---

## 2. Recommended stack

Use a static-first site with interactive "islands". The old site's main technical failures were weight and speed: mobile Lighthouse performance was 56 to 59 and mobile LCP 10.1 s to 16.5 s (P-26 to P-31). A design-heavy site must not repeat that.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro** with **React** islands | Ships zero JS by default; interactive parts (filters, multi-step form) hydrate only where used. Built-in view transitions and content collections. |
| Styling | **Tailwind CSS** with design tokens as CSS variables | Fast iteration; tokens keep the design system consistent. |
| Component motion | **Motion** (`motion` package) | Declarative React animations for islands: layout, presence, gestures. |
| Scroll storytelling | **GSAP** with ScrollTrigger | Timeline and scroll-linked sequences for hero and section storytelling. |
| Smooth scroll | **Lenis** (optional) | Smooth scrolling that works with ScrollTrigger; disable under reduced motion. |
| Page transitions | Astro view transitions | Native cross-page transitions without a single-page-app router. |
| Content | Astro content collections, validated with **Zod** schemas | Packages, services and FAQs as typed data files; build fails on bad data. |
| Testing | **Playwright** + **@axe-core/playwright**; **Lighthouse** CI budget | End-to-end checks, automated accessibility and performance budgets. |
| Hosting (demo) | Any static host with preview URLs (Vercel, Netlify or Cloudflare Pages) | Static output, shareable preview link, header control for `noindex`. |

Latest stable versions on npm on 2026-10-18 (for reference; use the then-current stable releases and pin them in `package.json`):

| Package | Version | Licence |
|---|---|---|
| astro | 7.4.0 | MIT |
| @astrojs/react | 7.1.0 | MIT |
| react | 19.3.1 | MIT |
| tailwindcss | 4.3.3 | MIT |
| motion | 14.3.0 | MIT |
| gsap | 3.15.0 | GSAP Standard "no charge" licence (read https://gsap.com/standard-license before use) |
| lenis | 1.3.27 | MIT |
| zod | 4.6.7 | MIT |
| @playwright/test | 1.64.1 | Apache-2.0 |
| @axe-core/playwright | 4.14.0 | MPL-2.0 |

Alternative if the team prefers it: Next.js (16.4.2 on 2026-10-18) with static export. It works, but ships more JavaScript by default, so the performance budget is harder to hold. Pick one before M1 and do not mix.

---

## 3. Verified business facts (single source of truth)

Put every fact below in **one** file (for example `src/config/site.ts`) and read it everywhere: header, footer, contact page, structured data, forms, WhatsApp links. This is F-15 and fixes P-06, P-16 and P-38. Items marked **Confirm** must be confirmed by the client before launch; the demo may show them.

| Fact | Value | Source | Status |
|---|---|---|---|
| Display name | "Unicorp Travel" (working name) | Old site and domain | **Confirm**: the old site used five name forms (P-06). |
| Legal name | Unicorp Holidays & Business Travel Private Limited | Company registry (Zauba Corp, MCA data) | **Confirm** how it should appear. |
| CIN | U74140DL2014PTC272416 | Company registry | **Confirm** before showing it. |
| GSTIN | Not available | IndiaMART shows one; not copied | **Client to supply.** |
| Office (operating) | 16th Floor Office No.7, A Silver Wing, Wave one Noida, Plot No L-2A, Sector 18, Noida, Uttar Pradesh 201301 | Google Maps listing (located in Wave Mall); client confirmed Noida on 2026-10-18 | **Confirm** the exact formatting. |
| Registered office | Bhikaji Cama Place, New Delhi | Company registry | **Confirm** whether to show it. |
| Phone (mobile, also WhatsApp) | +91 98916 77321 | Old site and Google listing | Consistent in both sources. |
| Phone (landline) | +91 120 4201591 | Old site (listed with the old Ghaziabad address) | **Confirm** it still works at Noida. |
| Phone (second mobile) | +91 98100 82665 | Old site | **Confirm.** |
| Email | info@unicorptravel.com | Old site | **Confirm.** |
| Hours | Saturday 10 am to 7 pm; opens 10 am Monday. Other days unknown. | Google listing, viewed 2026-10-17 | **Client to supply** the full week. |
| Social profiles | Facebook page exists (facebook.com/unicorptravel); no others known | Facebook | **Client to supply.** Show no icon for a profile that is not supplied. |
| Founding year | Unknown: registry says incorporated 9 Oct 2014; old site said "Established in 2024" | Registry vs old site | **Do not show** until confirmed (P-03). |
| Memberships (IATA, TAAI and so on) | None verified | n/a | **Do not show** badges until the client supplies proof (P-50). |
| Counters ("48+ Google Review" and others) | Unsourced | Old site | **Do not use** (P-02). |
| Testimonials and client logos | Permission unknown | Old site | **Do not use** in the demo. |

Services, as listed on the old site (rewrite all copy; P-04, P-07):

- **Corporate travel:** travel management, travel-policy adherence, supplier negotiations, dedicated team and travel implant, 24/7 support (**confirm** the 24/7 claim).
- **Leisure travel:** domestic and international holidays.
- **Travel-related services:** visa and passport assistance; hotel reservations; foreign exchange facilitation; travel insurance; cruise reservations; MICE (meetings, incentives, conferences, events); car and coach rentals; international rail reservations; FRRO (Foreigners Regional Registration Office) assistance.

---

## 4. Features in scope

| ID | Feature | Demo behaviour | Acceptance criteria |
|---|---|---|---|
| F-01 | Service-specific enquiry forms | One form component, configured per service (field sets for visa, hotel, MICE, corporate account and so on). Fields: name, phone, email, travel dates, travellers, budget band, message; GSTIN and company name on corporate forms. | Every field has a visible label and error message; phone accepts Indian formats; submit works by keyboard; success state shown. |
| F-02 | Callback request, WhatsApp, click-to-call, business hours | Callback form (name, phone, preferred time, topic) on every service and package page. Floating WhatsApp and call buttons that never cover content (P-21). Hours from the site config. | `tel:+91...` links; `https://wa.me/919891677321?text=...` with a page-specific pre-filled message; buttons stay clear of text at 375 px width. |
| F-03 | Holiday package pages | Listing plus one detail page per package: hero, highlights, day-wise itinerary, inclusions and exclusions, an indicative "from" price with a validity date, and an enquiry form pre-filled with the package. No booking button. | 6 to 8 sample packages (mix of domestic and international); every sample marked `demo: true` and blocked from production (section 5). |
| F-04 | Package search and filters | Client-side filtering by destination type (domestic or international), region, duration, budget band and theme (honeymoon, family, adventure, wildlife and so on). | Filters sync to the URL query string (shareable, back button works); result count announced to screen readers; empty state with a "Plan my trip" link. |
| F-09 | Company facts and credentials block | A block on About and Contact (and in the footer, condensed): legal name, CIN, GSTIN, offices. Membership badges render only when the config has proof data. | Nothing renders for a missing fact (no blanks, no "#" links). |
| F-10 | FAQs | Short FAQ section on each service page plus an `/faqs` page that aggregates them. | Accessible accordion (button, `aria-expanded`, keyboard); FAQ text written as demo copy and marked for client review; FAQPage structured data only after the client approves the answers. |
| F-13 | "Plan my trip" guided request | A 4 to 5 step form: trip type, destination ideas, dates and flexibility, travellers, budget and interests, then contact details and consent. Progress indicator, back and forward, summary before sending. | Works without a mouse; state survives a page refresh (session storage); each step validates before moving on. |
| F-14 | Privacy notice, consent, legal pages | `/privacy` and `/terms` pages; a short purpose notice beside every form; a separate, unticked marketing opt-in. | Pages exist and are linked from the footer (fixes P-49); text marked "Draft, pending legal review". No cookie banner is needed while the demo sets no non-essential cookies (see section 6). |
| F-15 | One consistent set of location, hours and profile details | Section 3 config used everywhere, plus TravelAgency structured data from the same file. | A test asserts the address and phone are identical on every page. |

**Form submission in the demo.** There is no backend in the demo. On submit: validate, show a clear success screen, and offer two ways to actually send the request: "Send on WhatsApp" (a `wa.me` link with the form summary pre-filled) and "Email instead" (a `mailto:` link with the summary). The site itself stores nothing. Put the submit logic behind one interface (for example `submitEnquiry(data)`) so a real endpoint can replace it at launch.

---

## 5. Content rules

- **No placeholder text and no theme demo content anywhere** (the old site's biggest problem: P-01, P-09).
- Sample content that the client must replace (packages, prices, FAQ answers, legal text) is allowed in the demo only if:
  1. it lives in the content collections with `demo: true` in its front matter, and
  2. (Changed 2026-10-25, user decision) the page no longer shows a "Sample content" label; the build check below is what keeps samples out of production.
- Add a build check: a production build (`DEMO=false`) fails if any content has `demo: true`. This stops sample data from reaching the launch.
- Write all copy fresh in plain Indian English. One brand name everywhere. No unverifiable claims (no awards, counts, ratings or "best" claims).
- Images: use licensed photography (for example Unsplash or Pexels, both free for commercial use under their own licences). Download and optimise the files; never hot-link. Record each image's source and licence in `docs/image-credits.md`. Avoid third-party brand signage (P-10).
- Map: no live Google Maps iframe on page load (it loads third-party code). Use a static map image or an illustrated map with a "Open in Google Maps" link, or a click-to-load facade.

---

## 6. Design and motion direction

**Creative direction (proposal; refine in M2).** "The journey": a route-line motif, a thin animated path drawn between destinations, runs through the site. It draws on scroll in the hero, links the steps of "Plan my trip", and traces the day-wise itinerary on package pages. Big editorial photography, confident typography and generous space. Two distinct moods share one system: calm and precise for corporate pages, warm and vivid for holidays.

**Design system (build before pages):**
- Tokens as CSS variables: colour (brand, neutrals, semantic), type scale, spacing, radii, shadows, and **motion tokens** (durations, easings, stagger).
- Typography: one display face and one text face, self-hosted, `font-display: swap`, subset to Latin (P-31).
- Components: Button, Link, Section, Card (service, package), Header and Nav (keyboard-operable submenu, P-40), Footer, Form fields (label, hint, error), Stepper, Accordion, Filter chips, Drawer or Dialog, Toast, Breadcrumbs, Facts block.
- A `/styleguide` route in the demo that shows every token and component in every state.

**Motion rules (non-negotiable):**
- Animate only `transform` and `opacity` (plus SVG stroke for the route line). No layout-shifting animation; CLS under 0.1.
- The LCP element (hero heading or image) is visible immediately in HTML; animation decorates it and never delays it (the old site hid hero text until the slider script ran: P-28).
- Respect `prefers-reduced-motion`: replace movement with fades or no animation, and turn off smooth scroll and parallax.
- No auto-advancing carousel or slider, with one exception: the hero photo crossfade on Home, /holidays, /services and /plan-my-trip (user decisions, 2026-10-19 and 2026-10-21). It is a slow opacity crossfade between a few photos, about 5 s per photo. At the user's request it has no pause button, which falls short of WCAG 2.2.2 (pause, stop, hide); reduced motion and keyboard focus inside the hero stop it. The first photo is in the HTML and is the LCP image, and the other photos load after first paint. Under reduced motion the crossfade never starts and the first photo stays. It pauses while the tab is hidden and while keyboard focus is inside the hero. On phones the offer and the call to action come before the photos. Any other carousel still needs visible controls and a pause button (P-24).
- Load GSAP and ScrollTrigger only on pages that use them, and only after first paint.
- Interactions respond within 100 ms; INP under 200 ms.

**Responsive:** design mobile-first at 375 px, then 768, 1024 (the old site broke at 1024 px: P-22), 1366 and 1920. On phones the offer and the call to action come before any decorative hero (P-21).

---

## 7. Milestones

Work through the milestones in order. Each ends with its checks passing; do not start the next until they do. No dates are set.

### M0. Kickoff and decisions
- Read this file and the audit sections "Current problems" and "New features to add".
- Confirm with the user: stack (section 2), display name, creative direction, hosting for the preview.
- **Done when:** decisions are recorded at the top of this file under a "Decisions" heading.

### M1. Foundation
- Scaffold Astro with TypeScript (strict), React integration, Tailwind, ESLint, Prettier.
- Create `src/config/site.ts` with section 3 facts (F-15).
- Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test:e2e` (Playwright), `test:a11y` (axe), `test:perf` (Lighthouse budget).
- Add global `noindex` for the demo: `<meta name="robots" content="noindex, nofollow">` plus an `X-Robots-Tag` header on the host, both driven by a `DEMO` flag.
- Set `lang="en-IN"` (P-39).
- **Done when:** `build`, `lint` and `typecheck` pass on an empty home page.

### M2. Design system and art direction
- 2 or 3 visual directions as static mock pages (home hero plus one inner page); the user picks one.
- Implement tokens, typography and components; build `/styleguide`.
- Motion primitives: Reveal-on-scroll, Stagger, RouteLine (SVG path draw), Parallax image, Page transition. All honour reduced motion.
- **Done when:** the styleguide passes axe with zero violations, keyboard focus is visible on every interactive component, and the user approves the direction.

### M3. Content model and sample content
- Collections with Zod schemas: `services`, `packages`, `faqs`, plus the `demo` flag (section 5).
- Package schema at minimum: slug, title, type (domestic or international), region, destinations, duration (days and nights), themes, fromPrice (INR), priceValidUntil, highlights, itinerary (per day: title, description), inclusions, exclusions, images (with alt text), demo.
- Write the service copy and 6 to 8 sample packages; mark samples `demo: true`.
- **Done when:** the build validates all content and the demo-content check works (fails with `DEMO=false`).

### M4. Pages (static)
Site map:

| Route | Page |
|---|---|
| `/` | Home: offer, services overview, featured packages, why Unicorp (facts only), corporate teaser, enquiry call to action |
| `/about` | About: who we are, how we work, facts block (F-09) |
| `/corporate-travel` | Corporate travel offer, with a corporate enquiry form (F-01) |
| `/holidays` | Package listing with filters (F-03, F-04) |
| `/holidays/[slug]` | Package detail (F-03) |
| `/services` | Travel-related services overview |
| `/services/[slug]` | One page per service: visa and passport, hotels, forex, insurance, cruises, MICE, car and coach, rail, FRRO; each with a form (F-01) and FAQs (F-10) |
| `/plan-my-trip` | Guided request (F-13) |
| `/contact` | Contact details, hours, map link, callback form (F-02, F-15) |
| `/faqs` | All FAQs (F-10) |
| `/privacy`, `/terms` | Legal drafts (F-14) |
| `/404` | Helpful not-found page with search-free navigation to services and holidays |

- Each page: one H1, a unique title and meta description, Open Graph tags (P-34 to P-37).
- **Done when:** every route renders, the link checker finds zero broken or `#` links (P-08, P-14, P-18), and each page has an enquiry route (P-15).

### M5. Interactive features
- F-01 and F-02 forms with the demo submission flow (section 4).
- F-04 filters (URL-synced).
- F-13 multi-step planner.
- F-10 accordions.
- F-14 purpose notices and opt-in on every form.
- **Done when:** Playwright tests cover each feature's acceptance criteria in section 4, including keyboard-only runs.

### M6. Motion and polish
- Hero sequence, route-line storytelling, section reveals, page transitions, hover and press states, form step transitions.
- Visual QA at 375, 768, 1024, 1366 and 1920 px in the browser, with screenshots.
- **Done when:** reduced-motion mode has been checked on every page, and the performance budget (M7) still passes.

### M7. Quality gates
| Area | Budget or check |
|---|---|
| Performance (Lighthouse, mobile) | Performance at least 90; LCP at most 2.5 s; CLS under 0.1; TBT under 200 ms, on every page |
| Weight | Home page under 1 MB transferred on first load; images AVIF or WebP at displayed size with `srcset` (P-29) |
| Accessibility | axe: zero violations on every page; WCAG 2.2 AA contrast (4.5:1 body text); full keyboard path through nav, forms, filters and planner (P-40 to P-44) |
| SEO basics | Unique titles and descriptions, one H1, OG tags, TravelAgency JSON-LD from the site config, XML sitemap generated; `noindex` stays on for the demo |
| Content | No lorem ipsum, no theme leftovers, every sample item marked `demo: true`; spell-check the copy (P-07) |
| Links | Zero broken links and zero `#` hrefs |
| Browsers | Latest Chrome, Firefox, Safari (iOS if available) and Edge |

### M8. Demo deploy and handoff
- Deploy to a preview URL with `noindex` (meta and header).
- Write `docs/demo-walkthrough.md`: a 5-minute script for presenting the demo.
- Write `docs/launch-checklist.md` with the items in section 8.
- **Done when:** the preview URL works on a phone, and all checks from M7 pass on the deployed build.

---

## 8. Launch checklist (after the demo; not part of the demo build)

- Client confirms every **Confirm** item in section 3, supplies hours, GSTIN, photos and real package data; remove all `demo: true` content.
- Legal review of privacy policy and terms; add a cancellation and refund policy for offline bookings if the client wants one (P-52).
- Real form backend (email or CRM), spam protection, a named owner and reply-time target for enquiries.
- Analytics with a consent approach decided (add a cookie notice if non-essential cookies are used).
- Remove `noindex`, submit the sitemap in Google Search Console, link the Google Business Profile.
- 301 redirects from the old URLs: `/about-us-1/`, `/pages/contact-3/`, `/services/`, `/corporate-travel/`, `/leisure-travel/`, `/travel-related-services/`, and the guessable `/about-us/` and `/contact/`.
- Decommission the old WordPress install (its outdated plugins are a risk: P-45).

---

## 9. Do-not-repeat list (from the audit)

| Old problem | Rule for the new site |
|---|---|
| Theme demo pages and filler text published (P-01, P-09) | No placeholder content; samples marked `demo: true` and blocked from production builds (not labelled on the page, user decision 2026-10-25). |
| Unsourced counters, wrong founding year (P-02, P-03) | Show only facts the client can document. |
| US map on the Contact page (P-12) | Map from the verified Noida address only. |
| Dead buttons and `#` links (P-08, P-14, P-18) | Link checker in CI; no icon without a real destination. |
| No enquiry route on service pages (P-15) | Every page ends with an enquiry option. |
| Unlabelled form, no +91 on the call link (P-16, P-17) | Visible labels; `tel:+91...`. |
| Slow, heavy pages (P-26 to P-31) | Performance budget enforced per page. |
| Hidden from search, no sitemap, no descriptions (P-32 to P-37) | SEO basics built in; only the demo is `noindex`. |
| Keyboard and screen-reader barriers (P-40 to P-44) | axe zero violations plus manual keyboard pass. |
| No privacy policy (P-49) | Legal pages and form notices from day one. |

---

## 10. Skills and tools for the building agent

**Install from the Anthropic plugin directory (claude.ai plugin catalog):**

| Plugin | Publisher | Use it for |
|---|---|---|
| frontend-design | Anthropic | Distinctive, production-grade UI implementation. Use it when building the design system and every page. |
| Design | Anthropic | `design-system`, `design-critique`, `ux-copy` and `accessibility-review` skills: critique each milestone's screens, keep tokens consistent, tighten microcopy. |
| Axe Accessibility | Deque Systems | axe MCP server: scan, fix and re-verify accessibility in the build loop (M2, M5, M7). |

Optional: "Website Copywriting & Positioning" (community publisher) for page copy; it is designed never to invent proof, testimonials or urgency.

**Built into Claude Code (no install):**
- The `run` skill: launch the dev server and screenshot pages to confirm changes in the real app.
- The built-in browser pane: preview the dev server (`.claude/launch.json` + `preview_start`), emulate mobile with the resize tool, read console errors, and screenshot at each breakpoint in M6.
- `code-review` and `simplify` skills: review each milestone's diff before committing.
- `security-review`: once before the demo deploy.
- `/init`: create a project `CLAUDE.md` with the stack, the scripts, section 5 (content rules), section 6 (motion rules) and section 9 (do-not-repeat list), so every later session follows them.

**Working method for the agent:**
- One milestone at a time; commit after each milestone's checks pass, with plain descriptive messages.
- Screenshot every page at 375 px and 1366 px after visual changes and compare against the chosen direction.
- Never mark a milestone done without running its checks and seeing them pass.

---

## 11. Kickoff prompt for the building session

> Build the Unicorp Travel demo website described in `D:/Programming/unicorp_travel/docs/demo-roadmap.md`. Start with M0: read the whole roadmap and the audit sections it references, then ask me to confirm the stack, display name, creative direction and preview hosting. Then work through M1 to M8 in order, running each milestone's checks before moving on. Follow sections 5, 6 and 9 as hard rules.
