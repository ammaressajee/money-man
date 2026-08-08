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
  /** Raw sum of statement charges for this owner's cards this month. */
  cardSpendGross: number
  /**
   * Monthly-normalized total of fixed expenses that autopay on this owner's
   * cards. Netted out to avoid counting those bills twice (once as a fixed
   * item, once inside the statement total).
   */
  cardFixedOverlap: number
  /**
   * cardSpendGross − cardFixedOverlap, clamped to ≥ 0.
   * This is the true variable spend on cards beyond known fixed bills.
   */
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
  /**
   * Cards where the logged statement charges are less than their assigned
   * fixed-expense bills for the month — likely a wrong number entered or an
   * annual bill whose charge lands in a different cycle.
   */
  suspectStatements: MissingStatementCard[]
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
  /**
   * When netLeftover < 0, this is the amount that must be pulled from cash
   * savings to cover the shortfall. Roth and investing still ran as planned.
   * savingsDraw = max(0, −netLeftover).
   */
  savingsDraw: number
  /**
   * True net wealth change: planned contributions minus the savings draw.
   * = totalSavedInvested − savingsDraw.
   * Can be negative if spending overwhelms even the savings balance.
   */
  netWealthChange: number
  /**
   * Cash savings after absorbing any draw: totalSaving − savingsDraw.
   * Negative means savings were pulled beyond the monthly contribution.
   */
  effectiveSaving: number
  /** netWealthChange / combinedIncome, 0 when no income. */
  netSavingsRate: number
  /** This month's outflow split into macro categories (excludes investments). */
  categoryOutflow: CategorySlice[]
  /** Card (net) + other spend only — the portions that are truly month-specific. */
  loggedOutflow: number
  /** totalSavedInvested / combinedIncome, 0 when no income. (planned, before draw) */
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
 * - `card_statements.balance` = new charges (purchases + fees & interest),
 *   NOT the "New Balance" figure printed on the statement.
 * - Fixed expenses with `paid_via_card_id` set are netted out of that card's
 *   statement total to prevent double-counting. The net is clamped to ≥ 0.
 */
export function computeMonthSummary(data: HouseholdData, month: Date): MonthlySummary {
  const key = monthKey(month)
  const activeIncome = data.incomeSources.filter((s) => s.active)
  const activeFixed = data.fixedItems.filter((f) => f.active)

  // Maps from card id → owner
  const cardOwner = new Map(data.creditCards.map((c) => [c.id, c.owner]))

  // --- Income ---
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

  // --- Fixed items ---
  const personalExpenses: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  const savingFixed: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  const investingFixed: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  const retirementFixed: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  let jointExpenses = 0
  const expenseByCategory = new Map<string, number>()

  // Per-card monthly overlap: how much of this card's statement is already
  // captured by fixed items (to net out of card spend).
  const cardOverlap = new Map<string, number>()

  const wealthBuckets = {
    saving: savingFixed,
    investment: investingFixed,
    retirement: retirementFixed,
  } as const

  for (const f of activeFixed) {
    const monthly = monthlyAmount(f.amount, f.frequency)
    if (f.kind !== 'expense') {
      const bucket = wealthBuckets[f.kind]
      if (f.owner === 'joint') {
        bucket.ammar += monthly / 2
        bucket.fiancee += monthly / 2
      } else {
        bucket[f.owner] += monthly
      }
      continue
    }

    // It's an expense — accumulate into the appropriate bucket.
    if (f.owner === 'joint') {
      jointExpenses += monthly
    } else {
      personalExpenses[f.owner] += monthly
    }
    expenseByCategory.set(f.category, (expenseByCategory.get(f.category) ?? 0) + monthly)

    // If this expense autopays on a card, track the overlap so we can net it
    // out of that card's statement total.
    if (f.paid_via_card_id) {
      cardOverlap.set(f.paid_via_card_id, (cardOverlap.get(f.paid_via_card_id) ?? 0) + monthly)
    }
  }

  // --- Card statements ---
  // cardSpendGross: raw sum of new charges logged for each card this month.
  const cardSpendGross: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  // cardFixedOverlap: sum of fixed-item overlap for each owner's cards.
  const cardFixedOverlapByOwner: Record<Owner, number> = { ammar: 0, fiancee: 0 }

  // Which cards have a statement this month (for completeness check).
  const cardsWithStatement = new Set<string>()

  for (const st of data.cardStatements) {
    if (monthKey(parseDate(st.statement_date)) !== key) continue
    const owner = cardOwner.get(st.card_id)
    if (!owner) continue
    cardsWithStatement.add(st.card_id)
    cardSpendGross[owner] += st.balance
    cardFixedOverlapByOwner[owner] += cardOverlap.get(st.card_id) ?? 0
  }

  // Net card spend: gross minus overlap, clamped to 0 (annual bills or
  // refund-heavy cycles can make gross < overlap in a given month).
  const cardSpendNet: Record<Owner, number> = {
    ammar: Math.max(0, cardSpendGross.ammar - cardFixedOverlapByOwner.ammar),
    fiancee: Math.max(0, cardSpendGross.fiancee - cardFixedOverlapByOwner.fiancee),
  }

  // --- Other (debit/cash) spend ---
  const otherSpend: Record<Owner, number> = { ammar: 0, fiancee: 0 }
  for (const o of data.otherSpend) {
    if (monthKey(parseDate(o.month)) === key) otherSpend[o.owner] += o.amount
  }

  // --- Per-owner summaries ---
  const owners = {} as Record<Owner, OwnerSummary>
  for (const owner of OWNERS) {
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
      cardSpendGross: cardSpendGross[owner],
      cardFixedOverlap: cardFixedOverlapByOwner[owner],
      cardSpend: cardSpendNet[owner],
      otherSpend: otherSpend[owner],
      totalOutflow: personalExpenses[owner] + fairShare + cardSpendNet[owner] + otherSpend[owner],
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
    cardSpendNet.ammar +
    cardSpendNet.fiancee +
    otherSpend.ammar +
    otherSpend.fiancee

  const netLeftover = combinedIncome - combinedOutflow - totalSavedInvested

  const savingsDraw = Math.max(0, -netLeftover)
  const netWealthChange = totalSavedInvested - savingsDraw
  const effectiveSaving = totalSaving - savingsDraw

  const loggedOutflow =
    cardSpendNet.ammar + cardSpendNet.fiancee + otherSpend.ammar + otherSpend.fiancee

  const savingsRate = combinedIncome > 0 ? totalSavedInvested / combinedIncome : 0
  const netSavingsRate = combinedIncome > 0 ? netWealthChange / combinedIncome : 0

  // Category breakdown — uses net card spend so the chart isn't double-counting.
  const totalCards = cardSpendNet.ammar + cardSpendNet.fiancee
  const totalOther = otherSpend.ammar + otherSpend.fiancee
  const categoryOutflow: CategorySlice[] = [
    ...[...expenseByCategory.entries()].map(([name, amount]) => ({ name, amount })),
    ...(totalCards > 0 ? [{ name: 'Credit Cards', amount: totalCards }] : []),
    ...(totalOther > 0 ? [{ name: 'Other Spend', amount: totalOther }] : []),
  ].sort((a, b) => b.amount - a.amount)

  // --- Completeness ---
  const activeCards = data.creditCards.filter((c) => c.active)

  const missingStatements: MissingStatementCard[] = activeCards
    .filter((card) => !cardsWithStatement.has(card.id))
    .map((card) => ({ cardId: card.id, cardName: card.name, owner: card.owner }))

  // Suspect: statement logged but gross charges < monthly overlap for that card
  // (likely a wrong number or an annual bill not in this cycle's statement).
  const suspectStatements: MissingStatementCard[] = activeCards
    .filter((card) => {
      if (!cardsWithStatement.has(card.id)) return false
      const overlap = cardOverlap.get(card.id) ?? 0
      if (overlap === 0) return false
      // Sum raw gross for just this card
      const gross = data.cardStatements
        .filter(
          (s) =>
            s.card_id === card.id && monthKey(parseDate(s.statement_date)) === key,
        )
        .reduce((sum, s) => sum + s.balance, 0)
      return gross < overlap
    })
    .map((card) => ({ cardId: card.id, cardName: card.name, owner: card.owner }))

  const completeness: MonthCompleteness = {
    missingStatements,
    loggedStatementCount: activeCards.length - missingStatements.length,
    activeCardCount: activeCards.length,
    isCardSpendIncomplete: missingStatements.length > 0,
    suspectStatements,
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
    savingsDraw,
    netWealthChange,
    effectiveSaving,
    netSavingsRate,
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
