/**
 * Pre-filled WhatsApp and email messages, so every page asks in the same voice. The brand name
 * comes from site.ts; links are built with the site.ts helpers.
 */
import { mailtoHref, shown, site, telHref, whatsappHref } from '../config/site';

/** "Hello Unicorp Travel, <text>" */
export function greeting(text: string): string {
  return `Hello ${site.displayName}, ${text}`;
}

/** "Hello Unicorp Travel, I would like to know more about <topic>." */
export function enquiryMessage(topic?: string): string {
  return topic
    ? greeting(`I would like to know more about ${topic}.`)
    : greeting('I would like help planning a trip.');
}

/** For links that are not about one page, such as the footer's WhatsApp link. */
export const generalEnquiryMessage = greeting('I have a travel enquiry.');

export function whatsappFor(topic?: string): string {
  return whatsappHref(enquiryMessage(topic));
}

/** The verified mobile, also the WhatsApp number; `null` when it may not be shown. */
export const mobile = shown(site.phones.mobile);
export const callHref = mobile ? telHref(mobile) : null;
export const email = shown(site.email);

export function emailFor(subject: string, body?: string): string | null {
  return email ? mailtoHref(email, body ? { subject, body } : { subject }) : null;
}
