/**
 * Browser side of the enquiry and callback forms (F-01, F-02). For every form marked
 * `data-enquiry-form` it:
 * - checks each field on submit (rules come from data attributes set by the components),
 * - shows errors under the fields, tied with aria-describedby and aria-invalid, and an error
 *   summary that receives focus,
 * - builds an EnquiryData and passes it to submitEnquiry, the only submission point,
 * - shows the success screen with the summary and the WhatsApp and email hand-off links, and
 *   moves focus to its heading.
 * Nothing is stored and nothing is sent over the network.
 */
import { iconPaths } from '../ui/icons';
import {
  submitEnquiry,
  type EnquiryAnswer,
  type EnquiryData,
  type EnquiryKind,
  type EnquirySummary,
  type EnquiryHandoff,
  type ContactField,
} from '../../lib/submit-enquiry';
import {
  isCount,
  isEmail,
  isGstin,
  isIsoDate,
  isName,
  messages,
  parseIndianPhone,
  readableDate,
  todayIso,
} from '../../lib/validation';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const contactNames: readonly string[] = ['name', 'phone', 'email'];

function controlsOf(form: HTMLFormElement): Control[] {
  return Array.from(form.querySelectorAll<Control>('input, select, textarea')).filter(
    (control) => control.type !== 'hidden' && !control.disabled,
  );
}

function named(form: HTMLFormElement, name: string): Control | null {
  return form.querySelector<Control>(`[name="${name}"]`);
}

/** The first problem with a field's value, or null when it is fine. */
function problemWith(control: Control, form: HTMLFormElement): string | null {
  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    return control.required && !control.checked
      ? (control.dataset['requiredMessage'] ?? 'Tick this box to continue')
      : null;
  }
  const value = control.value.trim();
  if (!value) {
    if (
      control instanceof HTMLInputElement &&
      control.type === 'date' &&
      control.validity.badInput
    ) {
      return messages.date.invalid;
    }
    return control.required ? (control.dataset['requiredMessage'] ?? 'Answer this question') : null;
  }
  switch (control.dataset['check']) {
    case 'name':
      return isName(value) ? null : messages.name.invalid;
    case 'phone':
      return parseIndianPhone(value) ? null : messages.phone.invalid;
    case 'email':
      return isEmail(value) ? null : messages.email.invalid;
    case 'gstin':
      return isGstin(value) ? null : messages.gstin.invalid;
    case 'count': {
      const min = Number(control.dataset['min'] ?? 1);
      const max = Number(control.dataset['max'] ?? 999);
      return isCount(value, min, max) ? null : messages.count(min, max);
    }
    case 'date-not-past':
    case 'date-after-start': {
      if (!isIsoDate(value)) return messages.date.invalid;
      if (value < todayIso()) return messages.date.past;
      const start = named(form, 'startDate')?.value ?? '';
      if (control.dataset['check'] === 'date-after-start' && isIsoDate(start) && value < start) {
        return messages.date.beforeStart;
      }
      return null;
    }
    default:
      return null;
  }
}

/** The element an error line is added to: the field wrapper, or the checkbox message area. */
function errorHost(control: Control): HTMLElement | null {
  return (
    control.closest('.check')?.querySelector<HTMLElement>('.check-msgs') ??
    control.closest<HTMLElement>('.field, .radios')
  );
}

function describedBy(control: Control, errorId: string, add: boolean): void {
  const ids = (control.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter((item) => item && item !== errorId);
  if (add) ids.push(errorId);
  if (ids.length > 0) control.setAttribute('aria-describedby', ids.join(' '));
  else control.removeAttribute('aria-describedby');
}

function showError(control: Control, message: string): void {
  const errorId = `${control.id}-error`;
  let line = document.getElementById(errorId);
  if (!line) {
    line = document.createElement('p');
    line.id = errorId;
    line.className = 'field-msg field-error';
    line.innerHTML = `<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths['alert-circle']}</svg><span><span class="sr-only">Error: </span><span data-error-text></span></span>`;
    errorHost(control)?.append(line);
  }
  const text = line.querySelector('[data-error-text]');
  if (text) text.textContent = message;
  control.setAttribute('aria-invalid', 'true');
  describedBy(control, errorId, true);
}

function clearError(control: Control): void {
  const errorId = `${control.id}-error`;
  document.getElementById(errorId)?.remove();
  control.removeAttribute('aria-invalid');
  describedBy(control, errorId, false);
}

function renderSummary(form: HTMLFormElement, problems: { control: Control; message: string }[]) {
  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  const title = summary?.querySelector('[data-error-title]');
  const list = summary?.querySelector('[data-error-list]');
  if (!summary || !title || !list) return;
  if (problems.length === 0) {
    summary.hidden = true;
    list.replaceChildren();
    return;
  }
  title.textContent = messages.summary(problems.length);
  list.replaceChildren(
    ...problems.map(({ control, message }) => {
      const item = document.createElement('li');
      item.dataset['for'] = control.id;
      const link = document.createElement('a');
      link.href = `#${control.id}`;
      link.textContent = message;
      item.append(link);
      return item;
    }),
  );
  summary.hidden = false;
}

/** Keeps the summary in step when a field is fixed after a failed submit. */
function dropFromSummary(form: HTMLFormElement, control: Control): void {
  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  summary?.querySelector(`[data-for="${control.id}"]`)?.remove();
  const remaining = summary?.querySelectorAll('[data-error-list] li').length ?? 0;
  const title = summary?.querySelector('[data-error-title]');
  if (summary && remaining === 0) summary.hidden = true;
  else if (title) title.textContent = messages.summary(remaining);
}

function labelOf(control: Control): string {
  return (
    control.dataset['label'] ??
    control.labels?.[0]?.textContent?.replace('(optional)', '').trim() ??
    control.name
  );
}

/** The answer as the visitor reads it: option text, readable dates, trimmed text. */
function displayValue(control: Control): string {
  if (control instanceof HTMLSelectElement) {
    return control.value ? (control.selectedOptions[0]?.textContent?.trim() ?? '') : '';
  }
  if (control instanceof HTMLInputElement && control.type === 'date') {
    return control.value ? readableDate(control.value) : '';
  }
  return control.value.trim();
}

function collect(form: HTMLFormElement): EnquiryData {
  const kind = (form.dataset['kind'] ?? 'enquiry') as EnquiryKind;
  const value = (name: string) => named(form, name)?.value.trim() ?? '';
  const topicField = form.querySelector<HTMLInputElement>('[data-topic-field]');
  const answers: EnquiryAnswer[] = controlsOf(form)
    .filter((control) => !contactNames.includes(control.name))
    .filter((control) => control !== topicField)
    .filter((control) => !(control instanceof HTMLInputElement && control.type === 'checkbox'))
    .map((control) => ({ label: labelOf(control), value: displayValue(control) }))
    .filter((answer) => answer.value !== '');
  const packageRef = value('packageRef');
  const email = value('email');
  return {
    kind,
    topic: topicField?.value.trim() || (form.dataset['topic'] ?? ''),
    page: location.pathname,
    ...(packageRef ? { packageRef } : {}),
    contact: { name: value('name'), phone: value('phone'), ...(email ? { email } : {}) },
    answers,
    marketingOptIn: form.querySelector<HTMLInputElement>('[data-optin]')?.checked ?? false,
  };
}

function renderSuccess(
  form: HTMLFormElement,
  summary: EnquirySummary,
  handoff: EnquiryHandoff,
): void {
  const root = form.closest<HTMLElement>('[data-form-root]');
  const success = root?.querySelector<HTMLElement>('[data-success]');
  if (!success) return;
  const list = success.querySelector('[data-summary]');
  list?.replaceChildren(
    ...summary.lines.map((line) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = line.label;
      const detail = document.createElement('dd');
      detail.textContent = line.value;
      row.append(term, detail);
      return row;
    }),
  );
  for (const [key, href] of Object.entries(handoff) as [keyof EnquiryHandoff, string | null][]) {
    const link = success.querySelector<HTMLAnchorElement>(`[data-handoff="${key}"]`);
    if (!link) continue;
    if (href) link.href = href;
    link.hidden = !href;
  }
  form.hidden = true;
  success.hidden = false;
  success.querySelector<HTMLElement>('[data-success-title]')?.focus();
}

async function onSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const problems: { control: Control; message: string }[] = [];
  for (const control of controlsOf(form)) {
    const message = problemWith(control, form);
    if (message) {
      showError(control, message);
      problems.push({ control, message });
    } else {
      clearError(control);
    }
  }
  if (problems.length > 0) {
    renderSummary(form, problems);
    form.querySelector<HTMLElement>('[data-error-summary]')?.focus();
    return;
  }
  renderSummary(form, []);

  const result = await submitEnquiry(collect(form));
  if (!result.ok) {
    const failed = (Object.entries(result.errors) as [ContactField, string][]).flatMap(
      ([name, message]) => {
        const control = named(form, name);
        if (!control) return [];
        showError(control, message);
        return [{ control, message }];
      },
    );
    renderSummary(form, failed);
    form.querySelector<HTMLElement>('[data-error-summary]')?.focus();
    return;
  }
  renderSuccess(form, result.summary, result.handoff);
}

function bind(form: HTMLFormElement): void {
  if (form.dataset['bound']) return;
  form.dataset['bound'] = 'true';
  const today = todayIso();
  form.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach((input) => {
    input.min = today;
  });

  form.addEventListener('submit', (event) => void onSubmit(event));

  // Re-check a field that shows an error as it is corrected, and clear it once fixed. This runs
  // on input, not on blur, so the layout never shifts under a pointer that is pressing a button.
  const recheck = (event: Event) => {
    const control = event.target as Control;
    if (control.getAttribute('aria-invalid') !== 'true') return;
    const message = problemWith(control, form);
    if (message) {
      showError(control, message);
    } else {
      clearError(control);
      dropFromSummary(form, control);
    }
  };
  form.addEventListener('change', recheck);

  form.addEventListener('input', (event) => {
    const control = event.target as HTMLInputElement;
    if (control.dataset['upper'] === 'true') {
      const { selectionStart, selectionEnd } = control;
      control.value = control.value.toUpperCase();
      control.setSelectionRange(selectionStart, selectionEnd);
    }
    recheck(event);
  });

  // Summary links move focus to their field (and keep the URL as it is).
  form.querySelector('[data-error-summary]')?.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    const target = document.getElementById(link.hash.slice(1));
    target?.focus();
    target?.scrollIntoView({ block: 'center' });
  });

  const root = form.closest<HTMLElement>('[data-form-root]');
  root?.querySelector('[data-edit]')?.addEventListener('click', () => {
    const success = root.querySelector<HTMLElement>('[data-success]');
    if (success) success.hidden = true;
    form.hidden = false;
    form.querySelector<Control>('input:not([type="hidden"]), select, textarea')?.focus();
  });
}

document.addEventListener('astro:page-load', () => {
  document.querySelectorAll<HTMLFormElement>('form[data-enquiry-form]').forEach(bind);
});
