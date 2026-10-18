export type ToastTone = 'success' | 'info' | 'error';

const ICON: Record<ToastTone, string> = { success: '✓', info: 'i', error: '!' };
const PREFIX: Record<ToastTone, string> = { success: '', info: '', error: 'Error: ' };
const LIFETIME_MS = 8000;

/**
 * Shows a message in the page's toast region (rendered by Toast.astro). The region is a polite
 * live region, so screen readers announce the text without moving focus.
 */
export function showToast(message: string, tone: ToastTone = 'success'): void {
  const region = document.querySelector<HTMLElement>('[data-toast-region]');
  const template = document.querySelector<HTMLTemplateElement>('#toast-template');
  if (!region || !template || !message) return;

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const toast = fragment.querySelector<HTMLElement>('.toast');
  if (!toast) return;
  toast.dataset['tone'] = tone;
  const icon = toast.querySelector('.toast-icon');
  const text = toast.querySelector('.toast-text');
  if (icon) icon.textContent = ICON[tone];
  if (text) text.textContent = `${PREFIX[tone]}${message}`;

  const remove = () => toast.remove();
  toast.querySelector('.toast-close')?.addEventListener('click', remove);
  region.append(toast);
  window.setTimeout(remove, LIFETIME_MS);
}
