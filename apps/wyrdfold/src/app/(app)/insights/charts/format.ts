// Pre-built Intl formatters reused by the chart components. Building
// `Intl.DateTimeFormat` is expensive enough that hoisting it out of the
// per-tick `tickFormatter` callbacks meaningfully reduces work on charts
// with many axis ticks.

const WEEK_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const CURRENCY_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatWeek(value: string): string {
  return WEEK_FORMAT.format(new Date(value));
}

export function formatCost(value: number): string {
  return CURRENCY_FORMAT.format(value);
}
