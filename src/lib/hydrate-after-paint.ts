/**
 * `client:afterpaint`: hydrate an island once the page's main content has painted and one of the
 * island's children is in the viewport (as `client:visible` does).
 *
 * Use it for an island that can sit inside the first screen but is not the main content, so its
 * framework JavaScript does not compete with the largest contentful paint. It waits for the first
 * `largest-contentful-paint` entry (or `first-contentful-paint` where LCP is not supported), with
 * a timeout so the island still hydrates if neither is ever reported. Registered in
 * astro.config.mjs.
 */
import type { ClientDirective } from 'astro';

declare module 'astro' {
  interface AstroClientDirectives {
    'client:afterpaint'?: boolean;
  }
}

/** Upper bound on the wait for a paint entry, e.g. for a page loaded in a background tab. */
const maxWaitMs = 3000;

function afterFirstPaint(callback: () => void): void {
  const supported =
    typeof PerformanceObserver === 'undefined' ? [] : PerformanceObserver.supportedEntryTypes;
  const type = supported.includes('largest-contentful-paint')
    ? 'largest-contentful-paint'
    : supported.includes('paint')
      ? 'paint'
      : null;
  if (!type) {
    callback();
    return;
  }

  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    observer.disconnect();
    clearTimeout(timer);
    callback();
  };
  const timer = setTimeout(run, maxWaitMs);
  const observer = new PerformanceObserver((list) => {
    const painted = list
      .getEntries()
      .some(
        (entry) => type === 'largest-contentful-paint' || entry.name === 'first-contentful-paint',
      );
    if (painted) run();
  });
  observer.observe({ type, buffered: true });
}

const afterPaintDirective: ClientDirective = (load, _options, el) => {
  afterFirstPaint(() => {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      void load().then((hydrate) => hydrate());
    });
    for (const child of el.children) io.observe(child);
  });
};

export default afterPaintDirective;
