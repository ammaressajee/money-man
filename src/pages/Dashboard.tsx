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
  return <div className="h-48 animate-pulse rounded-xl bg-paper" aria-hidden />
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useHouseholdData()
  // At least the full calendar year so YTD isn't truncated after September,
  // and keep 9 months of history early in the year for the trend chart.
  const monthsBack = Math.max(9, new Date().getMonth() + 1)
  const summaries = useMonthlySummary(monthsBack)
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
    <div className="page page-narrow">
      <h1 className="sr-only">
        {current ? `${formatMonth(current.month)} snapshot` : 'Dashboard'}
      </h1>
      <AppHeader />

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="rise surface-pad text-center">
          <p className="font-semibold">Couldn&apos;t load your data</p>
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
        <main className="space-y-6">
          {summaries.length > 1 && (
            <div className="month-nav">
              <button
                onClick={() => goMonth(-1)}
                disabled={resolvedIndex === 0}
                aria-label="Previous month"
                className="month-nav-btn"
              >
                ← Prev
              </button>
              <p className="month-nav-label">{formatMonth(current.month)}</p>
              <button
                onClick={() => goMonth(1)}
                disabled={isViewingCurrentMonth}
                aria-label="Next month"
                className="month-nav-btn"
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
            className="rise group flex items-center justify-between gap-3 border-y border-line py-4 transition-colors hover:border-accent/40"
            style={riseOrder(5)}
          >
            <div>
              <h2 className="section-title group-hover:text-accent">How money flows</h2>
              <p className="section-hint">Accounts, paychecks, and joint share</p>
            </div>
            <span className="text-sm font-medium text-accent" aria-hidden>
              View →
            </span>
          </Link>

          <section className="rise surface-pad" style={riseOrder(6)}>
            <h2 className="section-title">Spending trend</h2>
            <p className="section-hint mb-4">
              Card and debit spend by month. Dashed lines use today&apos;s recurring setup.
            </p>
            <Suspense fallback={<ChartFallback />}>
              <TrendChart summaries={summaries} selectedKey={current.key} />
            </Suspense>
          </section>

          <section className="rise surface-pad" style={riseOrder(7)}>
            <h2 className="section-title">
              Where {isViewingCurrentMonth ? "this month's" : `${formatMonth(current.month)}`}{' '}
              spending went
            </h2>
            <p className="section-hint mb-4">Macro categories — investing isn&apos;t spend</p>
            <Suspense fallback={<ChartFallback />}>
              <BreakdownChart slices={current.categoryOutflow} />
            </Suspense>
          </section>

          <div className="rise pt-1 text-center" style={riseOrder(8)}>
            <Link
              to="/manage"
              className="text-sm font-semibold text-ink-soft transition-colors hover:text-accent"
            >
              Manage data →
            </Link>
          </div>
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

  const soft = isNegative ? 'text-white/70' : 'text-solid/65'
  const softer = isNegative ? 'text-white/55' : 'text-solid/55'

  return (
    <section className={`rise rounded-card p-6 sm:p-7 ${heroTone}`} style={riseOrder(0)}>
      <h2 className={`text-sm font-medium ${soft}`}>Net wealth this month</h2>
      <p className="mt-3 text-[3.25rem] font-extrabold leading-none tracking-tight sm:text-[3.5rem]">
        <AnimatedNumber value={netWealthChange} />
      </p>
      <p className={`mt-4 text-sm leading-snug ${soft}`}>
        {combinedIncome > 0
          ? `${formatPercent(netSavingsRate)} of combined income`
          : 'Add income to see this as a share of earnings'}
      </p>
      {(hasDrawdown || momDelta !== null) && (
        <div className={`mt-3 space-y-1 text-xs leading-snug ${softer}`}>
          {hasDrawdown && (
            <p>
              −{formatMoney(savingsDraw)} drawn from savings · Roth still funded
            </p>
          )}
          {momDelta !== null && (
            <p>
              {momDelta >= 0 ? '+' : ''}
              {formatMoney(momDelta)} vs last month
            </p>
          )}
        </div>
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
    <section className="rise surface-pad" style={riseOrder(2)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">{year} year to date</h2>
        <p className="text-[11px] text-ink-faint">{monthLabel}</p>
      </div>

      <p className="num mt-4 text-[2rem] font-extrabold leading-none tracking-tight">
        <AnimatedNumber value={totalNetWealth} />
      </p>
      <p className="mt-1.5 text-xs text-ink-soft">
        net wealth · {formatPercent(ytdRate)} of income
        {totalDraw > 0 && (
          <span className="text-danger">
            {' '}
            · {formatMoney(totalDraw)} drawn
          </span>
        )}
      </p>

      {stackTotal > 0 && (
        <div className="mt-5 flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-paper" aria-hidden>
          {bars.map((b) => (
            <div
              key={b.label}
              className={`h-full ${b.className} transition-[width] duration-700`}
              style={{ width: `${(b.value / stackTotal) * 100}%` }}
            />
          ))}
        </div>
      )}

      <dl className="mt-4 space-y-2">
        {[
          { label: 'Retirement', value: totalRetirement, dot: 'bg-retire' },
          { label: 'Invested', value: totalInvesting, dot: 'bg-invest' },
          { label: 'Cash savings', value: totalSaving, dot: 'bg-save', canNeg: true },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-ink-soft">
              <span className={`size-1.5 rounded-full ${item.dot}`} aria-hidden />
              {item.label}
            </dt>
            <dd
              className={`num font-semibold ${
                'canNeg' in item && item.canNeg && totalSaving < 0 ? 'text-danger' : ''
              }`}
            >
              {formatMoney(item.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function GuidelinesCard({ summary }: { summary: MonthlySummary }) {
  const { rows, flexLegend, income } = computeGuidelines(summary)

  if (income === 0) return null

  const statusDot: Record<string, string> = {
    'on-track': 'bg-accent',
    over: 'bg-danger',
    under: 'bg-warn',
    info: 'bg-line',
  }

  return (
    <section className="rise surface-pad" style={riseOrder(3)}>
      <h2 className="section-title">Monthly guidelines</h2>
      <p className="section-hint">
        Targets from {formatMoney(income)} income — guides, not hard rules
      </p>

      <div className="mt-5 space-y-5">
        {rows.map((row) => (
          <GuidelineRowItem key={row.id} row={row} income={income} statusDot={statusDot} />
        ))}
      </div>

      <details className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft transition-colors hover:text-ink">
          Flexible spend targets
        </summary>
        <div className="mt-3 space-y-2">
          {flexLegend.map((leg) => (
            <div key={leg.id} className="flex items-center justify-between text-xs text-ink-soft">
              <span>{leg.label}</span>
              <span className="num font-medium">
                ~{formatMoney(leg.targetAmount)}
                <span className="ml-1 font-normal text-ink-faint">/mo</span>
              </span>
            </div>
          ))}
        </div>
      </details>
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
  const overPct =
    income > 0 && row.actualAmount > row.targetAmount
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
          <span className="text-xs text-ink-faint">/ {formatMoney(row.targetAmount)}</span>
        </span>
      </div>

      <div className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-paper">
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

      <div className="mt-1 flex items-center justify-between gap-2">
        {row.note && <p className="text-[11px] text-ink-faint">{row.note}</p>}
        {row.status !== 'info' && (
          <p
            className={`ml-auto shrink-0 text-[11px] font-medium ${
              isOver ? 'text-danger' : isUnder ? 'text-warn' : 'text-accent'
            }`}
          >
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
    <section className="rise surface-pad" style={riseOrder(4)}>
      <h2 className="section-title">Joint costs, split by income</h2>
      <p className="section-hint">
        {formatMoney(summary.jointExpenses)} shared bills, proportional to earnings
      </p>
      <div className="mt-5 space-y-5">
        {rows.map(({ name, s }) => (
          <div key={name}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{name}</span>
              <span className="num font-semibold">
                {formatMoney(s.fairShare)}
                <span className="ml-1.5 text-xs font-normal text-ink-faint">
                  {formatPercent(s.incomeRatio)}
                </span>
              </span>
            </div>
            <div
              className="mt-1.5 h-1 overflow-hidden rounded-full bg-accent-soft"
              role="img"
              aria-label={`${name}: ${formatPercent(s.incomeRatio)} of joint costs`}
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700"
                style={{ width: `${Math.min(100, s.incomeRatio * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Personal &amp; cards {formatMoney(s.personalExpenses + s.cardSpend + s.otherSpend)}
              {' · '}
              Total out {formatMoney(s.totalOutflow)}
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
      className="rise rounded-card border border-dashed border-line bg-card/60 p-5"
      style={riseOrder(4)}
    >
      <h2 className="section-title">Joint costs, split by income</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Add income to see each person&apos;s fair share of{' '}
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
