import { useState, type FormEvent } from 'react'
import type { Owner } from '../../types/db'
import { OWNERS, OWNER_LABELS } from '../../types/db'
import { formatMoneyExact, monthKey, parseDate } from '../../lib/money'
import { useHouseholdData } from '../../hooks/useHouseholdData'
import { btnPrimary, Field, FormError, MoneyInput, parseMoney, TextInput, useAsyncAction } from './fields'

function currentMonthValue(): string {
  return monthKey(new Date())
}

export function OtherSpendSection() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">
        One number per person per month — a rough estimate of debit/cash spending that didn’t hit
        a tracked credit card. Re-saving a month updates it.
      </p>
      {OWNERS.map((owner) => (
        <OwnerOtherSpend key={owner} owner={owner} />
      ))}
    </div>
  )
}

function OwnerOtherSpend({ owner }: { owner: Owner }) {
  const { data, insert, update } = useHouseholdData()
  const { run, busy, error } = useAsyncAction()
  const [month, setMonth] = useState(currentMonthValue())
  const [amount, setAmount] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)

  const entries = (data?.otherSpend ?? [])
    .filter((o) => o.owner === owner)
    .sort((a, b) => b.month.localeCompare(a.month))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseMoney(amount)
    if (amt === null) return setInvalid('Enter a valid amount.')
    setInvalid(null)
    const monthDate = `${month}-01`
    const existing = entries.find((o) => monthKey(parseDate(o.month)) === month)
    const ok = await run(() =>
      existing
        ? update('other_spend', existing.id, { amount: amt })
        : insert('other_spend', { owner, month: monthDate, amount: amt }),
    )
    if (ok) setAmount('')
  }

  return (
    <section className="rounded-card bg-card p-4 shadow-card">
      <h3 className="text-sm font-bold">{OWNER_LABELS[owner]}</h3>
      <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Month">
          <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Field label="Estimate">
          <MoneyInput value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-2.5 sm:w-auto`}>
          Save
        </button>
      </form>
      <div className="mt-2">
        <FormError message={invalid ?? error} />
      </div>
      {entries.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {entries.slice(0, 4).map((o) => (
            <li key={o.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-soft">
                {parseDate(o.month).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="num font-semibold">{formatMoneyExact(o.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
