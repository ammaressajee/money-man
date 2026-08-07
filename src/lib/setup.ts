import type { HouseholdData } from '../types/db'
import { monthKey, parseDate } from './money'

export type SetupStep = 'income' | 'fixed' | 'cards'

export interface SetupStatus {
  hasIncome: boolean
  hasFixed: boolean
  hasActiveCards: boolean
  hasCurrentMonthStatements: boolean
  /** Minimum for a meaningful dashboard: at least one income source and one fixed cost. */
  isDashboardReady: boolean
  incompleteRequiredSteps: SetupStep[]
}

export function computeSetupStatus(data: HouseholdData, currentMonthKey: string): SetupStatus {
  const hasIncome = data.incomeSources.some((s) => s.active)
  const hasFixed = data.fixedItems.some((f) => f.active)
  const activeCards = data.creditCards.filter((c) => c.active)
  const hasActiveCards = activeCards.length > 0
  const hasCurrentMonthStatements =
    hasActiveCards &&
    activeCards.every((card) =>
      data.cardStatements.some(
        (s) => s.card_id === card.id && monthKey(parseDate(s.statement_date)) === currentMonthKey,
      ),
    )

  const incompleteRequiredSteps: SetupStep[] = []
  if (!hasIncome) incompleteRequiredSteps.push('income')
  if (!hasFixed) incompleteRequiredSteps.push('fixed')

  return {
    hasIncome,
    hasFixed,
    hasActiveCards,
    hasCurrentMonthStatements,
    isDashboardReady: hasIncome && hasFixed,
    incompleteRequiredSteps,
  }
}
