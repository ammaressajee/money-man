import { useState, type FormEvent } from 'react'
import type { Owner } from '../../types/db'
import { OWNERS, OWNER_LABELS } from '../../types/db'
import { formatMoneyExact, monthKey, parseDate } from '../../lib/money'
import { useHouseholdData } from '../../hooks/useHouseholdData'
import {
  btnDanger,
  btnPrimary,
  Field,
  FormError,
  MoneyInput,
  parseMoney,
  TextInput,
  useAsyncAction,
} from './fields'

function currentMonthValue(): string {
  return monthKey(new Date())
}

export function OtherSpendSection() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">
        Debit or cash that didn’t hit a tracked card. Add as many entries as you need per month —
        use the label for what it was for.
      </p>
      {OWNERS.map((owner) => (
        <OwnerOtherSpend key={owner} owner={owner} />
      ))}
    </div>
  )
}

function OwnerOtherSpend({ owner }: { owner: Owner }) {
  const { data, insert, remove } = useHouseholdData()
  const { run, busy, error } = useAsyncAction()
  const [month, setMonth] = useState(currentMonthValue())
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)

  const entries = (data?.otherSpend ?? [])
    .filter((o) => o.owner === owner)
    .sort((a, b) => {
      const byMonth = b.month.localeCompare(a.month)
      if (byMonth !== 0) return byMonth
      return b.created_at.localeCompare(a.created_at)
    })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseMoney(amount)
    if (amt === null) return setInvalid('Enter a valid amount.')
    setInvalid(null)
    const monthDate = `${month}-01`
    const ok = await run(() =>
      insert('other_spend', {
        owner,
        month: monthDate,
        amount: amt,
        label: label.trim(),
      }),
    )
    if (ok) {
      setAmount('')
      setLabel('')
    }
  }

  return (
    <section className="rounded-card bg-card p-4 shadow-card">
      <h3 className="text-sm font-bold">{OWNER_LABELS[owner]}</h3>
      <form
        onSubmit={onSubmit}
        className="mt-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]"
      >
        <Field label="Month">
          <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field label="Amount">
          <MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Label">
          <TextInput
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. farmer's market"
            maxLength={80}
          />
        </Field>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-2.5 sm:w-auto`}>
          Add
        </button>
      </form>
      <div className="mt-2">
        <FormError message={invalid ?? error} />
      </div>
      {entries.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {entries.slice(0, 8).map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block font-medium text-ink">
                  {o.label.trim() || 'Other spend'}
                </span>
                <span className="text-xs text-ink-soft">
                  {parseDate(o.month).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="num font-semibold">{formatMoneyExact(o.amount)}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => remove('other_spend', o.id))}
                  className={`${btnDanger} -mr-2 px-2 py-1 text-xs`}
                  aria-label={`Delete ${o.label.trim() || 'other spend'} ${formatMoneyExact(o.amount)}`}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
