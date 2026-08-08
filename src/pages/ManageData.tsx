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
    <div className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-10 pt-5">
      <AppHeader />

      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Manage data</h1>
        <Link to="/" className="text-sm font-medium text-accent hover:text-accent-deep">
          ← Dashboard
        </Link>
      </div>
      <p className="mb-5 text-sm text-ink-soft">
        Set it up once, then just log card statements each cycle.
      </p>

      {error && (
        <div className="mb-5 rounded-card bg-clay-soft p-4 text-sm text-danger">
          {error}{' '}
          <button onClick={() => void refresh()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <nav
        role="tablist"
        aria-label="Data sections"
        className="mb-5 flex rounded-xl border border-line bg-card p-1 shadow-card"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="rise">
        {tab === 'income' && <IncomeSection />}
        {tab === 'fixed' && <FixedItemsSection />}
        {tab === 'cards' && <CardsSection />}
        {tab === 'other' && <OtherSpendSection />}
      </div>
    </div>
  )
}
