import { Link } from 'react-router-dom'
import type { MonthCompleteness } from '../../lib/summary'
import { OWNER_LABELS } from '../../types/db'

interface Props {
  completeness: MonthCompleteness
  monthLabel: string
}

export function MissingStatementsBanner({ completeness, monthLabel }: Props) {
  if (!completeness.isCardSpendIncomplete) return null

  const { missingStatements } = completeness
  const names = missingStatements.map((m) => m.cardName)

  return (
    <div
      role="status"
      className="flex items-start justify-between gap-3 rounded-xl border border-clay/20 bg-clay-soft px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-clay">
          Card statements missing for {monthLabel}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {names.join(', ')}
          {missingStatements.length === 1
            ? ` (${OWNER_LABELS[missingStatements[0].owner]})`
            : ''}
          {' — '}spending totals and leftover may be understated.
        </p>
      </div>
      <Link
        to="/manage"
        className="shrink-0 text-xs font-semibold text-clay transition-colors hover:text-clay/80"
        aria-label="Log missing card statements in Manage"
      >
        Log now →
      </Link>
    </div>
  )
}
