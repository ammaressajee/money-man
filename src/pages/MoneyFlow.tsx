import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { FlowSankey } from '../components/dashboard/FlowSankey'
import { MoneyFlowDiagram } from '../components/dashboard/MoneyFlowDiagram'
import { useMonthlySummary } from '../hooks/useMonthlySummary'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { FullPageLoader } from '../components/Loader'
import { formatMoney, formatMonth } from '../lib/money'

function riseOrder(n: number) {
  return { '--rise-order': n } as CSSProperties
}

export default function MoneyFlow() {
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
  const isViewingCurrentMonth = resolvedIndex === summaries.length - 1

  function goMonth(delta: -1 | 1) {
    const next = Math.max(0, Math.min(summaries.length - 1, resolvedIndex + delta))
    const key = summaries[next]?.key
    setSelectedKey(key === summaries.at(-1)?.key ? null : key)
  }

  if (loading && !data) return <FullPageLoader />

  const isEmpty =
    data &&
    data.incomeSources.filter((s) => s.active).length === 0 &&
    data.fixedItems.filter((f) => f.active).length === 0

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-10 pt-5">
      <AppHeader />

      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">How money flows</h1>
        <Link to="/" className="text-sm font-medium text-accent hover:text-accent-deep">
          ← Dashboard
        </Link>
      </div>
      <p className="mb-5 text-sm text-ink-soft">
        Every ribbon is sized by dollars — the wider the ribbon, the more money moved.
        Wealth builds in teal, spending runs in clay.
      </p>

      {error && (
        <div className="mb-5 rounded-card bg-clay-soft p-5 text-center shadow-card">
          <p className="font-semibold text-danger">Couldn't load your data</p>
          <p className="mt-1 text-sm text-ink-soft">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Try again
          </button>
        </div>
      )}

      {!error && isEmpty && (
        <div className="rounded-card border border-dashed border-line bg-card p-8 text-center">
          <p className="text-sm font-medium text-ink">Nothing to show yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add income and fixed costs to see how money moves through your household.
          </p>
          <Link
            to="/manage"
            className="mt-4 inline-block text-sm font-semibold text-accent transition-colors hover:text-accent-deep"
          >
            Set up your household →
          </Link>
        </div>
      )}

      {!error && !isEmpty && current && (
        <div className="space-y-4">
          {/* Month navigation */}
          {summaries.length > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => goMonth(-1)}
                disabled={resolvedIndex === 0}
                aria-label="Previous month"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-card hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                ← Prev
              </button>
              <p className="text-sm font-semibold">{formatMonth(current.month)}</p>
              <button
                onClick={() => goMonth(1)}
                disabled={isViewingCurrentMonth}
                aria-label="Next month"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-card hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}

          <section className="rise rounded-card bg-card p-4 shadow-card sm:p-5" style={riseOrder(0)}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-sm font-semibold">
                Where {isViewingCurrentMonth ? "this month's" : `${formatMonth(current.month)}'s`}{' '}
                money went
              </h2>
              <div className="flex gap-4 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-ink" aria-hidden />
                  In <strong className="num text-ink">{formatMoney(current.combinedIncome)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-clay" aria-hidden />
                  Spent{' '}
                  <strong className="num text-ink">{formatMoney(current.combinedOutflow)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  Saved{' '}
                  <strong className="num text-ink">
                    {formatMoney(current.totalSavedInvested)}
                  </strong>
                </span>
              </div>
            </div>

            <FlowSankey summary={current} />

            {current.completeness.isCardSpendIncomplete && (
              <p className="mt-3 rounded-xl bg-clay-soft px-3 py-2 text-xs text-clay">
                {current.completeness.missingStatements.length} card statement
                {current.completeness.missingStatements.length === 1 ? '' : 's'} not logged for{' '}
                {formatMonth(current.month)} — the credit card ribbon may be thinner than reality.
              </p>
            )}
          </section>

          <section className="rise rounded-card bg-card p-4 shadow-card sm:p-5" style={riseOrder(1)}>
            <h2 className="text-sm font-semibold">How your accounts are wired</h2>
            <p className="mb-4 mt-0.5 text-xs text-ink-soft">
              The recurring setup behind the numbers — joint costs split by what each of you earns.
            </p>
            <MoneyFlowDiagram summary={current} />
          </section>
        </div>
      )}
    </div>
  )
}
