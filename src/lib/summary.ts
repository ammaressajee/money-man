import type { HouseholdData, Owner } from '../types/db'
import { OWNERS } from '../types/db'
import { formatMonthShort, monthKey, monthlyAmount, monthStart, parseDate } from './money'

export interface OwnerSummary {
  income: number
  incomeRatio: number
  autoSavings: number
  personalExpenses: number
  fairShare: number
  /** Cash savings: auto-transfers from paychecks + fixed items of kind 'saving'. */
  saving: number
  /** Fixed items of kind 'investment' (brokerage, taxable investing). */
  investing: number
  /** Fixed items of kind 'retirement' (Roth IRA, 401k, HSA…). */
  retirement: number
  /** saving + investing + retirement. */
  wealth: number
  cardSpend: number
  otherSpend: number
  totalOutflow: number
}

export interface CategorySlice {
  name: string
  amount: number
}

export interface MissingStatementCard {
  cardId: string
  cardName: string
  owner: Owner
}

export interface MonthCompleteness {
  /** Active cards that have no statement closing in this month. */
  missingStatements: MissingStatementCard[]
  loggedStatementCount: number
  activeCardCount: number
  isCardSpendIncomplete: boolean
}

export interface MonthlySummary {
  month: Date
  key: string
  label: string
  ammar: OwnerSummary
  fiancee: OwnerSummary
  combinedIncome: number
  jointExpenses: number
  combinedOutflow: number
  /** Cash savings across both people (auto-transfers + 'saving' items). */
  totalSaving: number
  /** 'investment' items across both people. */
  totalInvesting: number
  /** 'retirement' items across both people. */
  totalRetirement: number
  /** totalSaving + totalInvesting + totalRetirement. */
  totalSavedInvested: number
  netLeftover: number
  /** This month's outflow split into macro categories (excludes investments). */
  categoryOutflow: CategorySlice[]
  /** Card + other spend only — the portions that are truly month-specific. */
  loggedOutflow: number
  /** totalSavedInvested / combinedIncome, 0 when no income. */
  savingsRate: number
  /** Which active cards are missing a statement for this month. */
  completeness: MonthCompleteness
}

/**
 * Compute the full financial snapshot for one calendar month.
 *
 * Assumptions:
 * - Recurring income/fixed items reflect the *current* setup and are applied
 *   uniformly across months (the schema keeps no change history).
 * - `one_time` income counts fully in the month it was entered (created_at).
 * - Card statements count toward the month their closing date falls in.
 */
export function computeMonthSummary(data: HouseholdData, month: Date): MonthlySummary {
  const key = monthKey(month)
  const activeIncome = data.incomeSources.filter((s) => s.active)
  const activeFixed = data.fixedItems.filter((f) => f.active)

  const cardOwner = new Map(data.creditCards.map((c) => [c.id, c.owner]))

  const income: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  const autoSavings: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  for (const s of activeIncome) {
    if (s.frequency === 'one_time') {
      if (monthKey(parseDate(s.created_at)) === key) {
        income[s.owner] += s.amount
        autoSavings[s.owner] += s.auto_savings_amount
      }
    } else {
      income[s.owner] += monthlyAmount(s.amount, s.frequency)
      autoSavings[s.owner] += monthlyAmount(s.auto_savings_amount, s.frequency)
    }
  }

  const combinedIncome = income.ammar + income.fiancee

  const personalExpenses: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  const savingFixed: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  const investingFixed: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  const retirementFixed: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  let jointExpenses = 0
  const expenseByCategory = new Map<string, number>()

  const wealthBuckets = {
    saving: savingFixed,
    investment: investingFixed,
    retirement: retirementFixed,
  } as const

  for (const f of activeFixed) {
    const monthly = monthlyAmount(f.amount, f.frequency)
    if (f.kind !== 'expense') {
      const bucket = wealthBuckets[f.kind]
      // Joint wealth contributions are unexpected, but split evenly if they appear.
      if (f.owner === 'joint') {
        bucket.ammar += monthly / 2
        bucket.fiancee += monthly / 2
      } else {
        bucket[f.owner] += monthly
      }
      continue
    }
    if (f.owner === 'joint') {
      jointExpenses += monthly
    } else {
      personalExpenses[f.owner] += monthly
    }
    expenseByCategory.set(f.category, (expenseByCategory.get(f.category) ?? 0) + monthly)
  }

  const cardSpend: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  for (const st of data.cardStatements) {
    if (monthKey(parseDate(st.statement_date)) !== key) continue
    const owner = cardOwner.get(st.card_id)
    if (owner) cardSpend[owner] += st.balance
  }

  const otherSpend: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  for (const o of data.otherSpend) {
    if (monthKey(parseDate(o.month)) === key) otherSpend[o.owner] += o.amount
  }

  const owners = {} as Record<Owner, OwnerSummary>
  for (const owner of OWNERS) {
    // With no income entered yet, fall back to an even split.
    const incomeRatio = combinedIncome > 0 ? income[owner] / combinedIncome : 0.5
    const fairShare = jointExpenses * incomeRatio
    const saving = savingFixed[owner] + autoSavings[owner]
    const investing = investingFixed[owner]
    const retirement = retirementFixed[owner]
    owners[owner] = {
      income: income[owner],
      incomeRatio,
      autoSavings: autoSavings[owner],
      personalExpenses: personalExpenses[owner],
      fairShare,
      saving,
      investing,
      retirement,
      wealth: saving + investing + retirement,
      cardSpend: cardSpend[owner],
      otherSpend: otherSpend[owner],
      totalOutflow: personalExpenses[owner] + fairShare + cardSpend[owner] + otherSpend[owner],
    }
  }

  const totalSaving = owners.ammar.saving + owners.fiancee.saving
  const totalInvesting = owners.ammar.investing + owners.fiancee.investing
  const totalRetirement = owners.ammar.retirement + owners.fiancee.retirement
  const totalSavedInvested = totalSaving + totalInvesting + totalRetirement
  const combinedOutflow =
    jointExpenses +
    personalExpenses.ammar +
    personalExpenses.fiancee +
    cardSpend.ammar +
    cardSpend.fiancee +
    otherSpend.ammar +
    otherSpend.fiancee
  const netLeftover = combinedIncome - combinedOutflow - totalSavedInvested
  const loggedOutflow =
    cardSpend.ammar + cardSpend.fiancee + otherSpend.ammar + otherSpend.fiancee
  const savingsRate = combinedIncome > 0 ? totalSavedInvested / combinedIncome : 0

  // Merge all categories then sort once by amount descending.
  const totalCards = cardSpend.ammar + cardSpend.fiancee
  const totalOther = otherSpend.ammar + otherSpend.fiancee
  const categoryOutflow: CategorySlice[] = [
    ...[...expenseByCategory.entries()].map(([name, amount]) => ({ name, amount })),
    ...(totalCards > 0 ? [{ name: 'Credit Cards', amount: totalCards }] : []),
    ...(totalOther > 0 ? [{ name: 'Other Spend', amount: totalOther }] : []),
  ].sort((a, b) => b.amount - a.amount)

  // Completeness: which active cards have no statement for this month?
  const activeCards = data.creditCards.filter((c) => c.active)
  const missingStatements: MissingStatementCard[] = activeCards
    .filter(
      (card) =>
        !data.cardStatements.some(
          (s) => s.card_id === card.id && monthKey(parseDate(s.statement_date)) === key,
        ),
    )
    .map((card) => ({ cardId: card.id, cardName: card.name, owner: card.owner }))

  const completeness: MonthCompleteness = {
    missingStatements,
    loggedStatementCount: activeCards.length - missingStatements.length,
    activeCardCount: activeCards.length,
    isCardSpendIncomplete: missingStatements.length > 0,
  }

  return {
    month,
    key,
    label: formatMonthShort(month),
    ammar: owners.ammar,
    fiancee: owners.fiancee,
    combinedIncome,
    jointExpenses,
    combinedOutflow,
    totalSaving,
    totalInvesting,
    totalRetirement,
    totalSavedInvested,
    netLeftover,
    categoryOutflow,
    loggedOutflow,
    savingsRate,
    completeness,
  }
}

/** Summaries for the trailing N months, oldest first, ending with the current month. */
export function computeTrailingSummaries(
  data: HouseholdData,
  monthsBack: number,
  now = new Date(),
): MonthlySummary[] {
  const result: MonthlySummary[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    result.push(computeMonthSummary(data, monthStart(now, -i)))
  }
  return result
}
