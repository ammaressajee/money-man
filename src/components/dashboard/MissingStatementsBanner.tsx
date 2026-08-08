import { Link } from 'react-router-dom'
import type { MonthCompleteness } from '../../lib/summary'
import { OWNER_LABELS } from '../../types/db'

interface Props {
  completeness: MonthCompleteness
  monthLabel: string
}

export function MissingStatementsBanner({ completeness, monthLabel }: Props) {
  const showMissing = completeness.isCardSpendIncomplete
  const showSuspect = completeness.suspectStatements.length > 0

  if (!showMissing && !showSuspect) return null

  return (
    <div className="space-y-2">
      {showMissing && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-clay/20 bg-clay-soft px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-clay">
              Card statements missing for {monthLabel}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {completeness.missingStatements.map((m) => m.cardName).join(', ')}
              {completeness.missingStatements.length === 1
                ? ` (${OWNER_LABELS[completeness.missingStatements[0].owner]})`
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
      )}

      {showSuspect && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Statement may be lower than expected
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {completeness.suspectStatements.map((m) => m.cardName).join(', ')} — logged charges are less than the fixed bills assigned to that card. Check that you entered Purchases, not the New Balance (or the big annual charge lands in a different cycle).
            </p>
          </div>
          <Link
            to="/manage"
            className="shrink-0 text-xs font-semibold text-amber-700 transition-colors hover:text-amber-800"
            aria-label="Review card statements in Manage"
          >
            Review →
          </Link>
        </div>
      )}
    </div>
  )
}
