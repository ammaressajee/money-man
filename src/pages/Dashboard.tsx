import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { useMonthlySummary } from '../hooks/useMonthlySummary'
import { formatMoney, formatMonth, formatPercent, monthKey } from '../lib/money'
import { computeSetupStatus } from '../lib/setup'
import type { MonthlySummary } from '../lib/summary'
import { computeGuidelines, guidelineStatusLabel, type GuidelineRow } from '../lib/guidelines'
import { OWNERS, OWNER_LABELS } from '../types/db'
import { AppHeader } from '../components/AppHeader'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { DashboardSkeleton } from '../components/Loader'
import { MissingStatementsBanner } from '../components/dashboard/MissingStatementsBanner'
import { MonthlyFlowCard } from '../components/dashboard/MonthlyFlowCard'
import { SetupChecklist } from '../components/dashboard/SetupChecklist'

const TrendChart = lazy(() =>
  import('../components/dashboard/TrendChart').then((m) => ({ default: m.TrendChart })),
)
const BreakdownChart = lazy(() =>
  import('../components/dashboard/BreakdownChart').then((m) => ({ default: m.BreakdownChart })),
)

function ChartFallback() {
  return <div className="h-52 animate-pulse rounded-xl bg-paper" aria-hidden />
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useHouseholdData()
  const summaries = useMonthlySummary(9)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    if (selectedKey && !summaries.some((s) => s.key === selectedKey)) {
      setSelectedKey(null)
    }
  }, [summaries, selectedKey])

  const resolvedIndex = (() => {
    if (selectedKey) {
      const idx = summaries.findIndex((s) => s.key === selectedKey)
      return idx >= 0 ? idx : summaries.length - 1
    }
    return summaries.length - 1
  })()

  const current = summaries[resolvedIndex]
  const prior = resolvedIndex > 0 ? summaries[resolvedIndex - 1] : undefined
  const isViewingCurrentMonth = resolvedIndex === summaries.length - 1

  function goMonth(delta: -1 | 1) {
    const next = Math.max(0, Math.min(summaries.length - 1, resolvedIndex + delta))
    const key = summaries[next]?.key
    setSelectedKey(key === summaries.at(-1)?.key ? null : key)
  }

  const setup = data ? computeSetupStatus(data, monthKey(new Date())) : null

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-10 pt-5">
      <h1 className="sr-only">
        {current ? `${formatMonth(current.month)} snapshot` : 'Dashboard'}
      </h1>
      <AppHeader />

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="rise rounded-card bg-card p-6 text-center shadow-card">
          <p className="font-semibold">Couldn't load your data</p>
          <p className="mt-1 text-sm text-ink-soft">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-solid transition-colors hover:bg-accent-deep"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && setup && !setup.isDashboardReady && (
        <SetupChecklist status={setup} />
      )}

      {!loading && !error && setup?.isDashboardReady && current && (
        <main className="space-y-4">
          {summaries.length > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => goMonth(-1)}
                disabled={resolvedIndex === 0}
                aria-label="Previous month"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                ← Prev
              </button>
              <p className="text-sm font-semibold">{formatMonth(current.month)}</p>
              <button
                onClick={() => goMonth(1)}
                disabled={isViewingCurrentMonth}
                aria-label="Next month"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}

          {(current.completeness.isCardSpendIncomplete ||
            current.completeness.suspectStatements.length > 0) && (
            <MissingStatementsBanner
              completeness={current.completeness}
              monthLabel={formatMonth(current.month)}
            />
          )}

          <HeroCard summary={current} prior={prior} />
          <MonthlyFlowCard summary={current} style={riseOrder(1)} />
          <YearToDateCard summaries={summaries} />
          <GuidelinesCard summary={current} />

          {current.combinedIncome > 0 && current.jointExpenses > 0 ? (
            <FairnessCard summary={current} />
          ) : current.jointExpenses > 0 ? (
            <FairnessPlaceholder summary={current} />
          ) : null}

          <Link
            to="/flow"
            className="rise block rounded-card bg-card p-5 shadow-card transition-shadow hover:shadow-card-lg"
            style={riseOrder(5)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">How money flows</h2>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Accounts, paychecks, joint share — the full picture
                </p>
              </div>
              <span className="text-sm font-medium text-accent" aria-hidden>
                View →
              </span>
            </div>
            <div className="mt-4 flex gap-2" aria-hidden>
              <span className="rounded-full bg-solid px-2.5 py-1 text-[11px] font-medium text-ink ring-1 ring-line">
                Paycheck
              </span>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                Wealth
              </span>
              <span className="rounded-full bg-clay-soft px-2.5 py-1 text-[11px] font-medium text-clay">
                Spend
              </span>
              <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-soft">
                Joint
              </span>
            </div>
          </Link>

          <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(6)}>
            <h2 className="text-sm font-semibold">Spending trend</h2>
            <p className="mb-3 text-xs text-ink-soft">
              Logged card and debit spend by month.{' '}
              <span className="italic">
                Dashed lines use today's recurring income and investing for every month.
              </span>
            </p>
            <Suspense fallback={<ChartFallback />}>
              <TrendChart summaries={summaries} selectedKey={current.key} />
            </Suspense>
          </section>

          <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(7)}>
            <h2 className="text-sm font-semibold">
              Where {isViewingCurrentMonth ? "this month's" : `${formatMonth(current.month)}`} spending went
            </h2>
            <p className="mb-3 text-xs text-ink-soft">
              Macro categories only — investing isn't spend, so it's not here
            </p>
            <Suspense fallback={<ChartFallback />}>
              <BreakdownChart slices={current.categoryOutflow} />
            </Suspense>
          </section>

          <Link
            to="/manage"
            className="rise block rounded-card border border-line bg-card px-5 py-4 text-center text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            style={riseOrder(8)}
          >
            Manage data
          </Link>
        </main>
      )}
    </div>
  )
}

function riseOrder(n: number) {
  return { '--rise-order': n } as CSSProperties
}

function HeroCard({ summary, prior }: { summary: MonthlySummary; prior?: MonthlySummary }) {
  const { netWealthChange, netSavingsRate, savingsDraw, combinedIncome } = summary
  const momDelta = prior !== undefined ? netWealthChange - prior.netWealthChange : null
  const isNegative = netWealthChange < 0
  const hasDrawdown = savingsDraw > 0

  const heroTone = isNegative
    ? 'bg-danger text-white'
    : hasDrawdown
      ? 'bg-accent/90 text-solid'
      : 'bg-accent text-solid'

  return (
    <section
      className={`rise rounded-card p-6 shadow-card-lg ${heroTone}`}
      style={riseOrder(0)}
    >
      <h2 className={`text-sm font-medium ${isNegative ? 'text-white/70' : 'text-solid/70'}`}>
        Net wealth this month
      </h2>
      <p className="mt-2 text-[52px] font-extrabold leading-none tracking-tight">
        <AnimatedNumber value={netWealthChange} />
      </p>
      <p className={`mt-3 text-sm ${isNegative ? 'text-white/70' : 'text-solid/70'}`}>
        {combinedIncome > 0
          ? `${formatPercent(netSavingsRate)} of combined income building wealth`
          : 'Add income to see this as a share of earnings'}
      </p>
      {hasDrawdown && (
        <p className={`mt-1.5 text-xs ${isNegative ? 'text-white/60' : 'text-solid/60'}`}>
          −{formatMoney(savingsDraw)} drawn from savings to cover shortfall · Roth still funded
        </p>
      )}
      {momDelta !== null && (
        <p className={`mt-1.5 text-xs ${isNegative ? 'text-white/50' : 'text-solid/55'}`}>
          {momDelta >= 0 ? '+' : ''}
          {formatMoney(momDelta)} vs last month
        </p>
      )}
    </section>
  )
}

function YearToDateCard({ summaries }: { summaries: MonthlySummary[] }) {
  const year = new Date().getFullYear()
  const ytd = summaries.filter((s) => s.month.getFullYear() === year)

  if (ytd.length === 0) return null

  const totalNetWealth = ytd.reduce((sum, s) => sum + s.netWealthChange, 0)
  const totalRetirement = ytd.reduce((sum, s) => sum + s.totalRetirement, 0)
  const totalInvesting = ytd.reduce((sum, s) => sum + s.totalInvesting, 0)
  const totalSaving = ytd.reduce((sum, s) => sum + s.effectiveSaving, 0)
  const totalDraw = ytd.reduce((sum, s) => sum + s.savingsDraw, 0)
  const totalIncome = ytd.reduce((sum, s) => sum + s.combinedIncome, 0)
  const ytdRate = totalIncome > 0 ? totalNetWealth / totalIncome : 0

  const monthCount = ytd.length
  const monthLabel = monthCount === 1 ? '1 month' : `${monthCount} months`

  const bars = [
    { label: 'Retirement', value: totalRetirement, className: 'bg-retire' },
    { label: 'Invested', value: totalInvesting, className: 'bg-invest' },
    { label: 'Cash savings', value: Math.max(0, totalSaving), className: 'bg-save' },
  ].filter((b) => b.value > 0)

  const stackTotal = bars.reduce((sum, b) => sum + b.value, 0)

  return (
    <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(2)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{year} year to date</h2>
        <p className="text-[11px] text-ink-faint">{monthLabel} so far</p>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[32px] font-extrabold leading-none tracking-tight">
            <AnimatedNumber value={totalNetWealth} />
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            net wealth built · {formatPercent(ytdRate)} of income
          </p>
        </div>
        {totalDraw > 0 && (
          <p className="text-right text-xs text-danger">
            {formatMoney(totalDraw)}<br />
            <span className="text-ink-faint">drawn from savings</span>
          </p>
        )}
      </div>

      {/* Stacked composition bar */}
      {stackTotal > 0 && (
        <div className="mt-4 flex h-2 w-full gap-px overflow-hidden rounded-full bg-paper" aria-hidden>
          {bars.map((b) => (
            <div
              key={b.label}
              className={`h-full ${b.className} transition-[width] duration-700`}
              style={{ width: `${(b.value / stackTotal) * 100}%` }}
            />
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Retirement', value: totalRetirement, dot: 'bg-retire' },
          { label: 'Invested', value: totalInvesting, dot: 'bg-invest' },
          { label: 'Cash savings', value: totalSaving, dot: 'bg-save', canNeg: true },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] text-ink-faint">
              <span className={`size-1.5 rounded-full ${item.dot}`} aria-hidden />
              {item.label}
            </p>
            <p className={`num mt-0.5 text-sm font-semibold ${'canNeg' in item && item.canNeg && totalSaving < 0 ? 'text-danger' : ''}`}>
              {formatMoney(item.value)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function GuidelinesCard({ summary }: { summary: MonthlySummary }) {
  const { rows, flexLegend, income } = computeGuidelines(summary)

  if (income === 0) return null

  const statusDot: Record<string, string> = {
    'on-track': 'bg-accent',
    'over': 'bg-danger',
    'under': 'bg-warn',
    'info': 'bg-line',
  }

  return (
    <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(3)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Monthly guidelines</h2>
        <p className="text-[11px] text-ink-faint">based on {formatMoney(income)} income</p>
      </div>
      <p className="mt-0.5 text-xs text-ink-soft">
        Targets based on income. Actual vs. recommended — not hard rules.
      </p>

      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <GuidelineRowItem key={row.id} row={row} income={income} statusDot={statusDot} />
        ))}
      </div>

      {/* Flexible spend legend */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          Flexible spend breakdown (guideline, not tracked)
        </p>
        <div className="mt-2 space-y-1.5">
          {flexLegend.map((leg) => (
            <div key={leg.id} className="flex items-center justify-between text-xs text-ink-soft">
              <span>{leg.label}</span>
              <span className="num font-medium">
                ~{formatMoney(leg.targetAmount)}
                <span className="ml-1 font-normal text-ink-faint">/ mo</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          These are mental targets within your flexible bucket. Log breakdown separately if you want to track them.
        </p>
      </div>
    </section>
  )
}

function GuidelineRowItem({
  row,
  income,
  statusDot,
}: {
  row: GuidelineRow
  income: number
  statusDot: Record<string, string>
}) {
  const fillPct = income > 0 ? Math.min(1, row.actualAmount / row.targetAmount) : 0
  const overPct = income > 0 && row.actualAmount > row.targetAmount
    ? Math.min(1, (row.actualAmount - row.targetAmount) / row.targetAmount)
    : 0
  const isOver = row.status === 'over'
  const isUnder = row.status === 'under'

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <span className={`size-1.5 rounded-full ${statusDot[row.status]}`} aria-hidden />
          {row.label}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className={`num font-semibold ${isOver ? 'text-danger' : isUnder ? 'text-warn' : ''}`}>
            {formatMoney(row.actualAmount)}
          </span>
          <span className="text-xs text-ink-faint">
            / {formatMoney(row.targetAmount)} target
          </span>
        </span>
      </div>

      <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${
            isOver ? 'bg-danger' : isUnder ? 'bg-warn' : 'bg-accent'
          }`}
          style={{ width: `${Math.min(100, fillPct * 100)}%` }}
        />
        {isOver && overPct > 0 && (
          <div
            className="absolute right-0 top-0 h-full rounded-r-full bg-danger/40"
            style={{ width: `${overPct * 30}%` }}
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        {row.note && <p className="text-[11px] text-ink-faint">{row.note}</p>}
        {row.status !== 'info' && (
          <p className={`ml-auto shrink-0 text-[11px] font-medium ${
            isOver ? 'text-danger' : isUnder ? 'text-warn' : 'text-accent'
          }`}>
            {guidelineStatusLabel(row.status)}
          </p>
        )}
      </div>
    </div>
  )
}

function FairnessCard({ summary }: { summary: MonthlySummary }) {
  const rows = OWNERS.map((owner) => ({ name: OWNER_LABELS[owner], s: summary[owner] }))

  return (
    <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(4)}>
      <h2 className="text-sm font-semibold">Joint costs, split by income</h2>
      <p className="mt-0.5 text-xs text-ink-soft">
        {formatMoney(summary.jointExpenses)} of shared bills, divided in proportion to what each
        of you earns this month
      </p>
      <div className="mt-4 space-y-4">
        {rows.map(({ name, s }) => (
          <div key={name}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{name}</span>
              <span className="num">
                {formatMoney(s.fairShare)}
                <span className="ml-1.5 text-xs text-ink-soft">
                  {formatPercent(s.incomeRatio)}
                </span>
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-accent-soft"
              role="img"
              aria-label={`${name}: ${formatPercent(s.incomeRatio)} of joint costs`}
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700"
                style={{ width: `${Math.min(100, s.incomeRatio * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">
              Personal &amp; cards: {formatMoney(s.personalExpenses + s.cardSpend + s.otherSpend)}
              {' · '}
              Total outflow: {formatMoney(s.totalOutflow)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FairnessPlaceholder({ summary }: { summary: MonthlySummary }) {
  return (
    <section
      className="rise rounded-card border border-dashed border-line bg-card p-5"
      style={riseOrder(4)}
    >
      <h2 className="text-sm font-semibold">Joint costs, split by income</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Add income to see each person's fair share of{' '}
        {formatMoney(summary.jointExpenses)} in shared bills.
      </p>
      <Link
        to="/manage"
        className="mt-3 inline-block text-sm font-semibold text-accent transition-colors hover:text-accent-deep"
      >
        Add income →
      </Link>
    </section>
  )
}
