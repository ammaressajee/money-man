import type { CSSProperties } from 'react'
import { formatMoney, formatPercent } from '../../lib/money'
import type { MonthlySummary } from '../../lib/summary'

/**
 * "In vs out vs saved" for one month, read top to bottom:
 * income at the top, a proportional split bar, then one row per
 * destination (spending, savings, investments, retirement, leftover)
 * with bars sized relative to income.
 */
export function MonthlyFlowCard({
  summary,
  style,
}: {
  summary: MonthlySummary
  style?: CSSProperties
}) {
  const income = summary.combinedIncome
  const spend = summary.combinedOutflow
  const saved = summary.totalSavedInvested
  const leftover = summary.netLeftover
  const overspent = leftover < 0

  // When spending + saving exceeds income, scale bars to the larger total
  // so nothing overflows the card.
  const denom = Math.max(income, spend + saved, 1)
  const pctOfIncome = (n: number) => (income > 0 ? n / income : 0)
  const width = (n: number) => `${Math.max(0, (n / denom) * 100)}%`

  const bills = summary.jointExpenses + summary.ammar.personalExpenses + summary.fiancee.personalExpenses
  const cards = summary.ammar.cardSpend + summary.fiancee.cardSpend
  const other = summary.ammar.otherSpend + summary.fiancee.otherSpend

  const segments = [
    { key: 'spend', amount: spend, className: 'bg-clay' },
    { key: 'saving', amount: summary.totalSaving, className: 'bg-save' },
    { key: 'investing', amount: summary.totalInvesting, className: 'bg-invest' },
    { key: 'retirement', amount: summary.totalRetirement, className: 'bg-retire' },
  ].filter((s) => s.amount > 0)

  return (
    <section className="rise rounded-card bg-card p-5 shadow-card" style={style}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">This month's flow</h2>
        <p className="text-xs text-ink-faint">% of income</p>
      </div>

      {/* Headline: in vs out vs saved */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-line bg-paper/60 px-3 py-2.5">
        <HeadlineStat label="In" value={income} />
        <HeadlineStat label="Out" value={spend} />
        <HeadlineStat label="Saved" value={saved} accent />
      </div>

      {/* Composition bar: how income splits */}
      <div
        className="mt-4 flex h-3 w-full gap-px overflow-hidden rounded-full bg-paper"
        role="img"
        aria-label={`Of ${formatMoney(income)} income: ${formatMoney(spend)} spent, ${formatMoney(saved)} saved, ${formatMoney(leftover)} left over`}
      >
        {segments.map((s) => (
          <div key={s.key} className={`h-full ${s.className}`} style={{ width: width(s.amount) }} />
        ))}
        {leftover > 0 && (
          <div
            className="h-full border border-line bg-card"
            style={{ width: width(leftover) }}
          />
        )}
      </div>

      <div className="mt-4 space-y-3.5">
        <FlowRow
          label="Spending"
          amount={spend}
          pct={pctOfIncome(spend)}
          barWidth={width(spend)}
          barClass="bg-clay"
          detail={[
            bills > 0 ? `Bills ${formatMoney(bills)}` : null,
            cards > 0 ? `Cards ${formatMoney(cards)}` : null,
            other > 0 ? `Other ${formatMoney(other)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <FlowRow
          label="Savings"
          amount={summary.totalSaving}
          pct={pctOfIncome(summary.totalSaving)}
          barWidth={width(summary.totalSaving)}
          barClass="bg-save"
          detail="Cash — incl. paycheck auto-transfers"
        />
        <FlowRow
          label="Invested"
          amount={summary.totalInvesting}
          pct={pctOfIncome(summary.totalInvesting)}
          barWidth={width(summary.totalInvesting)}
          barClass="bg-invest"
          detail="Brokerage & taxable investing"
        />
        <FlowRow
          label="Retirement"
          amount={summary.totalRetirement}
          pct={pctOfIncome(summary.totalRetirement)}
          barWidth={width(summary.totalRetirement)}
          barClass="bg-retire"
          detail="Roth IRA, 401(k), HSA…"
        />
        <FlowRow
          label={overspent ? 'Overspent by' : 'Leftover'}
          amount={Math.abs(leftover)}
          pct={pctOfIncome(Math.abs(leftover))}
          barWidth={width(Math.abs(leftover))}
          barClass={overspent ? 'bg-danger' : 'bg-ink-faint/50'}
          detail={overspent ? 'Out + saved exceeds income this month' : 'Unallocated cash in checking'}
          danger={overspent}
        />
      </div>
    </section>
  )
}

function HeadlineStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`num mt-0.5 truncate text-[15px] font-bold ${accent ? 'text-accent-deep' : ''}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}

function FlowRow({
  label,
  amount,
  pct,
  barWidth,
  barClass,
  detail,
  danger,
}: {
  label: string
  amount: number
  pct: number
  barWidth: string
  barClass: string
  detail?: string
  danger?: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={`font-medium ${danger ? 'text-danger' : ''}`}>{label}</span>
        <span className={`num font-semibold ${danger ? 'text-danger' : ''}`}>
          {formatMoney(amount)}
          {pct > 0 && (
            <span className="ml-1.5 text-xs font-normal text-ink-faint">{formatPercent(pct)}</span>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper" aria-hidden>
        <div
          className={`h-full rounded-full ${barClass} transition-[width] duration-700`}
          style={{ width: barWidth }}
        />
      </div>
      {detail && <p className="mt-1 text-[11px] text-ink-faint">{detail}</p>}
    </div>
  )
}
