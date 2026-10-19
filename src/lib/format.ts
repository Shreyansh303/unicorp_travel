const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Indian rupee amount with Indian digit grouping, e.g. ₹1,85,000. */
export function formatINR(value: number): string {
  return inr.format(value);
}

const longDate = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Date in Indian English, e.g. 31 March 2027. Content dates are calendar dates, read as UTC. */
export function formatDate(value: Date): string {
  return longDate.format(value);
}

/** Machine-readable calendar date for `<time datetime>`, e.g. 2027-03-31. */
export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
