import { formatMoney, formatPercent } from '../../lib/money'
import type { MonthlySummary } from '../../lib/summary'

/**
 * Visual map of how money moves through the household.
 * Optional live amounts from this month's summary keep it grounded
 * without turning the diagram into a dashboard of its own.
 */
export function MoneyFlowDiagram({ summary }: { summary?: MonthlySummary }) {
  const ammarShare = summary ? formatPercent(summary.ammar.incomeRatio) : null
  const fianceeShare = summary ? formatPercent(summary.fiancee.incomeRatio) : null

  return (
    <div className="space-y-5" aria-label="How money flows through your household">
      {/* Personal columns */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonColumn
          name="Ammar"
          paycheck={summary?.ammar.income}
          shareLabel={ammarShare}
        />
        <PersonColumn
          name="Bethany"
          paycheck={summary?.fiancee.income}
          shareLabel={fianceeShare}
        />
      </div>

      {/* Converge into joint */}
      <div className="relative flex flex-col items-center gap-2">
        <div className="flex w-full items-center gap-2 px-2" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            share ∝ income
            {ammarShare && fianceeShare ? ` · ${ammarShare} / ${fianceeShare}` : ''}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <FlowArrow />
        <AccountNode
          title="Joint Checking"
          subtitle={
            summary
              ? `${formatMoney(summary.jointExpenses)}/mo shared bills`
              : 'Shared household costs'
          }
          tone="account"
          large
        />
        <FlowArrow />
        <div className="flex w-full flex-wrap justify-center gap-2">
          <Chip tone="spend">Rent</Chip>
          <Chip tone="spend">Utilities</Chip>
          <Chip tone="spend">Shared subs</Chip>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-4 text-xs text-ink-soft">
        <LegendDot className="bg-accent" label="Wealth-building" />
        <LegendDot className="bg-clay" label="Spending" />
        <LegendDot className="bg-ink-faint" label="Account" />
      </div>
    </div>
  )
}

function PersonColumn({
  name,
  paycheck,
  shareLabel,
}: {
  name: string
  paycheck?: number
  shareLabel: string | null
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper/60 p-3.5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">{name}</p>

      <Inflow
        label="Paycheck"
        amount={paycheck !== undefined ? formatMoney(paycheck) + '/mo' : undefined}
      />
      <FlowArrow />
      <AccountNode title="Personal Checking" tone="account" />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <MiniArrow />
          <AccountNode title="Savings" subtitle="Auto-transfer" tone="wealth" compact />
          <MiniArrow />
          <AccountNode title="Roth IRA" tone="wealth" compact />
        </div>
        <div className="space-y-2">
          <MiniArrow />
          <AccountNode title="Car · Insurance" tone="spend" compact />
          <MiniArrow />
          <AccountNode title="Credit Cards" subtitle="Statement cycle" tone="spend" compact />
        </div>
      </div>

      {shareLabel && (
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          Contributes {shareLabel} to joint
        </p>
      )}
    </div>
  )
}

function Inflow({ label, amount }: { label: string; amount?: string }) {
  return (
    <div className="rounded-xl bg-ink px-3 py-2.5 text-center text-white">
      <p className="text-[11px] font-medium text-white/70">{label}</p>
      {amount && <p className="num mt-0.5 text-sm font-bold">{amount}</p>}
    </div>
  )
}

function AccountNode({
  title,
  subtitle,
  tone,
  compact,
  large,
}: {
  title: string
  subtitle?: string
  tone: 'account' | 'wealth' | 'spend'
  compact?: boolean
  large?: boolean
}) {
  const tones = {
    account: 'border-line bg-card text-ink',
    wealth: 'border-accent/25 bg-accent-soft text-accent-deep',
    spend: 'border-clay/25 bg-clay-soft text-clay',
  }
  return (
    <div
      className={`w-full rounded-xl border text-center ${tones[tone]} ${
        compact ? 'px-2 py-2' : large ? 'px-4 py-3.5 shadow-card' : 'px-3 py-2.5'
      }`}
    >
      <p className={`font-semibold leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] opacity-70">{subtitle}</p>}
    </div>
  )
}

function Chip({ children, tone }: { children: string; tone: 'spend' | 'wealth' }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        tone === 'spend' ? 'bg-clay-soft text-clay' : 'bg-accent-soft text-accent-deep'
      }`}
    >
      {children}
    </span>
  )
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <svg width="12" height="14" viewBox="0 0 12 14" fill="none" className="text-ink-faint">
        <path
          d="M6 1v10M6 11l-3.5-3.5M6 11l3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function MiniArrow() {
  return (
    <div className="flex justify-center" aria-hidden>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-ink-faint">
        <path
          d="M5 1v6.5M5 7.5L2.5 5M5 7.5L7.5 5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} aria-hidden />
      {label}
    </span>
  )
}
