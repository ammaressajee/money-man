import { useState, type FormEvent } from 'react'
import type { CreditCard, Owner } from '../../types/db'
import { OWNERS, OWNER_LABELS } from '../../types/db'
import { formatMoneyExact, parseDate } from '../../lib/money'
import { useHouseholdData } from '../../hooks/useHouseholdData'
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  Field,
  FormError,
  MoneyInput,
  parseMoney,
  Segmented,
  TextInput,
  useAsyncAction,
} from './fields'

export function CardsSection() {
  const { data } = useHouseholdData()
  const [adding, setAdding] = useState(false)
  const cards = (data?.creditCards ?? []).filter((c) => c.active)

  return (
    <div className="space-y-5">
      {OWNERS.map((owner) => {
        const ownerCards = cards.filter((c) => c.owner === owner)
        return (
          <section key={owner}>
            <h3 className="mb-2 text-sm font-semibold text-ink-soft">{OWNER_LABELS[owner]}</h3>
            {ownerCards.length === 0 && (
              <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
                No cards yet
              </p>
            )}
            <div className="space-y-3">
              {ownerCards.map((card) => (
                <CardBlock key={card.id} card={card} />
              ))}
            </div>
          </section>
        )
      })}

      {adding ? (
        <AddCardForm onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className={`${btnPrimary} w-full`}>
          Add card
        </button>
      )}
    </div>
  )
}

function CardBlock({ card }: { card: CreditCard }) {
  const { data, insert, update, remove } = useHouseholdData()
  const { run, busy, error } = useAsyncAction()
  const [date, setDate] = useState('')
  const [balance, setBalance] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)

  const statements = (data?.cardStatements ?? [])
    .filter((s) => s.card_id === card.id)
    .sort((a, b) => b.statement_date.localeCompare(a.statement_date))

  const existingForDate = statements.find((s) => s.statement_date === date)

  async function logStatement(e: FormEvent) {
    e.preventDefault()
    const amt = parseMoney(balance)
    if (!date) return setInvalid('Pick the statement closing date.')
    if (amt === null) return setInvalid('Enter a valid balance.')
    setInvalid(null)
    const existing = statements.find((s) => s.statement_date === date)
    const ok = await run(() =>
      existing
        ? update('card_statements', existing.id, { balance: amt })
        : insert('card_statements', { card_id: card.id, statement_date: date, balance: amt }),
    )
    if (ok) {
      setDate('')
      setBalance('')
    }
  }

  async function removeCard() {
    if (
      window.confirm(`Remove ${card.name}? Its statement history will be deleted too.`)
    ) {
      await run(() => remove('credit_cards', card.id))
    }
  }

  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold">{card.name}</h4>
        <button onClick={() => void removeCard()} disabled={busy} className={`${btnDanger} -mr-2 px-2 py-1 text-xs`}>
          Remove
        </button>
      </div>

      <form onSubmit={logStatement} className="mt-3 grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Closing date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Balance">
          <MoneyInput value={balance} onChange={(e) => setBalance(e.target.value)} />
        </Field>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-2.5 sm:w-auto`}>
          {existingForDate ? 'Update' : 'Log'}
        </button>
      </form>
      {existingForDate && !invalid && (
        <p className="mt-1 text-xs text-ink-soft">Re-saving updates that cycle's balance.</p>
      )}
      <div className="mt-2">
        <FormError message={invalid ?? error} />
      </div>

      {statements.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {statements.slice(0, 6).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-soft">
                {parseDate(s.statement_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-3">
                <span className="num font-semibold">{formatMoneyExact(s.balance)}</span>
                <button
                  onClick={() => void run(() => remove('card_statements', s.id))}
                  disabled={busy}
                  aria-label={`Delete statement from ${s.statement_date}`}
                  className="text-xs text-ink-faint transition-colors hover:text-danger"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AddCardForm({ onDone }: { onDone: () => void }) {
  const { insert } = useHouseholdData()
  const { run, busy, error } = useAsyncAction()
  const [name, setName] = useState('')
  const [owner, setOwner] = useState<Owner>('ammar')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await run(() =>
      insert('credit_cards', { name: name.trim(), owner, active: true }),
    )
    if (ok) onDone()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card bg-card p-4 shadow-card">
      <Field label="Card name">
        <TextInput
          required
          placeholder="Chase Sapphire"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Owner">
        <Segmented
          ariaLabel="Card owner"
          options={OWNERS.map((o) => ({ value: o, label: OWNER_LABELS[o] }))}
          value={owner}
          onChange={setOwner}
        />
      </Field>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={btnGhost}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? 'Saving…' : 'Add card'}
        </button>
      </div>
    </form>
  )
}
