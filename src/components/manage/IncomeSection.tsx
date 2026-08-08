import { useState, type FormEvent } from 'react'
import type { IncomeFrequency, IncomeSource, Owner } from '../../types/db'
import { OWNERS, OWNER_LABELS } from '../../types/db'
import { formatMoneyExact, monthlyAmount } from '../../lib/money'
import { useHouseholdData } from '../../hooks/useHouseholdData'
import {
  btnGhost,
  btnPrimary,
  Field,
  FormError,
  MoneyInput,
  parseMoney,
  Segmented,
  SelectInput,
  TextInput,
  useAsyncAction,
} from './fields'

const FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  annual: 'Annual',
  one_time: 'One-time',
}

export function IncomeSection() {
  const { data } = useHouseholdData()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const sources = data?.incomeSources ?? []

  return (
    <div className="space-y-5">
      {OWNERS.map((owner) => {
        const rows = sources.filter((s) => s.owner === owner)
        return (
          <section key={owner}>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {OWNER_LABELS[owner]}
            </h3>
            {rows.length === 0 && (
              <p className="rounded-xl border border-dashed border-line/80 px-4 py-3 text-sm text-ink-faint">
                No income yet
              </p>
            )}
            <ul className="space-y-2">
              {rows.map((s) =>
                editingId === s.id ? (
                  <li key={s.id}>
                    <IncomeForm initial={s} onDone={() => setEditingId(null)} />
                  </li>
                ) : (
                  <li key={s.id}>
                    <button
                      onClick={() => setEditingId(s.id)}
                      className={`list-row ${s.active ? '' : 'opacity-50'}`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">{s.label}</span>
                        <span className="block text-xs text-ink-soft">
                          {FREQUENCY_LABELS[s.frequency]}
                          {s.auto_savings_amount > 0 &&
                            ` · ${formatMoneyExact(s.auto_savings_amount)}/pay → ${formatMoneyExact(monthlyAmount(s.auto_savings_amount, s.frequency))}/mo`}
                          {!s.active && ' · Inactive'}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="num block text-sm font-bold">{formatMoneyExact(s.amount)}</span>
                        {s.frequency !== 'monthly' && s.frequency !== 'one_time' && (
                          <span className="num block text-[11px] text-ink-faint">
                            {formatMoneyExact(monthlyAmount(s.amount, s.frequency))}/mo
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        )
      })}

      {adding ? (
        <IncomeForm onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className={`${btnPrimary} w-full`}>
          Add income
        </button>
      )}
    </div>
  )
}

function IncomeForm({ initial, onDone }: { initial?: IncomeSource; onDone: () => void }) {
  const { insert, update } = useHouseholdData()
  const { run, busy, error } = useAsyncAction()
  const [owner, setOwner] = useState<Owner>(initial?.owner ?? 'ammar')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [frequency, setFrequency] = useState<IncomeFrequency>(initial?.frequency ?? 'biweekly')
  const [autoSavings, setAutoSavings] = useState(
    initial ? String(initial.auto_savings_amount) : '0',
  )
  const [invalid, setInvalid] = useState<string | null>(null)

  const parsedAuto = parseMoney(autoSavings)
  const monthlyAuto =
    parsedAuto !== null && frequency !== 'one_time'
      ? monthlyAmount(parsedAuto, frequency)
      : parsedAuto

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseMoney(amount)
    const savings = parseMoney(autoSavings)
    if (amt === null || amt <= 0) return setInvalid('Enter a valid amount.')
    if (savings === null) return setInvalid('Enter a valid auto-savings amount.')
    setInvalid(null)
    const row = {
      owner,
      label: label.trim(),
      amount: amt,
      frequency,
      auto_savings_amount: savings,
      active: initial?.active ?? true,
    }
    const ok = await run(() =>
      initial ? update('income_sources', initial.id, row) : insert('income_sources', row),
    )
    if (ok) onDone()
  }

  async function toggleActive() {
    if (!initial) return
    const ok = await run(() => update('income_sources', initial.id, { active: !initial.active }))
    if (ok) onDone()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 surface p-4">
      <Field label="Who">
        <Segmented
          ariaLabel="Income owner"
          options={OWNERS.map((o) => ({ value: o, label: OWNER_LABELS[o] }))}
          value={owner}
          onChange={setOwner}
        />
      </Field>
      <Field label="Label">
        <TextInput
          required
          placeholder="Biweekly Paycheck"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Net amount">
          <MoneyInput required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Frequency">
          <SelectInput
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
          >
            {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field label={frequency === 'monthly' ? 'Auto-saved per month' : 'Auto-saved per paycheck'}>
        <MoneyInput value={autoSavings} onChange={(e) => setAutoSavings(e.target.value)} />
      </Field>
      {monthlyAuto !== null && monthlyAuto > 0 && frequency !== 'monthly' && frequency !== 'one_time' && (
        <p className="text-xs text-ink-soft">
          Counts as{' '}
          <span className="num font-semibold text-ink">{formatMoneyExact(monthlyAuto)}/mo</span>
          {frequency === 'biweekly' ? ' (2 paychecks × amount)' : null}
          {frequency === 'annual' ? ' (annual ÷ 12)' : null}
        </p>
      )}
      <FormError message={invalid ?? error} />
      <div className="flex items-center justify-between">
        {initial ? (
          <button type="button" onClick={toggleActive} disabled={busy} className={btnGhost}>
            {initial.active ? 'Deactivate' : 'Reactivate'}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onDone} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
