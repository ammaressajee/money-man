import type { HouseholdData } from '../types/db'
import { monthStart, toMonthDateString } from './money'

const STORAGE_KEY = 'our-money-demo-v1'

function iso(d: Date): string {
  return d.toISOString()
}

/** Deterministic, realistic seed data spanning the trailing 8 months. */
function buildSeed(): HouseholdData {
  const now = new Date()
  const origin = iso(monthStart(now, -9))

  const cards = [
    { id: 'card-a1', name: 'Chase Sapphire', owner: 'ammar', active: true, created_at: origin },
    { id: 'card-a2', name: 'Amex Blue Cash', owner: 'ammar', active: true, created_at: origin },
    { id: 'card-f1', name: 'Capital One Savor', owner: 'fiancee', active: true, created_at: origin },
  ] as const

  // Fixed balances per trailing month (index 0 = 7 months ago … 7 = current).
  const balances: Record<string, number[]> = {
    'card-a1': [842, 1110, 968, 1240, 890, 1035, 1180, 920],
    'card-a2': [210, 185, 260, 190, 240, 205, 175, 230],
    'card-f1': [640, 720, 585, 810, 660, 590, 745, 615],
  }

  const cardStatements = cards.flatMap((card) =>
    balances[card.id].map((balance, i) => {
      const month = monthStart(now, i - 7)
      const closing = new Date(month.getFullYear(), month.getMonth(), 18)
      return {
        id: `${card.id}-st-${i}`,
        card_id: card.id,
        statement_date: `${closing.getFullYear()}-${String(closing.getMonth() + 1).padStart(2, '0')}-18`,
        balance,
        created_at: iso(closing),
      }
    }),
  )

  const otherAmounts: Record<'ammar' | 'fiancee', number[]> = {
    ammar: [120, 90, 150, 80, 110, 95, 140, 100],
    fiancee: [85, 130, 70, 95, 120, 75, 90, 110],
  }
  const otherSpend = (['ammar', 'fiancee'] as const).flatMap((owner) =>
    otherAmounts[owner].map((amount, i) => {
      const month = monthStart(now, i - 7)
      return {
        id: `other-${owner}-${i}`,
        owner,
        month: toMonthDateString(month),
        amount,
        created_at: iso(month),
      }
    }),
  )

  return {
    incomeSources: [
      {
        id: 'inc-a1',
        owner: 'ammar',
        label: 'Biweekly Paycheck',
        amount: 2650,
        frequency: 'biweekly',
        auto_savings_amount: 350,
        active: true,
        created_at: origin,
      },
      {
        id: 'inc-f1',
        owner: 'fiancee',
        label: 'Biweekly Paycheck',
        amount: 2050,
        frequency: 'biweekly',
        auto_savings_amount: 250,
        active: true,
        created_at: origin,
      },
    ],
    fixedItems: [
      { id: 'fx-1', name: 'Rent', amount: 1875, frequency: 'monthly', category: 'Housing', kind: 'expense', owner: 'joint', active: true, created_at: origin },
      { id: 'fx-2', name: 'Electric + Gas', amount: 145, frequency: 'monthly', category: 'Utilities', kind: 'expense', owner: 'joint', active: true, created_at: origin },
      { id: 'fx-3', name: 'Internet', amount: 65, frequency: 'monthly', category: 'Utilities', kind: 'expense', owner: 'joint', active: true, created_at: origin },
      { id: 'fx-4', name: 'Streaming Bundle', amount: 32, frequency: 'monthly', category: 'Subscriptions', kind: 'expense', owner: 'joint', active: true, created_at: origin },
      { id: 'fx-5', name: 'Car Note', amount: 415, frequency: 'monthly', category: 'Car', kind: 'expense', owner: 'ammar', active: true, created_at: origin },
      { id: 'fx-6', name: 'Car Insurance', amount: 1560, frequency: 'annual', category: 'Insurance', kind: 'expense', owner: 'ammar', active: true, created_at: origin },
      { id: 'fx-7', name: 'Car Insurance', amount: 1240, frequency: 'annual', category: 'Insurance', kind: 'expense', owner: 'fiancee', active: true, created_at: origin },
      { id: 'fx-8', name: 'Gym', amount: 45, frequency: 'monthly', category: 'Subscriptions', kind: 'expense', owner: 'fiancee', active: true, created_at: origin },
      { id: 'fx-9', name: 'Roth IRA', amount: 583, frequency: 'monthly', category: 'Investing', kind: 'investment', owner: 'ammar', active: true, created_at: origin },
      { id: 'fx-10', name: 'Roth IRA', amount: 500, frequency: 'monthly', category: 'Investing', kind: 'investment', owner: 'fiancee', active: true, created_at: origin },
    ],
    creditCards: [...cards],
    cardStatements,
    otherSpend,
  }
}

export function loadDemoData(): HouseholdData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as HouseholdData
  } catch {
    // Corrupt or unavailable storage — fall through to fresh seed.
  }
  const seed = buildSeed()
  saveDemoData(seed)
  return seed
}

export function saveDemoData(data: HouseholdData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full/blocked; demo continues in memory only.
  }
}
