// One-off sanity check of computeMonthSummary against hand-computed values.
// Run: npm run verify
import { computeMonthSummary } from '../src/lib/summary'
import type { HouseholdData } from '../src/types/db'

const now = new Date()
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

const data: HouseholdData = {
  incomeSources: [
    { id: 'i1', owner: 'ammar', label: 'Pay', amount: 2600, frequency: 'biweekly', auto_savings_amount: 300, active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'i2', owner: 'fiancee', label: 'Pay', amount: 3000, frequency: 'monthly', auto_savings_amount: 0, active: true, created_at: '2026-01-01T00:00:00Z' },
  ],
  fixedItems: [
    { id: 'f1', name: 'Rent', amount: 1000, frequency: 'monthly', category: 'Housing', kind: 'expense', owner: 'joint', active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'f2', name: 'Car', amount: 200, frequency: 'monthly', category: 'Car', kind: 'expense', owner: 'ammar', active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'f3', name: 'Roth', amount: 500, frequency: 'monthly', category: 'Retirement', kind: 'retirement', owner: 'ammar', active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'f4', name: 'Old sub', amount: 999, frequency: 'monthly', category: 'Other', kind: 'expense', owner: 'joint', active: false, created_at: '2026-01-01T00:00:00Z' },
    { id: 'f5', name: 'Index Funds', amount: 250, frequency: 'monthly', category: 'Investing', kind: 'investment', owner: 'ammar', active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'f6', name: 'HYSA', amount: 100, frequency: 'monthly', category: 'Savings', kind: 'saving', owner: 'fiancee', active: true, created_at: '2026-01-01T00:00:00Z' },
  ],
  creditCards: [
    { id: 'c1', name: 'Chase Sapphire', owner: 'ammar', active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'c2', name: 'Bethany Visa', owner: 'fiancee', active: true, created_at: '2026-01-01T00:00:00Z' },
  ],
  cardStatements: [
    { id: 's1', card_id: 'c1', statement_date: `${thisMonth}-15`, balance: 400, created_at: '2026-01-01T00:00:00Z' },
    { id: 's2', card_id: 'c1', statement_date: '2020-01-15', balance: 9999, created_at: '2020-01-01T00:00:00Z' },
    // c2 has NO statement this month — should appear in missingStatements
  ],
  otherSpend: [
    { id: 'o1', owner: 'ammar', month: `${thisMonth}-01`, amount: 100, label: 'ATM cash', created_at: '2026-01-01T00:00:00Z' },
  ],
}

const s = computeMonthSummary(data, new Date(now.getFullYear(), now.getMonth(), 1))

const ammarIncome = (2600 * 26) / 12 // 5633.33
const combined = ammarIncome + 3000
const ratio = ammarIncome / combined
const ammarAutoSavings = (300 * 26) / 12 // 650
const expectedLoggedOutflow = 400 + 100 // cards + other
const expectedSaving = ammarAutoSavings + 100 // auto-transfers + HYSA
const expectedWealth = expectedSaving + 250 + 500 // + index funds + roth
const expectedSavingsRate = expectedWealth / combined

const checks: [string, number, number][] = [
  ['ammar income', s.ammar.income, ammarIncome],
  ['combined income', s.combinedIncome, combined],
  ['ammar ratio', s.ammar.incomeRatio, ratio],
  ['joint expenses (inactive excluded)', s.jointExpenses, 1000],
  ['ammar fair share', s.ammar.fairShare, 1000 * ratio],
  ['ammar saving (auto only)', s.ammar.saving, ammarAutoSavings],
  ['ammar investing (index funds)', s.ammar.investing, 250],
  ['ammar retirement (roth)', s.ammar.retirement, 500],
  ['ammar wealth (saving+invest+retire)', s.ammar.wealth, ammarAutoSavings + 250 + 500],
  ['fiancee saving (HYSA, no auto)', s.fiancee.saving, 100],
  ['ammar card spend (old stmt excluded)', s.ammar.cardSpend, 400],
  ['ammar other spend', s.ammar.otherSpend, 100],
  ['total saving', s.totalSaving, expectedSaving],
  ['total investing', s.totalInvesting, 250],
  ['total retirement', s.totalRetirement, 500],
  ['total saved/invested', s.totalSavedInvested, expectedWealth],
  ['combined outflow', s.combinedOutflow, 1000 + 200 + 400 + 100],
  ['net leftover', s.netLeftover, combined - 1700 - expectedWealth],
  ['ammar total outflow', s.ammar.totalOutflow, 200 + 1000 * ratio + 400 + 100],
  ['logged outflow (cards+other only)', s.loggedOutflow, expectedLoggedOutflow],
  ['savings rate', s.savingsRate, expectedSavingsRate],
]

let failed = 0
for (const [name, actual, expected] of checks) {
  const ok = Math.abs(actual - expected) < 0.01
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)}`)
}

// Completeness checks (boolean/count assertions)
const boolChecks: [string, boolean][] = [
  ['completeness: c1 (with stmt) not missing', !s.completeness.missingStatements.some(m => m.cardId === 'c1')],
  ['completeness: c2 (no stmt) is missing', s.completeness.missingStatements.some(m => m.cardId === 'c2')],
  ['completeness.activeCardCount = 2', s.completeness.activeCardCount === 2],
  ['completeness.loggedStatementCount = 1', s.completeness.loggedStatementCount === 1],
  ['completeness.isCardSpendIncomplete = true', s.completeness.isCardSpendIncomplete],
]

for (const [name, ok] of boolChecks) {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}

// Category sort: should be sorted by amount descending across all slices
const amounts = s.categoryOutflow.map(c => c.amount)
const isSorted = amounts.every((a, i) => i === 0 || amounts[i - 1] >= a)
if (!isSorted) failed++
console.log(`${isSorted ? 'PASS' : 'FAIL'}  categoryOutflow is sorted descending by amount`)

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) FAILED.`)
process.exit(failed === 0 ? 0 : 1)
