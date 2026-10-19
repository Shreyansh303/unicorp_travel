/**
 * State, checks and summary of the Plan my trip planner (F-13). Pure functions, so the island
 * stays small and the rules are easy to test and reason about.
 */
import type { EnquiryAnswer, EnquiryData } from '../../lib/submit-enquiry';
import {
  isCount,
  isEmail,
  isIsoDate,
  isName,
  messages,
  parseIndianPhone,
  readableDate,
  todayIso,
} from '../../lib/validation';

export interface Option {
  value: string;
  label: string;
}

export interface PlanValues {
  tripType: string;
  destinations: string;
  regions: string[];
  departDate: string;
  returnDate: string;
  timing: string;
  flexibility: string;
  adults: string;
  children: string;
  rooms: string;
  budget: string;
  interests: string[];
  name: string;
  phone: string;
  email: string;
  consent: boolean;
  marketing: boolean;
}

export type FieldName = keyof PlanValues;
export type Errors = Partial<Record<FieldName, string>>;

export const initialValues: PlanValues = {
  tripType: '',
  destinations: '',
  regions: [],
  departDate: '',
  returnDate: '',
  timing: '',
  flexibility: '',
  adults: '2',
  children: '0',
  rooms: '1',
  budget: '',
  interests: [],
  name: '',
  phone: '',
  email: '',
  consent: false,
  marketing: false,
};

export const tripTypes: Option[] = [
  { value: 'holiday', label: 'A holiday' },
  { value: 'business', label: 'Business travel' },
  { value: 'group', label: 'A group trip or event' },
  { value: 'unsure', label: 'Not sure yet' },
];

export const flexibilityOptions: Option[] = [
  { value: 'exact', label: 'These exact dates' },
  { value: 'few-days', label: 'A few days either way' },
  { value: 'flexible', label: 'Flexible, any time around then' },
];

export interface StepInfo {
  /** Short name for the progress indicator. */
  label: string;
  /** The step's heading. */
  title: string;
  /** Fields in the order they appear, so focus goes to the first problem. */
  fields: FieldName[];
}

export const steps: StepInfo[] = [
  { label: 'Trip type', title: 'What kind of trip is it?', fields: ['tripType'] },
  {
    label: 'Destinations',
    title: 'Where would you like to go?',
    fields: ['destinations', 'regions'],
  },
  {
    label: 'Dates',
    title: 'When would you like to travel?',
    fields: ['departDate', 'returnDate', 'timing', 'flexibility'],
  },
  {
    label: 'Travellers',
    title: 'Who is travelling, and what do you enjoy?',
    fields: ['adults', 'children', 'rooms', 'budget', 'interests'],
  },
  {
    label: 'Contact',
    title: 'How can we reach you?',
    fields: ['name', 'phone', 'email', 'consent', 'marketing'],
  },
];

export const lastStep = steps.length - 1;
/** The step index of the summary screen shown after the last step. */
export const summaryStep = steps.length;

function count(value: string, min: number, max: number, required: boolean): string | undefined {
  if (!value.trim()) return required ? messages.count(min, max) : undefined;
  return isCount(value, min, max) ? undefined : messages.count(min, max);
}

function date(value: string): string | undefined {
  if (!value) return undefined;
  if (!isIsoDate(value)) return messages.date.invalid;
  return value < todayIso() ? messages.date.past : undefined;
}

/** Problems on one step, keyed by field. Empty when the step can move on. */
export function validateStep(step: number, values: PlanValues): Errors {
  const errors: Errors = {};
  switch (step) {
    case 0:
      if (!values.tripType) errors.tripType = 'Choose the kind of trip';
      break;
    case 1:
      if (!values.destinations.trim() && values.regions.length === 0) {
        errors.destinations = 'Tell us a place or an idea, or pick a region below';
      }
      break;
    case 2: {
      const depart = date(values.departDate);
      if (depart) errors.departDate = depart;
      const back = date(values.returnDate);
      if (back) errors.returnDate = back;
      else if (
        values.returnDate &&
        isIsoDate(values.departDate) &&
        values.returnDate < values.departDate
      ) {
        errors.returnDate = 'Choose a return date on or after the day you leave';
      }
      if (!values.departDate && !values.timing.trim()) {
        errors.departDate = 'Choose the day you leave, or tell us roughly when below';
      }
      if (!values.flexibility) errors.flexibility = 'Choose how fixed the dates are';
      break;
    }
    case 3: {
      const adults = count(values.adults, 1, 99, true);
      if (adults) errors.adults = adults;
      const children = count(values.children, 0, 99, false);
      if (children) errors.children = children;
      const rooms = count(values.rooms, 1, 99, false);
      if (rooms) errors.rooms = rooms;
      if (!values.budget) errors.budget = 'Choose a budget, or "Not sure yet"';
      break;
    }
    case 4:
      if (!values.name.trim()) errors.name = messages.name.required;
      else if (!isName(values.name)) errors.name = messages.name.invalid;
      if (!values.phone.trim()) errors.phone = messages.phone.required;
      else if (!parseIndianPhone(values.phone)) errors.phone = messages.phone.invalid;
      if (values.email.trim() && !isEmail(values.email)) errors.email = messages.email.invalid;
      if (!values.consent) errors.consent = 'Tick the box so we can use your details to reply';
      break;
    default:
      break;
  }
  return errors;
}

/** The first step that is not complete, so a restored draft never skips a check. */
export function firstInvalidStep(values: PlanValues, upTo: number): number {
  for (let step = 0; step < Math.min(upTo, steps.length); step += 1) {
    if (Object.keys(validateStep(step, values)).length > 0) return step;
  }
  return upTo;
}

export interface Lists {
  regions: Option[];
  themes: Option[];
  budgets: Option[];
}

function labelFor(options: Option[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function list(options: Option[], values: string[]): string {
  return values.map((value) => labelFor(options, value)).join(', ');
}

/** Answers per step, for the summary screen and the message. */
export function answersByStep(values: PlanValues, lists: Lists): EnquiryAnswer[][] {
  const dates = [
    values.departDate && `leaving ${readableDate(values.departDate)}`,
    values.returnDate && `back ${readableDate(values.returnDate)}`,
  ]
    .filter(Boolean)
    .join(', ');
  const travellers = [
    `${values.adults} ${values.adults === '1' ? 'adult' : 'adults'}`,
    values.children && values.children !== '0'
      ? `${values.children} ${values.children === '1' ? 'child' : 'children'}`
      : '',
    values.rooms ? `${values.rooms} ${values.rooms === '1' ? 'room' : 'rooms'}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return [
    [{ label: 'Trip type', value: labelFor(tripTypes, values.tripType) }],
    [
      { label: 'Destination ideas', value: values.destinations.trim() },
      { label: 'Regions', value: list(lists.regions, values.regions) },
    ],
    [
      { label: 'Dates', value: dates },
      { label: 'Roughly when', value: values.timing.trim() },
      { label: 'Flexibility', value: labelFor(flexibilityOptions, values.flexibility) },
    ],
    [
      { label: 'Travellers', value: travellers },
      { label: 'Budget', value: labelFor(lists.budgets, values.budget) },
      { label: 'Interests', value: list(lists.themes, values.interests) },
    ],
    [
      { label: 'Name', value: values.name.trim() },
      { label: 'Phone', value: parseIndianPhone(values.phone)?.display ?? values.phone.trim() },
      { label: 'Email', value: values.email.trim() },
      {
        label: 'Travel ideas and offers',
        value: values.marketing ? 'Yes, please' : 'No',
      },
    ],
  ].map((group) => group.filter((answer) => answer.value !== ''));
}

/** The request handed to submitEnquiry. */
export function toEnquiry(values: PlanValues, lists: Lists, page: string): EnquiryData {
  const email = values.email.trim();
  const answers = answersByStep(values, lists).slice(0, lastStep).flat();
  return {
    kind: 'plan',
    topic: 'planning a trip',
    page,
    contact: { name: values.name.trim(), phone: values.phone.trim(), ...(email ? { email } : {}) },
    answers: [...answers, { label: 'Consent to reply', value: values.consent ? 'Yes' : 'No' }],
    marketingOptIn: values.marketing,
  };
}

// ---------------------------------------------------------------------------
// Draft in session storage: survives a refresh, cleared after a successful send.
// ---------------------------------------------------------------------------

export const storageKey = 'unicorp-travel:plan-my-trip';

export interface Draft {
  step: number;
  values: PlanValues;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Reads the draft, keeping only fields of the right type. */
export function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step?: unknown; values?: Record<string, unknown> };
    if (typeof parsed.step !== 'number' || !parsed.values) return null;
    const values = { ...initialValues };
    for (const key of Object.keys(initialValues) as FieldName[]) {
      const stored = parsed.values[key];
      const fallback = initialValues[key];
      if (typeof fallback === 'string' && typeof stored === 'string') {
        (values[key] as string) = stored;
      } else if (typeof fallback === 'boolean' && typeof stored === 'boolean') {
        (values[key] as boolean) = stored;
      } else if (Array.isArray(fallback) && isStringArray(stored)) {
        (values[key] as string[]) = stored;
      }
    }
    const step = Math.max(0, Math.min(summaryStep, Math.trunc(parsed.step)));
    return { step: firstInvalidStep(values, step), values };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Storage can be full or blocked; the planner still works without it.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Nothing to clear.
  }
}
