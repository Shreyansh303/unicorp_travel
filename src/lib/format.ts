const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Indian rupee amount with Indian digit grouping, e.g. ₹1,85,000. */
export function formatINR(value: number): string {
  return inr.format(value);
}
