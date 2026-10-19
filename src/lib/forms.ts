/**
 * Field sets for the enquiry forms (F-01), the callback form (F-02) and the copy every form
 * shares (F-14). Server components render forms from these specs; the browser code reads the
 * rendered attributes, so this file never has to ship to the client.
 */
import { budgetBands } from './packages';

/** The F-01 field sets a page's enquiry form can use (services pick one with `formType`). */
export const formTypes = [
  'general',
  'corporate',
  'visa',
  'hotel',
  'forex',
  'insurance',
  'cruise',
  'mice',
  'transport',
  'rail',
  'frro',
  'holiday',
] as const;

export type FormType = (typeof formTypes)[number];

export interface Option {
  value: string;
  label: string;
}

export type FieldKind = 'text' | 'textarea' | 'select' | 'date' | 'number';

/** Checks beyond "required", run in the browser by the form controller and by submitEnquiry. */
export type FieldCheck = 'gstin' | 'date-not-past' | 'date-after-start' | 'count';

export interface FieldSpec {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  hint?: string;
  /** Message when a required field is empty, e.g. "Enter the country you are visiting". */
  requiredMessage?: string;
  options?: Option[];
  /** First, empty option of a select. */
  prompt?: string;
  check?: FieldCheck;
  min?: number;
  max?: number;
  autocomplete?: string;
  /** Half width beside another half-width field from 768px. */
  half?: boolean;
  /** Upper-cases the value as it is typed (GSTIN). */
  upper?: boolean;
}

const notSure: Option = { value: 'not-sure', label: 'Not sure yet' };

/** Per-person budget bands for trips, the same bands the holiday filters use. */
export const tripBudgetOptions: Option[] = [
  ...budgetBands.map((band) => ({ value: band.id, label: `${band.label} per person` })),
  notSure,
];

const field = {
  startDate: (label: string, hint?: string): FieldSpec => ({
    name: 'startDate',
    label,
    kind: 'date',
    check: 'date-not-past',
    half: true,
    ...(hint ? { hint } : {}),
  }),
  endDate: (label: string): FieldSpec => ({
    name: 'endDate',
    label,
    kind: 'date',
    check: 'date-after-start',
    half: true,
  }),
  count: (name: string, label: string, options: Partial<FieldSpec> = {}): FieldSpec => ({
    name,
    label,
    kind: 'number',
    check: 'count',
    min: 1,
    max: 999,
    half: true,
    ...options,
  }),
  tripBudget: (): FieldSpec => ({
    name: 'budget',
    label: 'Budget',
    kind: 'select',
    prompt: 'Choose a budget',
    options: tripBudgetOptions,
    hint: 'A rough figure per person helps us suggest the right hotels.',
  }),
  place: (label: string, requiredMessage: string, hint?: string): FieldSpec => ({
    name: 'destination',
    label,
    kind: 'text',
    required: true,
    requiredMessage,
    ...(hint ? { hint } : {}),
  }),
};

/** Fields between the contact details and the message, per form type. */
export const formFields: Record<FormType, FieldSpec[]> = {
  general: [],
  corporate: [
    {
      name: 'company',
      label: 'Company name',
      kind: 'text',
      required: true,
      requiredMessage: 'Enter your company name',
      autocomplete: 'organization',
    },
    {
      name: 'gstin',
      label: 'GSTIN',
      kind: 'text',
      check: 'gstin',
      upper: true,
      hint: 'The 15-character GST number, if you want GST invoices.',
    },
    {
      name: 'volume',
      label: 'Trips a month, roughly',
      kind: 'select',
      prompt: 'Choose a range',
      options: [
        { value: 'under-10', label: 'Fewer than 10' },
        { value: '10-50', label: '10 to 50' },
        { value: '51-200', label: '51 to 200' },
        { value: 'over-200', label: 'More than 200' },
        notSure,
      ],
    },
  ],
  visa: [
    field.place('Country you are visiting', 'Enter the country you are visiting'),
    {
      name: 'purpose',
      label: 'Purpose of the trip',
      kind: 'select',
      prompt: 'Choose a purpose',
      options: [
        { value: 'tourism', label: 'Tourism' },
        { value: 'business', label: 'Business' },
        { value: 'family', label: 'Visiting family or friends' },
        { value: 'study', label: 'Study' },
        { value: 'other', label: 'Something else' },
      ],
    },
    {
      name: 'passport',
      label: 'Passport help',
      kind: 'select',
      prompt: 'Choose one',
      options: [
        { value: 'none', label: 'No, the visa only' },
        { value: 'new', label: 'A new passport' },
        { value: 'renewal', label: 'A passport renewal' },
      ],
    },
    field.startDate('Travel date'),
    field.count('travellers', 'Number of travellers'),
  ],
  hotel: [
    field.place('City or area', 'Enter the city or area for the hotel'),
    field.startDate('Check-in'),
    field.endDate('Check-out'),
    field.count('rooms', 'Rooms'),
    field.count('travellers', 'Guests'),
    {
      name: 'budget',
      label: 'Budget per room per night',
      kind: 'select',
      prompt: 'Choose a budget',
      options: [
        { value: 'under-5k', label: 'Under ₹5,000' },
        { value: '5k-10k', label: '₹5,000 to ₹10,000' },
        { value: '10k-20k', label: '₹10,000 to ₹20,000' },
        { value: 'above-20k', label: 'Above ₹20,000' },
        notSure,
      ],
    },
  ],
  forex: [
    {
      name: 'currency',
      label: 'Currency you need',
      kind: 'text',
      required: true,
      requiredMessage: 'Enter the currency you need',
      hint: 'For example US dollars, euros or UAE dirhams.',
    },
    {
      name: 'product',
      label: 'Cash or card',
      kind: 'select',
      prompt: 'Choose one',
      options: [
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Forex card' },
        { value: 'both', label: 'Both' },
        notSure,
      ],
    },
    { name: 'amount', label: 'Approximate amount', kind: 'text', half: true },
    field.startDate('Needed by'),
  ],
  insurance: [
    field.place('Where you are travelling', 'Enter where you are travelling'),
    field.startDate('Trip starts'),
    field.endDate('Trip ends'),
    field.count('travellers', 'Number of travellers'),
    {
      name: 'ages',
      label: 'Ages of the travellers',
      kind: 'text',
      half: true,
      hint: 'For example 42, 40 and 9.',
    },
  ],
  cruise: [
    {
      name: 'destination',
      label: 'Cruise region or route',
      kind: 'text',
      hint: 'For example Singapore and Malaysia, or the Mediterranean.',
    },
    field.startDate('Sailing around', 'A rough date is fine.'),
    field.count('travellers', 'Number of travellers'),
    field.tripBudget(),
  ],
  mice: [
    {
      name: 'eventType',
      label: 'What are you planning?',
      kind: 'select',
      required: true,
      requiredMessage: 'Choose what you are planning',
      prompt: 'Choose one',
      options: [
        { value: 'meeting', label: 'A meeting or offsite' },
        { value: 'incentive', label: 'An incentive trip' },
        { value: 'conference', label: 'A conference' },
        { value: 'event', label: 'An event or exhibition' },
        notSure,
      ],
    },
    { name: 'company', label: 'Company name', kind: 'text', autocomplete: 'organization' },
    field.count('travellers', 'Number of attendees', {
      required: true,
      requiredMessage: 'Enter the number of attendees',
      max: 5000,
    }),
    field.startDate('Event date'),
    {
      name: 'destination',
      label: 'City or destination ideas',
      kind: 'text',
    },
  ],
  transport: [
    {
      name: 'tripKind',
      label: 'What do you need?',
      kind: 'select',
      required: true,
      requiredMessage: 'Choose what you need',
      prompt: 'Choose one',
      options: [
        { value: 'airport', label: 'Airport transfer' },
        { value: 'local', label: 'A car for local use' },
        { value: 'outstation', label: 'An outstation trip' },
        { value: 'coach', label: 'A coach for a group' },
      ],
    },
    field.place('Pick-up city', 'Enter the pick-up city'),
    field.startDate('Date needed'),
    field.count('travellers', 'Passengers'),
  ],
  rail: [
    field.place(
      'Countries or route',
      'Enter the countries or route',
      'For example Paris to Zurich.',
    ),
    field.startDate('Travel date'),
    field.count('travellers', 'Number of travellers'),
    {
      name: 'railClass',
      label: 'Class',
      kind: 'select',
      prompt: 'Choose a class',
      half: true,
      options: [
        { value: 'first', label: 'First class' },
        { value: 'second', label: 'Second class' },
        notSure,
      ],
    },
  ],
  frro: [
    {
      name: 'frroService',
      label: 'What do you need help with?',
      kind: 'select',
      required: true,
      requiredMessage: 'Choose what you need help with',
      prompt: 'Choose one',
      options: [
        { value: 'registration', label: 'Registration' },
        { value: 'extension', label: 'Visa extension' },
        { value: 'exit', label: 'Exit permit' },
        { value: 'other', label: 'Something else' },
      ],
    },
    { name: 'nationality', label: 'Nationality', kind: 'text', half: true },
    { name: 'city', label: 'City where you live in India', kind: 'text', half: true },
  ],
  holiday: [
    {
      name: 'holiday',
      label: 'Holiday',
      kind: 'text',
      required: true,
      requiredMessage: 'Enter the holiday you are asking about',
    },
    field.startDate('Travel date', 'A rough date is fine.'),
    field.count('adults', 'Adults', {
      required: true,
      requiredMessage: 'Enter the number of adults',
    }),
    field.count('children', 'Children', { min: 0, max: 99, hint: 'Under 12 years.' }),
    field.tripBudget(),
  ],
};

/** The message field: required where it is the only place to say what is needed. */
export function messageField(formType: FormType): FieldSpec {
  return formType === 'general'
    ? {
        name: 'message',
        label: 'How can we help?',
        kind: 'textarea',
        required: true,
        requiredMessage: 'Tell us a little about what you need',
      }
    : {
        name: 'message',
        label: 'Anything else we should know?',
        kind: 'textarea',
      };
}

/**
 * Preferred call-back times. Office hours are not confirmed (site.ts), so the windows name no
 * clock times until the hours are shown on the site.
 */
export function callbackTimes(): Option[] {
  return [
    { value: 'any', label: 'Any time during office hours' },
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
  ];
}
