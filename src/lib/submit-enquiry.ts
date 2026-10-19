/**
 * The one place an enquiry is submitted (roadmap section 4, "Form submission in the demo").
 *
 * Every form (enquiry, callback, Plan my trip) builds an `EnquiryData` and calls
 * `submitEnquiry()`. The forms only read the `SubmitResult`, so a real endpoint can replace the
 * demo implementation at launch without touching them: write another `EnquirySubmitter` (for
 * example one that POSTs the data and still returns the hand-off links) and assign it to
 * `activeSubmitter` below.
 *
 * The demo implementation checks the contact details, stores nothing (no network request, no
 * cookie, no storage) and resolves with a summary plus two ways for the visitor to send it
 * themselves: a wa.me link and a mailto link, both built with the site.ts helpers.
 */
import { mailtoHref, shown, site, whatsappHref } from '../config/site';
import { greeting } from './enquiry';
import { isEmail, isName, messages, parseIndianPhone } from './validation';

export type EnquiryKind = 'enquiry' | 'callback' | 'plan';

export interface EnquiryAnswer {
  /** The question as the form asks it, e.g. "Travel date". */
  label: string;
  /** The answer as the visitor would read it. Empty answers are left out of the summary. */
  value: string;
}

export interface EnquiryData {
  kind: EnquiryKind;
  /** What the request is about, mid-sentence: "visa and passport assistance". */
  topic: string;
  /** The page it was sent from, e.g. /services/visa-passport. */
  page: string;
  /** Package slug when the request is about one sample holiday. */
  packageRef?: string;
  contact: { name: string; phone: string; email?: string };
  /** Every other answer, in the order the form asks them. */
  answers: EnquiryAnswer[];
  /** The separate, optional marketing opt-in (F-14). Unticked unless the visitor ticks it. */
  marketingOptIn: boolean;
}

export type ContactField = keyof EnquiryData['contact'];

export interface EnquirySummary {
  /** Email subject, e.g. "Callback request: hotel reservations". */
  subject: string;
  /** The full message, as it appears in WhatsApp and email. */
  text: string;
  /** The summary as label and value pairs, for the success screen. */
  lines: EnquiryAnswer[];
}

export interface EnquiryHandoff {
  /** wa.me link with the summary, or null when no WhatsApp number may be shown. */
  whatsapp: string | null;
  /** mailto link with subject and summary, or null when no email may be shown. */
  email: string | null;
}

export type SubmitResult =
  | { ok: true; summary: EnquirySummary; handoff: EnquiryHandoff }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

export type EnquirySubmitter = (data: EnquiryData) => Promise<SubmitResult>;

const openers: Record<EnquiryKind, (topic: string) => string> = {
  enquiry: (topic) => greeting(`I would like to ask about ${topic}.`),
  callback: (topic) => greeting(`please call me back about ${topic}.`),
  plan: () => greeting('I would like to plan a trip.'),
};

const subjects: Record<EnquiryKind, (topic: string, name: string) => string> = {
  enquiry: (topic) => `Enquiry: ${capitalise(topic)}`,
  callback: (topic) => `Callback request: ${topic}`,
  plan: (_topic, name) => `Plan my trip: ${name}`,
};

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Checks the contact details every request needs. */
export function checkContact(
  contact: EnquiryData['contact'],
): Partial<Record<ContactField, string>> {
  const errors: Partial<Record<ContactField, string>> = {};
  if (!contact.name.trim()) errors.name = messages.name.required;
  else if (!isName(contact.name)) errors.name = messages.name.invalid;
  if (!contact.phone.trim()) errors.phone = messages.phone.required;
  else if (!parseIndianPhone(contact.phone)) errors.phone = messages.phone.invalid;
  if (contact.email?.trim() && !isEmail(contact.email)) errors.email = messages.email.invalid;
  return errors;
}

/** Builds the summary the visitor sends: greeting, contact details, answers, opt-in, page. */
export function summarise(data: EnquiryData): EnquirySummary {
  const phone = parseIndianPhone(data.contact.phone);
  const lines: EnquiryAnswer[] = [
    { label: 'Name', value: data.contact.name.trim() },
    { label: 'Phone', value: phone?.display ?? data.contact.phone.trim() },
    { label: 'Email', value: data.contact.email?.trim() ?? '' },
    ...data.answers.map((answer) => ({ label: answer.label, value: answer.value.trim() })),
    { label: 'Travel ideas and offers', value: data.marketingOptIn ? 'Yes, please' : 'No' },
    ...(data.packageRef ? [{ label: 'Package reference', value: data.packageRef }] : []),
    { label: 'Sent from', value: data.page },
  ].filter((line) => line.value !== '');

  const text = [
    openers[data.kind](data.topic),
    '',
    ...lines.map((line) => `${line.label}: ${line.value}`),
  ].join('\n');

  return { subject: subjects[data.kind](data.topic, data.contact.name.trim()), text, lines };
}

/** Demo: validate, keep nothing, and hand the summary back for WhatsApp or email. */
const demoSubmitter: EnquirySubmitter = async (data) => {
  const errors = checkContact(data.contact);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const summary = summarise(data);
  const mobile = shown(site.phones.mobile);
  const email = shown(site.email);
  return {
    ok: true,
    summary,
    handoff: {
      whatsapp: mobile ? whatsappHref(summary.text, mobile) : null,
      email: email ? mailtoHref(email, { subject: summary.subject, body: summary.text }) : null,
    },
  };
};

/** Replace with the launch implementation; nothing else changes. */
const activeSubmitter: EnquirySubmitter = demoSubmitter;

/** Submits an enquiry. The only submission point on the site. */
export function submitEnquiry(data: EnquiryData): Promise<SubmitResult> {
  return activeSubmitter(data);
}
