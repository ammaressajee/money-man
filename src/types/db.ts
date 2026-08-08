export type Owner = 'ammar' | 'fiancee'
export type ItemOwner = Owner | 'joint'
export type FixedFrequency = 'monthly' | 'annual'
export type IncomeFrequency = 'monthly' | 'biweekly' | 'annual' | 'one_time'
export type FixedKind = 'expense' | 'saving' | 'investment' | 'retirement'

/** Wealth-building kinds — everything that isn't spend. */
export type WealthKind = Exclude<FixedKind, 'expense'>

export const WEALTH_KINDS: WealthKind[] = ['saving', 'investment', 'retirement']

export const KIND_LABELS: Record<FixedKind, string> = {
  expense: 'Expense',
  saving: 'Saving',
  investment: 'Investment',
  retirement: 'Retirement',
}

export interface FixedItem {
  id: string
  name: string
  amount: number
  frequency: FixedFrequency
  category: string
  kind: FixedKind
  owner: ItemOwner
  active: boolean
  created_at: string
}

export interface IncomeSource {
  id: string
  owner: Owner
  label: string
  amount: number
  frequency: IncomeFrequency
  auto_savings_amount: number
  active: boolean
  created_at: string
}

export interface CreditCard {
  id: string
  name: string
  owner: Owner
  active: boolean
  created_at: string
}

export interface CardStatement {
  id: string
  card_id: string
  statement_date: string
  balance: number
  created_at: string
}

export interface OtherSpend {
  id: string
  owner: Owner
  month: string
  amount: number
  /** Optional note for what the cash/debit spend was for. */
  label: string
  created_at: string
}

export interface HouseholdData {
  fixedItems: FixedItem[]
  incomeSources: IncomeSource[]
  creditCards: CreditCard[]
  cardStatements: CardStatement[]
  otherSpend: OtherSpend[]
}

export const OWNERS: Owner[] = ['ammar', 'fiancee']

export const OWNER_LABELS: Record<ItemOwner, string> = {
  ammar: 'Ammar',
  fiancee: 'Bethany',
  joint: 'Joint',
}

export const FIXED_CATEGORIES = [
  'Housing',
  'Utilities',
  'Insurance',
  'Car',
  'Subscriptions',
  'Savings',
  'Investing',
  'Retirement',
  'Other',
]
