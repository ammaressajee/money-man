import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { AppHeader } from '../components/AppHeader'
import { FullPageLoader } from '../components/Loader'
import { IncomeSection } from '../components/manage/IncomeSection'
import { FixedItemsSection } from '../components/manage/FixedItemsSection'
import { CardsSection } from '../components/manage/CardsSection'
import { OtherSpendSection } from '../components/manage/OtherSpendSection'

const TABS = [
  { id: 'income', label: 'Income' },
  { id: 'fixed', label: 'Fixed' },
  { id: 'cards', label: 'Cards' },
  { id: 'other', label: 'Other' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function ManageData() {
  const { data, loading, error, refresh } = useHouseholdData()
  const [tab, setTab] = useState<TabId>('income')

  if (loading && !data) return <FullPageLoader />

  return (
    <div className="page page-narrow">
      <AppHeader />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manage data</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Set it up once, then log card statements each cycle.
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
        <div className="mb-5 rounded-xl bg-clay-soft px-4 py-3 text-sm text-danger">
          {error}{' '}
          <button onClick={() => void refresh()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <nav
        role="tablist"
        aria-label="Data sections"
        className="mb-6 flex gap-1 border-b border-line"
      >
        {TABS.map((t) => {
          const selected = tab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex-1 border-b-2 px-2 py-2.5 text-sm font-medium transition-colors ${
                selected
                  ? 'border-accent font-semibold text-accent'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      <div className="rise" key={tab}>
        {tab === 'income' && <IncomeSection />}
        {tab === 'fixed' && <FixedItemsSection />}
        {tab === 'cards' && <CardsSection />}
        {tab === 'other' && <OtherSpendSection />}
      </div>
    </div>
  )
}
