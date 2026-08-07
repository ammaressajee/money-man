import type { FixedFrequency, IncomeFrequency } from '../types/db'

/**
 * Normalize a recurring amount to a monthly figure.
 * One-time amounts return 0 here — they are counted only in the month
 * they were entered (see summary.ts).
 */
export function monthlyAmount(
  amount: number,
  frequency: FixedFrequency | IncomeFrequency,
): number {
  switch (frequency) {
    case 'monthly':
      return amount
    case 'biweekly':
      return (amount * 26) / 12
    case 'annual':
      return amount / 12
    case 'one_time':
      return 0
  }
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const currencyExact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(n: number): string {
  return currency.format(Math.round(n))
}

export function formatMoneyExact(n: number): string {
  return currencyExact.format(n)
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/** First day of the month `offset` months before/after the given date. */
export function monthStart(from: Date, offset = 0): Date {
  return new Date(from.getFullYear(), from.getMonth() + offset, 1)
}

/** 'YYYY-MM' key for grouping dates by month (local time). */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Parse a date-only string ('YYYY-MM-DD') or timestamp as a local date. */
export function parseDate(s: string): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(s)
  if (dateOnly) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(s)
}

export function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatMonthShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short' })
}

/**
 * Short month label for chart axes. Appends the 2-digit year on January
 * so that a 9-month window spanning a year boundary is unambiguous.
 * e.g. "Aug", "Sep", … "Jan '26", "Feb"
 */
export function formatMonthAxis(d: Date): string {
  const short = d.toLocaleDateString('en-US', { month: 'short' })
  return d.getMonth() === 0 ? `${short} '${String(d.getFullYear()).slice(-2)}` : short
}

/** 'YYYY-MM-01' string for storing a month in a date column. */
export function toMonthDateString(d: Date): string {
  return `${monthKey(d)}-01`
}
