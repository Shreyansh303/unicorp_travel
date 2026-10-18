/**
 * Arms Reveal and Stagger elements that start below the fold, then reveals them as they enter
 * the viewport. Elements already on screen are left alone, so nothing visible ever disappears.
 * Under reduced motion nothing is armed: content simply stays where it is.
 */
let observer: IntersectionObserver | null = null;

export function initReveal(): void {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer?.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );

  const targets: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => targets.push(el));
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      if (child instanceof HTMLElement) {
        child.style.setProperty('--reveal-index', String(index));
        targets.push(child);
      }
    });
  });

  const fold = window.innerHeight;
  targets.forEach((el) => {
    if (el.classList.contains('reveal-armed')) {
      if (!el.classList.contains('is-revealed')) observer?.observe(el);
      return;
    }
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add('reveal-armed');
    observer?.observe(el);
  });
}
