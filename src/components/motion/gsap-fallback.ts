/**
 * Scroll-linked motion (RouteLine scroll drawing, Parallax) runs on CSS scroll-driven animations
 * where the browser supports them, with no JavaScript. Elsewhere this module loads GSAP with
 * ScrollTrigger, lazily (dynamic import) and only after first paint, and only when the page has
 * something to animate and the visitor has not asked for reduced motion.
 */
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

type Setup = (gsap: typeof import('gsap').gsap, ScrollTrigger: typeof ScrollTriggerType) => void;

export function needsGsapFallback(): boolean {
  return (
    !CSS.supports('animation-timeline: view()') &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  );
}

function afterFirstPaint(callback: () => void): void {
  requestAnimationFrame(() => {
    window.setTimeout(callback, 0);
  });
}

let killHooked = false;

/** Runs `setup` with GSAP and ScrollTrigger once they have loaded after first paint. */
export function withGsap(setup: Setup): void {
  afterFirstPaint(async () => {
    let modules;
    try {
      modules = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
    } catch {
      // If GSAP cannot load, show the finished lines rather than leaving them undrawn.
      document.documentElement.classList.remove('gsap-scroll');
      return;
    }
    const [{ gsap }, { ScrollTrigger }] = modules;
    gsap.registerPlugin(ScrollTrigger);
    if (!killHooked) {
      killHooked = true;
      // Clean up before Astro swaps in the next page.
      document.addEventListener('astro:before-swap', () => {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      });
    }
    setup(gsap, ScrollTrigger);
  });
}
