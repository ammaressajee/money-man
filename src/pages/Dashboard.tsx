import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { useMonthlySummary } from '../hooks/useMonthlySummary'
import { formatMoney, formatMonth, formatPercent, monthKey } from '../lib/money'
import { computeSetupStatus } from '../lib/setup'
import type { MonthlySummary } from '../lib/summary'
import { OWNERS, OWNER_LABELS } from '../types/db'
import { AppHeader } from '../components/AppHeader'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { DashboardSkeleton } from '../components/Loader'
import { MissingStatementsBanner } from '../components/dashboard/MissingStatementsBanner'
import { MonthlyFlowCard } from '../components/dashboard/MonthlyFlowCard'
import { SetupChecklist } from '../components/dashboard/SetupChecklist'

// Charts pull in Recharts (~450 kB min) — split them out of the initial bundle.
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

  // Reset selection if data refreshes and the selected month falls off the window.
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
      <AppHeader subtitle={current ? undefined : undefined} />

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <div className="rise rounded-card bg-card p-6 text-center shadow-card">
          <p className="font-semibold">Couldn't load your data</p>
          <p className="mt-1 text-sm text-ink-soft">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
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
          {/* Month navigation */}
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

          {/* Missing statement warning */}
          {current.completeness.isCardSpendIncomplete && (
            <MissingStatementsBanner
              completeness={current.completeness}
              monthLabel={formatMonth(current.month)}
            />
          )}

          <HeroCard summary={current} prior={prior} />
          <MonthlyFlowCard summary={current} style={riseOrder(1)} />
          <StatRow summary={current} prior={prior} />
          {current.netLeftover < 0 && <OverspendCard summary={current} />}

          {current.combinedIncome > 0 && current.jointExpenses > 0 ? (
            <FairnessCard summary={current} />
          ) : current.jointExpenses > 0 ? (
            <FairnessPlaceholder summary={current} />
          ) : null}

          <Link
            to="/flow"
            className="rise block rounded-card bg-card p-5 shadow-card transition-shadow hover:shadow-card-lg"
            style={riseOrder(4)}
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
              <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">
                Paycheck
              </span>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-deep">
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

          <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(5)}>
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

          <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(6)}>
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
            style={riseOrder(7)}
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
  const pct = summary.savingsRate
  const momDelta = prior !== undefined ? summary.totalSavedInvested - prior.totalSavedInvested : null

  return (
    <section
      className="rise rounded-card bg-accent-deep p-6 text-white shadow-card-lg"
      style={riseOrder(0)}
    >
      <h2 className="text-sm font-medium text-white/70">Saved &amp; invested this month</h2>
      <p className="mt-2 text-[52px] font-extrabold leading-none tracking-tight">
        <AnimatedNumber value={summary.totalSavedInvested} />
      </p>
      <p className="mt-3 text-sm text-white/70">
        {summary.combinedIncome > 0
          ? `${formatPercent(pct)} of your combined income is building wealth`
          : 'Add income to see this as a share of earnings'}
      </p>
      {momDelta !== null && (
        <p className="mt-1.5 text-xs text-white/50">
          {momDelta >= 0 ? '+' : ''}
          {formatMoney(momDelta)} vs last month
        </p>
      )}
    </section>
  )
}

function OverspendCard({ summary }: { summary: MonthlySummary }) {
  const overspend = Math.abs(summary.netLeftover)

  return (
    <section
      className="rise rounded-card border border-danger/20 bg-clay-soft p-5 shadow-card"
      style={riseOrder(2)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-danger">Over budget this month</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Spending and saving together exceed income
          </p>
        </div>
        <p className="num shrink-0 text-2xl font-bold text-danger">
          <AnimatedNumber value={-overspend} />
        </p>
      </div>
      {summary.completeness.isCardSpendIncomplete && (
        <p className="mt-3 text-sm text-danger">
          Log missing card statements — spending totals may be understated.
        </p>
      )}
    </section>
  )
}

function StatRow({ summary, prior }: { summary: MonthlySummary; prior?: MonthlySummary }) {
  const delta = (now: number, before?: number) =>
    before !== undefined
      ? `${now - before >= 0 ? '+' : ''}${formatMoney(now - before)} vs last month`
      : null

  const stats = [
    {
      label: 'Income',
      value: formatMoney(summary.combinedIncome),
      hint: null as string | null,
      dot: null as string | null,
    },
    {
      label: 'Spending',
      value: formatMoney(summary.combinedOutflow),
      hint: delta(summary.combinedOutflow, prior?.combinedOutflow),
      dot: 'bg-clay',
    },
    {
      label: 'Saved total',
      value: formatMoney(summary.totalSavedInvested),
      hint: `${formatPercent(summary.savingsRate)} of income`,
      dot: null,
    },
    {
      label: 'Savings',
      value: formatMoney(summary.totalSaving),
      hint: null,
      dot: 'bg-save',
    },
    {
      label: 'Invested',
      value: formatMoney(summary.totalInvesting),
      hint: null,
      dot: 'bg-invest',
    },
    {
      label: 'Retirement',
      value: formatMoney(summary.totalRetirement),
      hint: null,
      dot: 'bg-retire',
    },
  ]

  return (
    <section
      className="rise grid grid-cols-2 gap-3 sm:grid-cols-3"
      style={riseOrder(3)}
      aria-label="Monthly totals"
    >
      {stats.map((s) => (
        <div key={s.label} className="rounded-card bg-card px-4 py-3.5 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            {s.dot && <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />}
            {s.label}
          </p>
          <p className="num mt-1 text-lg font-bold">{s.value}</p>
          {s.hint && <p className="mt-0.5 text-[11px] text-ink-faint">{s.hint}</p>}
        </div>
      ))}
    </section>
  )
}

function FairnessCard({ summary }: { summary: MonthlySummary }) {
  const rows = OWNERS.map((owner) => ({ name: OWNER_LABELS[owner], s: summary[owner] }))

  return (
    <section className="rise rounded-card bg-card p-5 shadow-card" style={riseOrder(3)}>
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
      style={riseOrder(3)}
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
