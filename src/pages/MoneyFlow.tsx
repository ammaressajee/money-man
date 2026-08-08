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
    <div className="page page-wide">
      <AppHeader />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">How money flows</h1>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-soft">
            Wider ribbons mean more dollars. Teal builds wealth; clay is spending.
          </p>
        </div>
        <Link
          to="/"
          className="shrink-0 pt-1 text-sm font-medium text-ink-soft transition-colors hover:text-accent"
        >
          ← Dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-5 surface-pad text-center">
          <p className="font-semibold text-danger">Couldn&apos;t load your data</p>
          <p className="mt-1 text-sm text-ink-soft">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-solid transition-colors hover:bg-accent-deep"
          >
            Try again
          </button>
        </div>
      )}

      {!error && isEmpty && (
        <div className="rounded-card border border-dashed border-line bg-card/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink">Nothing to show yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">
            Add income and fixed costs to see how money moves through your household.
          </p>
          <Link
            to="/manage"
            className="mt-5 inline-block text-sm font-semibold text-accent transition-colors hover:text-accent-deep"
          >
            Set up your household →
          </Link>
        </div>
      )}

      {!error && !isEmpty && current && (
        <div className="space-y-6">
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

          <section className="rise overflow-hidden surface" style={riseOrder(0)}>
            <div className="border-b border-line px-5 py-4">
              <p className="section-label">Money map</p>
              <h2 className="mt-1.5 section-title text-base">
                Where {isViewingCurrentMonth ? "this month's" : `${formatMonth(current.month)}'s`}{' '}
                money went
              </h2>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                <FlowStat label="In" value={formatMoney(current.combinedIncome)} />
                <FlowStat label="Spent" value={formatMoney(current.combinedOutflow)} tone="clay" />
                <FlowStat label="Wealth" value={formatMoney(current.netWealthChange)} tone="accent" />
              </dl>
            </div>

            <div className="p-3 sm:p-5">
              <FlowSankey summary={current} />

              {current.completeness.isCardSpendIncomplete && (
                <p className="mt-3 text-xs leading-relaxed text-clay">
                  {current.completeness.missingStatements.length} card statement
                  {current.completeness.missingStatements.length === 1 ? '' : 's'} not logged for{' '}
                  {formatMonth(current.month)} — the credit card ribbon may be thinner than reality.
                </p>
              )}
            </div>
          </section>

          <section className="rise surface-pad" style={riseOrder(1)}>
            <h2 className="section-title">How your accounts are wired</h2>
            <p className="section-hint mb-5">
              The recurring setup behind the numbers — joint costs split by income.
            </p>
            <MoneyFlowDiagram summary={current} />
          </section>
        </div>
      )}
    </div>
  )
}

function FlowStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'clay' | 'accent'
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-ink-faint">{label}</dt>
      <dd
        className={`num mt-0.5 text-sm font-semibold tracking-tight sm:text-[15px] ${
          tone === 'clay' ? 'text-clay' : tone === 'accent' ? 'text-accent' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
