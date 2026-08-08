// One-off sanity check of computeMonthSummary against hand-computed values.
// Run: npm run verify
import { computeMonthSummary } from '../src/lib/summary'
import type { HouseholdData } from '../src/types/db'

const now = new Date()
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

// ─── Base dataset ─────────────────────────────────────────────────────────────
const data: HouseholdData = {
  incomeSources: [
    { id: 'i1', owner: 'ammar',   label: 'Pay', amount: 2600, frequency: 'biweekly', auto_savings_amount: 300, active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'i2', owner: 'fiancee', label: 'Pay', amount: 3000, frequency: 'monthly',  auto_savings_amount: 0,   active: true, created_at: '2026-01-01T00:00:00Z' },
  ],
  fixedItems: [
    { id: 'f1', name: 'Rent',       amount: 1000, frequency: 'monthly', category: 'Housing',    kind: 'expense',    owner: 'joint',  paid_via_card_id: null,  active: true,  created_at: '2026-01-01T00:00:00Z' },
    { id: 'f2', name: 'Car',        amount: 200,  frequency: 'monthly', category: 'Car',        kind: 'expense',    owner: 'ammar',  paid_via_card_id: null,  active: true,  created_at: '2026-01-01T00:00:00Z' },
    { id: 'f3', name: 'Roth',       amount: 500,  frequency: 'monthly', category: 'Retirement', kind: 'retirement', owner: 'ammar',  paid_via_card_id: null,  active: true,  created_at: '2026-01-01T00:00:00Z' },
    { id: 'f4', name: 'Old sub',    amount: 999,  frequency: 'monthly', category: 'Other',      kind: 'expense',    owner: 'joint',  paid_via_card_id: null,  active: false, created_at: '2026-01-01T00:00:00Z' },
    { id: 'f5', name: 'Index Funds',amount: 250,  frequency: 'monthly', category: 'Investing',  kind: 'investment', owner: 'ammar',  paid_via_card_id: null,  active: true,  created_at: '2026-01-01T00:00:00Z' },
    { id: 'f6', name: 'HYSA',       amount: 100,  frequency: 'monthly', category: 'Savings',    kind: 'saving',     owner: 'fiancee',paid_via_card_id: null,  active: true,  created_at: '2026-01-01T00:00:00Z' },
    // Internet autopays on c1 — $60/mo overlap to be netted from c1's statement.
    { id: 'f7', name: 'Internet',   amount: 60,   frequency: 'monthly', category: 'Utilities',  kind: 'expense',    owner: 'joint',  paid_via_card_id: 'c1',  active: true,  created_at: '2026-01-01T00:00:00Z' },
  ],
  creditCards: [
    { id: 'c1', name: 'Chase Sapphire', owner: 'ammar',   active: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'c2', name: 'Bethany Visa',   owner: 'fiancee', active: true, created_at: '2026-01-01T00:00:00Z' },
  ],
  cardStatements: [
    { id: 's1', card_id: 'c1', statement_date: `${thisMonth}-15`, balance: 400, created_at: '2026-01-01T00:00:00Z' },
    { id: 's2', card_id: 'c1', statement_date: '2020-01-15',      balance: 9999, created_at: '2020-01-01T00:00:00Z' },
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
const internetMonthly = 60

// c1 gross = 400; overlap = 60 (Internet autopays on c1); net = 340
const c1Net = 400 - internetMonthly
const expectedLoggedOutflow = c1Net + 100 // net cards + other

const expectedSaving = ammarAutoSavings + 100 // auto-transfers + HYSA
const expectedWealth = expectedSaving + 250 + 500 // + index funds + roth
const expectedSavingsRate = expectedWealth / combined

// Joint expenses now include Internet ($60) even though it's on the card,
// because fixed items remain the authoritative source for that bill.
const jointExpected = 1000 + 60 // Rent + Internet

const checks: [string, number, number][] = [
  ['ammar income',                              s.ammar.income,             ammarIncome],
  ['combined income',                           s.combinedIncome,           combined],
  ['ammar ratio',                               s.ammar.incomeRatio,        ratio],
  ['joint expenses (Internet included, inactive excluded)', s.jointExpenses, jointExpected],
  ['ammar fair share',                          s.ammar.fairShare,          jointExpected * ratio],
  ['ammar saving (auto only)',                  s.ammar.saving,             ammarAutoSavings],
  ['ammar investing (index funds)',             s.ammar.investing,          250],
  ['ammar retirement (roth)',                   s.ammar.retirement,         500],
  ['ammar wealth (saving+invest+retire)',       s.ammar.wealth,             ammarAutoSavings + 250 + 500],
  ['fiancee saving (HYSA, no auto)',            s.fiancee.saving,           100],
  ['ammar card gross (old stmt excluded)',      s.ammar.cardSpendGross,     400],
  ['ammar card overlap (Internet on c1)',       s.ammar.cardFixedOverlap,   internetMonthly],
  ['ammar card net (gross − overlap)',          s.ammar.cardSpend,          c1Net],
  ['ammar other spend',                        s.ammar.otherSpend,         100],
  ['total saving',                             s.totalSaving,              expectedSaving],
  ['total investing',                          s.totalInvesting,           250],
  ['total retirement',                         s.totalRetirement,          500],
  ['total saved/invested',                     s.totalSavedInvested,       expectedWealth],
  // combinedOutflow uses net card spend + fixed items (no double-count)
  ['combined outflow',                         s.combinedOutflow,          jointExpected + 200 + c1Net + 100],
  ['net leftover',                             s.netLeftover,              combined - (jointExpected + 200 + c1Net + 100) - expectedWealth],
  ['ammar total outflow',                      s.ammar.totalOutflow,       200 + jointExpected * ratio + c1Net + 100],
  ['logged outflow (net cards+other only)',     s.loggedOutflow,            expectedLoggedOutflow],
  ['savings rate',                             s.savingsRate,              expectedSavingsRate],
  // Overdraft / net wealth fields — balanced month (no drawdown expected)
  ['savingsDraw (no shortfall)',               s.savingsDraw,              0],
  ['netWealthChange (no shortfall)',           s.netWealthChange,          expectedWealth],
  ['effectiveSaving (no shortfall)',           s.effectiveSaving,          expectedSaving],
  ['netSavingsRate (no shortfall)',            s.netSavingsRate,           expectedSavingsRate],
]

let failed = 0
for (const [name, actual, expected] of checks) {
  const ok = Math.abs(actual - expected) < 0.01
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)}`)
}

// ─── Boolean / count checks ───────────────────────────────────────────────────
const boolChecks: [string, boolean][] = [
  ['completeness: c1 (with stmt) not missing',   !s.completeness.missingStatements.some(m => m.cardId === 'c1')],
  ['completeness: c2 (no stmt) is missing',       s.completeness.missingStatements.some(m => m.cardId === 'c2')],
  ['completeness.activeCardCount = 2',             s.completeness.activeCardCount === 2],
  ['completeness.loggedStatementCount = 1',        s.completeness.loggedStatementCount === 1],
  ['completeness.isCardSpendIncomplete = true',    s.completeness.isCardSpendIncomplete],
  // c1 gross (400) ≥ overlap (60) → should NOT be suspect
  ['c1 not suspect (gross ≥ overlap)',            !s.completeness.suspectStatements.some(m => m.cardId === 'c1')],
]

for (const [name, ok] of boolChecks) {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}

// Category sort
const amounts = s.categoryOutflow.map(c => c.amount)
const isSorted = amounts.every((a, i) => i === 0 || amounts[i - 1] >= a)
if (!isSorted) failed++
console.log(`${isSorted ? 'PASS' : 'FAIL'}  categoryOutflow is sorted descending by amount`)

// ─── Suspect-statement check ──────────────────────────────────────────────────
// Build a dataset where c1's gross < its overlap → should be flagged as suspect.
const dataSuspect: HouseholdData = {
  ...data,
  cardStatements: [
    // Gross = $20, overlap = $60 → should trigger suspect
    { id: 'ss1', card_id: 'c1', statement_date: `${thisMonth}-15`, balance: 20, created_at: '2026-01-01T00:00:00Z' },
  ],
}
const sSuspect = computeMonthSummary(dataSuspect, new Date(now.getFullYear(), now.getMonth(), 1))
const suspectCheck = sSuspect.completeness.suspectStatements.some(m => m.cardId === 'c1')
if (!suspectCheck) failed++
console.log(`${suspectCheck ? 'PASS' : 'FAIL'}  c1 flagged as suspect when gross < overlap`)

// Net clamped to 0 when gross < overlap
const c1NetSuspect = sSuspect.ammar.cardSpend
const clampOk = c1NetSuspect === 0
if (!clampOk) failed++
console.log(`${clampOk ? 'PASS' : 'FAIL'}  card net clamped to 0 when gross < overlap (got ${c1NetSuspect})`)

// ─── Negative-statement (refund-heavy cycle) check ────────────────────────────
const dataRefund: HouseholdData = {
  ...data,
  fixedItems: data.fixedItems.filter(f => f.id !== 'f7'), // no overlap on c1
  cardStatements: [
    { id: 'rs1', card_id: 'c1', statement_date: `${thisMonth}-15`, balance: -50, created_at: '2026-01-01T00:00:00Z' },
  ],
}
const sRefund = computeMonthSummary(dataRefund, new Date(now.getFullYear(), now.getMonth(), 1))
// Net = max(0, -50 - 0) → 0; gross = -50
const refundGrossOk = sRefund.ammar.cardSpendGross === -50
const refundNetOk = sRefund.ammar.cardSpend === 0
if (!refundGrossOk) failed++
if (!refundNetOk) failed++
console.log(`${refundGrossOk ? 'PASS' : 'FAIL'}  refund cycle: gross = -50`)
console.log(`${refundNetOk   ? 'PASS' : 'FAIL'}  refund cycle: net clamped to 0`)

// ─── Overdraft / savings-draw check ─────────────────────────────────────────
// A month where card spend is so high that spend + planned wealth > income.
// We add a massive card statement to force a shortfall.
// Income (combined) = ammarIncome + 3000 ≈ 8633
// Planned wealth = expectedWealth ≈ ammarAutoSavings(650) + HYSA(100) + indexFunds(250) + roth(500) = 1500
// Fixed spend = jointExpected(1060) + carNote(200) = 1260
// To cause shortfall we need card spend > income - wealth - fixedSpend = 8633 - 1500 - 1260 = 5873
// Use 7000 gross on c1 (overlap still 60, so net = 6940)
const dataOverdraft: HouseholdData = {
  ...data,
  cardStatements: [
    { id: 'od1', card_id: 'c1', statement_date: `${thisMonth}-15`, balance: 7000, created_at: '2026-01-01T00:00:00Z' },
  ],
  // Remove c2 (already missing in base, this keeps both active for simplicity)
}
const sOD = computeMonthSummary(dataOverdraft, new Date(now.getFullYear(), now.getMonth(), 1))
const odCardNet = 7000 - internetMonthly  // 6940
const odOutflow = jointExpected + 200 + odCardNet + 100   // no other spend for fiancee in base outside c2
const odLeftover = combined - odOutflow - expectedWealth
// leftover is negative — savingsDraw = -leftover
const odExpectedDraw = Math.max(0, -odLeftover)
const odExpectedNetWealth = expectedWealth - odExpectedDraw
// Retirement and investing are untouched; only effectiveSaving changes
const odExpectedEffectiveSaving = expectedSaving - odExpectedDraw

const odChecks: [string, number, number][] = [
  ['overdraft: savingsDraw = -netLeftover',          sOD.savingsDraw,         odExpectedDraw],
  ['overdraft: netWealthChange = planned - draw',    sOD.netWealthChange,     odExpectedNetWealth],
  ['overdraft: totalRetirement unchanged',           sOD.totalRetirement,     500],
  ['overdraft: effectiveSaving = saving - draw',     sOD.effectiveSaving,     odExpectedEffectiveSaving],
  ['overdraft: netSavingsRate = netWealth/income',   sOD.netSavingsRate,      odExpectedNetWealth / combined],
]

console.log('\n── Overdraft checks ──')
for (const [name, actual, expected] of odChecks) {
  const ok = Math.abs(actual - expected) < 0.01
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)}`)
}

console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) FAILED.`)
process.exit(failed === 0 ? 0 : 1)
