import type { MonthlySummary } from './summary'
/**
 * Income-based spending and saving guidelines.
 *
 * Targets are expressed as a fraction of combined monthly income and chosen
 * on a "pay yourself first" basis. They are intentionally macro — the app
 * does not track grocery vs. dining individually, so those split out only
 * as a mental legend inside the flexible-spend row.
 */
export const GUIDELINE_TARGETS = {
  retirement: 0.15, // 15% — Roth IRA, 401(k), HSA
  cashSavings: 0.10, // 10% — HYSA, emergency fund, auto-transfers
  investing: 0.05,  // 5%  — brokerage / taxable investing
  fixedLiving: 0.50, // ≤50% — rent, bills, insurance, car note
  flexSpend: 0.20,  // ≤20% — cards (net) + cash/debit
} as const

/** Within flexSpend (~20%), rough mental breakdown for the legend. */
export const FLEX_LEGEND = [
  { id: 'groceries',    label: 'Groceries',                   pct: 0.10 },
  { id: 'dining',       label: 'Dining out & entertainment',  pct: 0.05 },
  { id: 'gas',          label: 'Gas & transport',             pct: 0.05 },
] as const

export type GuidelineStatus = 'on-track' | 'over' | 'under' | 'info'

export interface GuidelineRow {
  id: string
  label: string
  /** Target dollar amount based on income. */
  targetAmount: number
  /** Actual dollar amount this month. */
  actualAmount: number
  /** Fraction of income the actual represents. */
  actualPct: number
  /** Target fraction of income. */
  targetPct: number
  /**
   * on-track: actual ≤ target for spending rows, or ≥ target for wealth rows.
   * over: spending row with actual > target.
   * under: wealth row with actual < target (savings draw already reflected).
   */
  status: GuidelineStatus
  /** Brief note shown under the row. */
  note: string | null
}

export interface FlexLegendRow {
  id: string
  label: string
  targetAmount: number
  targetPct: number
}

export interface GuidelinesResult {
  rows: GuidelineRow[]
  /** Legend rows within the flexible-spend bucket — no actual comparison. */
  flexLegend: FlexLegendRow[]
  /** Total income for reference. */
  income: number
}

export function computeGuidelines(summary: MonthlySummary): GuidelinesResult {
  const income = summary.combinedIncome

  const fixedLiving =
    summary.jointExpenses +
    summary.ammar.personalExpenses +
    summary.fiancee.personalExpenses

  const flexSpend = summary.loggedOutflow

  const rows: GuidelineRow[] = [
    // Wealth rows — higher is better (status: under when below target)
    buildRow({
      id: 'retirement',
      label: 'Retirement',
      targetPct: GUIDELINE_TARGETS.retirement,
      actual: summary.totalRetirement,
      income,
      wealthRow: true,
      note: 'Roth IRA, 401(k), HSA — stays funded even in tight months',
    }),
    buildRow({
      id: 'cashSavings',
      label: 'Cash savings',
      targetPct: GUIDELINE_TARGETS.cashSavings,
      actual: summary.effectiveSaving,
      income,
      wealthRow: true,
      note:
        summary.savingsDraw > 0
          ? `−$${Math.round(summary.savingsDraw).toLocaleString()} drawn this month to cover shortfall`
          : 'HYSA, emergency fund, paycheck auto-transfers',
    }),
    buildRow({
      id: 'investing',
      label: 'Investing',
      targetPct: GUIDELINE_TARGETS.investing,
      actual: summary.totalInvesting,
      income,
      wealthRow: true,
      note: 'Brokerage & taxable investing',
    }),
    // Spending rows — lower is better (status: over when above target)
    buildRow({
      id: 'fixedLiving',
      label: 'Fixed living',
      targetPct: GUIDELINE_TARGETS.fixedLiving,
      actual: fixedLiving,
      income,
      wealthRow: false,
      note: 'Rent, utilities, insurance, car, subscriptions',
    }),
    buildRow({
      id: 'flexSpend',
      label: 'Flexible spending',
      targetPct: GUIDELINE_TARGETS.flexSpend,
      actual: flexSpend,
      income,
      wealthRow: false,
      note: 'Cards (net) and cash / debit spend',
    }),
  ]

  const flexLegend: FlexLegendRow[] = FLEX_LEGEND.map((l) => ({
    id: l.id,
    label: l.label,
    targetAmount: income * l.pct,
    targetPct: l.pct,
  }))

  return { rows, flexLegend, income }
}

function buildRow({
  id,
  label,
  targetPct,
  actual,
  income,
  wealthRow,
  note,
}: {
  id: string
  label: string
  targetPct: number
  actual: number
  income: number
  wealthRow: boolean
  note: string | null
}): GuidelineRow {
  const targetAmount = income * targetPct
  const actualPct = income > 0 ? actual / income : 0

  let status: GuidelineStatus
  if (income === 0) {
    status = 'info'
  } else if (wealthRow) {
    status = actual >= targetAmount - 0.01 ? 'on-track' : 'under'
  } else {
    status = actual <= targetAmount + 0.01 ? 'on-track' : 'over'
  }

  return { id, label, targetAmount, actualAmount: actual, actualPct, targetPct, status, note }
}

export function guidelineStatusLabel(status: GuidelineStatus): string {
  switch (status) {
    case 'on-track': return 'On track'
    case 'over':     return 'Over target'
    case 'under':    return 'Below target'
    case 'info':     return ''
  }
}

