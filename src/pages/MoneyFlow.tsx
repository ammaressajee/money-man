import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MoneyFlowDiagram } from '../components/dashboard/MoneyFlowDiagram'
import { useMonthlySummary } from '../hooks/useMonthlySummary'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { FullPageLoader } from '../components/Loader'

export default function MoneyFlow() {
  const { data, loading, error, refresh } = useHouseholdData()
  const summaries = useMonthlySummary(1)
  const current = summaries.at(-1)

  if (loading && !data) return <FullPageLoader />

  const isEmpty =
    data &&
    data.incomeSources.filter((s) => s.active).length === 0 &&
    data.fixedItems.filter((f) => f.active).length === 0

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-10 pt-5">
      <AppHeader />

      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">How money flows</h1>
        <Link to="/" className="text-sm font-medium text-accent hover:text-accent-deep">
          ← Dashboard
        </Link>
      </div>
      <p className="mb-5 text-sm text-ink-soft">
        Paychecks land in personal checking. Wealth builds in teal. Bills and cards are orange.
        Joint costs are split by what each of you earns.
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

      {!error && !isEmpty && (
        <section className="rise rounded-card bg-card p-4 shadow-card sm:p-5">
          <MoneyFlowDiagram summary={current} />
        </section>
      )}
    </div>
  )
}
