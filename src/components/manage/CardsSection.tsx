import { useState, type FormEvent } from 'react'
import type { CreditCard, FixedItem, Owner } from '../../types/db'
import { OWNERS, OWNER_LABELS } from '../../types/db'
import { formatMoneyExact, monthlyAmount, parseDate } from '../../lib/money'
import { useHouseholdData } from '../../hooks/useHouseholdData'
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  Field,
  FormError,
  MoneyInput,
  parseMoneyAny,
  parseMoney,
  Segmented,
  TextInput,
  useAsyncAction,
} from './fields'

export function CardsSection() {
  const { data } = useHouseholdData()
  const [adding, setAdding] = useState(false)
  const cards = (data?.creditCards ?? []).filter((c) => c.active)
  const fixedItems = data?.fixedItems ?? []

  return (
    <div className="space-y-5">
      {OWNERS.map((owner) => {
        const ownerCards = cards.filter((c) => c.owner === owner)
        return (
          <section key={owner}>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {OWNER_LABELS[owner]}
            </h3>
            {ownerCards.length === 0 && (
              <p className="rounded-xl border border-dashed border-line/80 px-4 py-3 text-sm text-ink-faint">
                No cards yet
              </p>
            )}
            <div className="space-y-3">
              {ownerCards.map((card) => (
                <CardBlock key={card.id} card={card} fixedItems={fixedItems} />
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

function CardBlock({ card, fixedItems }: { card: CreditCard; fixedItems: FixedItem[] }) {
  const { data, insert, update, remove } = useHouseholdData()
  const { run, busy, error } = useAsyncAction()
  const [date, setDate] = useState('')
  const [charges, setCharges] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)
  const [showCalc, setShowCalc] = useState(false)

  // Calculator state: derive charges from statement fields
  const [calcNew, setCalcNew] = useState('')
  const [calcPrev, setCalcPrev] = useState('')
  const [calcPayments, setCalcPayments] = useState('')

  const statements = (data?.cardStatements ?? [])
    .filter((s) => s.card_id === card.id)
    .sort((a, b) => b.statement_date.localeCompare(a.statement_date))

  const existingForDate = statements.find((s) => s.statement_date === date)

  // Fixed expense items that autopay on this card (for the $0 nudge)
  const autopaidItems = fixedItems.filter(
    (f) => f.active && f.kind === 'expense' && f.paid_via_card_id === card.id,
  )
  const autopaidMonthly = autopaidItems.reduce((sum, f) => sum + monthlyAmount(f.amount, f.frequency), 0)

  function applyCalculator() {
    const nb = parseMoney(calcNew)
    const pb = parseMoney(calcPrev)
    const pay = parseMoney(calcPayments)
    if (nb === null || pb === null || pay === null) return
    // New charges = New Balance − Previous Balance + Payments & Credits
    const computed = nb - pb + pay
    setCharges(computed.toFixed(2))
    setShowCalc(false)
  }

  async function logStatement(e: FormEvent) {
    e.preventDefault()
    const amt = parseMoneyAny(charges)
    if (!date) return setInvalid('Pick the statement closing date.')
    if (amt === null) return setInvalid('Enter a valid amount (can be negative for refund-heavy cycles).')
    setInvalid(null)
    const existing = statements.find((s) => s.statement_date === date)
    const ok = await run(() =>
      existing
        ? update('card_statements', existing.id, { balance: amt })
        : insert('card_statements', { card_id: card.id, statement_date: date, balance: amt }),
    )
    if (ok) {
      setDate('')
      setCharges('')
    }
  }

  async function removeCard() {
    if (
      window.confirm(`Remove ${card.name}? Its statement history will be deleted too.`)
    ) {
      await run(() => remove('credit_cards', card.id))
    }
  }

  const parsedCharges = parseMoneyAny(charges)
  const showZeroNudge =
    parsedCharges === 0 && autopaidItems.length > 0

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{card.name}</h4>
        <button onClick={() => void removeCard()} disabled={busy} className={`${btnDanger} -mr-2 px-2 py-1 text-xs`}>
          Remove
        </button>
      </div>

      <form onSubmit={logStatement} className="mt-3 space-y-3">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Closing date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="New charges this cycle">
            <MoneyInput value={charges} onChange={(e) => setCharges(e.target.value)} />
          </Field>
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-2.5 sm:w-auto`}>
            {existingForDate ? 'Update' : 'Log'}
          </button>
        </div>

        <div className="space-y-1 text-xs text-ink-faint">
          <p>
            Enter <span className="font-semibold text-ink-soft">Purchases + fees &amp; interest</span> from your statement summary — not the New Balance, not what you paid.
          </p>
          <button
            type="button"
            onClick={() => setShowCalc((v) => !v)}
            className="font-medium text-accent transition-colors hover:text-accent-deep"
          >
            {showCalc ? '▲ Hide calculator' : '▼ Find it from my statement'}
          </button>
        </div>

        {showCalc && (
          <div className="rounded-xl border border-line bg-paper px-4 py-3 space-y-3">
            <p className="text-xs font-semibold text-ink-soft">Statement calculator</p>
            <p className="text-xs text-ink-faint">
              If your statement shows a New Balance but buries the Purchases line, use this to derive it.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="New Balance">
                <MoneyInput value={calcNew} onChange={(e) => setCalcNew(e.target.value)} />
              </Field>
              <Field label="Previous Balance">
                <MoneyInput value={calcPrev} onChange={(e) => setCalcPrev(e.target.value)} />
              </Field>
              <Field label="Payments & Credits">
                <MoneyInput value={calcPayments} onChange={(e) => setCalcPayments(e.target.value)} />
              </Field>
            </div>
            <p className="text-[11px] text-ink-faint">
              Formula: New Balance − Previous Balance + Payments & Credits = New charges
            </p>
            <button
              type="button"
              onClick={applyCalculator}
              disabled={parseMoney(calcNew) === null || parseMoney(calcPrev) === null || parseMoney(calcPayments) === null}
              className={`${btnPrimary} py-2 text-xs disabled:opacity-40`}
            >
              Fill in amount →
            </button>
          </div>
        )}

        {showZeroNudge && (
          <p className="rounded-xl border border-warn/25 bg-warn-soft px-3.5 py-2.5 text-xs text-warn">
            This card autopays {autopaidItems.map((i) => i.name).join(', ')} (~{formatMoneyExact(autopaidMonthly)}/mo). A $0 cycle is unlikely — are you sure you entered Purchases rather than the New Balance?
          </p>
        )}

        {existingForDate && !invalid && (
          <p className="text-xs text-ink-soft">Re-saving updates that cycle's charges.</p>
        )}
      </form>

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
                <span className={`num font-semibold ${s.balance < 0 ? 'text-accent' : ''}`}>
                  {s.balance < 0 ? `−${formatMoneyExact(-s.balance)}` : formatMoneyExact(s.balance)}
                  {s.balance < 0 && <span className="ml-1 text-[11px] font-normal text-ink-faint">refund</span>}
                </span>
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
    <form onSubmit={onSubmit} className="space-y-4 surface p-4">
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
