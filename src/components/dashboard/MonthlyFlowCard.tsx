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
  const saved = summary.netWealthChange
  const leftover = summary.netLeftover
  const overspent = leftover < 0
  const hasDrawdown = summary.savingsDraw > 0

  // Stack uses effective cash savings (after any draw) so segment widths
  // never exceed the denominator when overspent.
  const stackSaving = Math.max(0, summary.effectiveSaving)
  const denom = Math.max(income, spend + saved, 1)
  const pctOfIncome = (n: number) => (income > 0 ? n / income : 0)
  const width = (n: number) => `${Math.max(0, (n / denom) * 100)}%`

  const bills = summary.jointExpenses + summary.ammar.personalExpenses + summary.fiancee.personalExpenses
  const cards = summary.ammar.cardSpend + summary.fiancee.cardSpend
  const totalOverlap = summary.ammar.cardFixedOverlap + summary.fiancee.cardFixedOverlap
  const other = summary.ammar.otherSpend + summary.fiancee.otherSpend

  const segments = [
    { key: 'spend', amount: spend, className: 'bg-clay' },
    { key: 'saving', amount: stackSaving, className: hasDrawdown ? 'bg-danger' : 'bg-save' },
    { key: 'investing', amount: summary.totalInvesting, className: 'bg-invest' },
    { key: 'retirement', amount: summary.totalRetirement, className: 'bg-retire' },
  ].filter((s) => s.amount > 0)

  return (
    <section className="rise surface-pad" style={style}>
      <h2 className="section-title">This month&apos;s flow</h2>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <HeadlineStat label="In" value={income} />
        <HeadlineStat label="Out" value={spend} />
        <HeadlineStat label="Saved" value={saved} accent />
      </div>

      <div
        className="mt-5 flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-paper"
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

      <div className="mt-5 space-y-4">
        <FlowRow
          label="Spending"
          amount={spend}
          pct={pctOfIncome(spend)}
          barWidth={width(spend)}
          barClass="bg-clay"
          detail={[
            bills > 0 ? `Bills ${formatMoney(bills)}` : null,
            cards > 0
              ? totalOverlap > 0
                ? `Cards ${formatMoney(cards)} (${formatMoney(totalOverlap)} in bills netted out)`
                : `Cards ${formatMoney(cards)}`
              : null,
            other > 0 ? `Other ${formatMoney(other)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        <FlowRow
          label={hasDrawdown ? 'Cash savings (drawn)' : 'Savings'}
          amount={summary.effectiveSaving}
          pct={pctOfIncome(summary.effectiveSaving)}
          barWidth={width(Math.max(0, summary.effectiveSaving))}
          barClass={hasDrawdown ? 'bg-danger' : 'bg-save'}
          detail={
            hasDrawdown
              ? `Below ${formatMoney(summary.totalSaving)} planned · −${formatMoney(summary.savingsDraw)} covered shortfall`
              : undefined
          }
          danger={hasDrawdown}
        />
        <FlowRow
          label="Invested"
          amount={summary.totalInvesting}
          pct={pctOfIncome(summary.totalInvesting)}
          barWidth={width(summary.totalInvesting)}
          barClass="bg-invest"
        />
        <FlowRow
          label="Retirement"
          amount={summary.totalRetirement}
          pct={pctOfIncome(summary.totalRetirement)}
          barWidth={width(summary.totalRetirement)}
          barClass="bg-retire"
        />
        <FlowRow
          label={overspent ? 'Overspent by' : 'Leftover'}
          amount={Math.abs(leftover)}
          pct={pctOfIncome(Math.abs(leftover))}
          barWidth={width(Math.abs(leftover))}
          barClass={overspent ? 'bg-danger' : 'bg-ink-faint/40'}
          detail={
            overspent
              ? hasDrawdown
                ? 'Shortfall covered from savings'
                : 'Out + saved exceeds income'
              : undefined
          }
          danger={overspent}
        />
      </div>
    </section>
  )
}

function HeadlineStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-ink-faint">{label}</p>
      <p className={`num mt-1 truncate text-base font-bold tracking-tight ${accent ? 'text-accent' : ''}`}>
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
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper" aria-hidden>
        <div
          className={`h-full rounded-full ${barClass} transition-[width] duration-700`}
          style={{ width: barWidth }}
        />
      </div>
      {detail && (
        <p className={`mt-1 text-[11px] leading-snug ${danger ? 'text-danger/75' : 'text-ink-faint'}`}>
          {detail}
        </p>
      )}
    </div>
  )
}
