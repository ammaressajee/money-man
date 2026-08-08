import { useState, type FormEvent } from 'react'
import type { FixedFrequency, FixedItem, FixedKind, ItemOwner } from '../../types/db'
import { FIXED_CATEGORIES, KIND_LABELS, OWNER_LABELS } from '../../types/db'
import { formatMoneyExact } from '../../lib/money'
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

export function FixedItemsSection() {
  const { data } = useHouseholdData()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const items = data?.fixedItems ?? []
  const activeCards = (data?.creditCards ?? []).filter((c) => c.active)

  const categories = [...new Set(items.map((f) => f.category))].sort()

  return (
    <div className="space-y-5">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-faint">
          No fixed items yet — rent, subscriptions, car note, Roth IRA…
        </p>
      )}
      {categories.map((category) => (
        <section key={category}>
          <h3 className="mb-2 text-sm font-semibold text-ink-soft">{category}</h3>
          <ul className="space-y-2">
            {items
              .filter((f) => f.category === category)
              .map((f) =>
                editingId === f.id ? (
                  <li key={f.id}>
                    <FixedItemForm initial={f} activeCards={activeCards} onDone={() => setEditingId(null)} />
                  </li>
                ) : (
                  <li key={f.id}>
                    <button
                      onClick={() => setEditingId(f.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 text-left shadow-card transition-shadow hover:shadow-card-lg ${
                        f.active ? '' : 'opacity-50'
                      }`}
                    >
                      <span>
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {f.name}
                          <KindBadge kind={f.kind} />
                        </span>
                        <span className="block text-xs text-ink-soft">
                          {OWNER_LABELS[f.owner]} · {f.frequency === 'annual' ? 'Annual' : 'Monthly'}
                          {!f.active && ' · Inactive'}
                          {f.paid_via_card_id && (() => {
                            const card = activeCards.find((c) => c.id === f.paid_via_card_id)
                            return card ? ` · via ${card.name}` : null
                          })()}
                        </span>
                      </span>
                      <span className="num text-sm font-bold">{formatMoneyExact(f.amount)}</span>
                    </button>
                  </li>
                ),
              )}
          </ul>
        </section>
      ))}

      {adding ? (
        <FixedItemForm activeCards={activeCards} onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className={`${btnPrimary} w-full`}>
          Add fixed item
        </button>
      )}
    </div>
  )
}

const KIND_DOTS: Record<Exclude<FixedKind, 'expense'>, string> = {
  saving: 'bg-save',
  investment: 'bg-invest',
  retirement: 'bg-retire',
}

function KindBadge({ kind }: { kind: FixedKind }) {
  if (kind === 'expense') return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
      <span className={`size-1.5 rounded-full ${KIND_DOTS[kind]}`} aria-hidden />
      {KIND_LABELS[kind]}
    </span>
  )
}

interface ActiveCard {
  id: string
  name: string
}

function FixedItemForm({
  initial,
  activeCards,
  onDone,
}: {
  initial?: FixedItem
  activeCards: ActiveCard[]
  onDone: () => void
}) {
  const { insert, update } = useHouseholdData()
  const { run, busy, error } = useAsyncAction()
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [frequency, setFrequency] = useState<FixedFrequency>(initial?.frequency ?? 'monthly')
  const [category, setCategory] = useState(initial?.category ?? 'Housing')
  const [kind, setKind] = useState<FixedKind>(initial?.kind ?? 'expense')
  const [owner, setOwner] = useState<ItemOwner>(initial?.owner ?? 'joint')
  const [paidViaCardId, setPaidViaCardId] = useState<string>(initial?.paid_via_card_id ?? '')
  const [invalid, setInvalid] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const amt = parseMoney(amount)
    if (amt === null || amt <= 0) return setInvalid('Enter a valid amount.')
    setInvalid(null)
    const row = {
      name: name.trim(),
      amount: amt,
      frequency,
      category,
      kind,
      owner,
      // Only link to a card for expense items; wealth items aren't purchases.
      paid_via_card_id: kind === 'expense' && paidViaCardId ? paidViaCardId : null,
      active: initial?.active ?? true,
    }
    const ok = await run(() =>
      initial ? update('fixed_items', initial.id, row) : insert('fixed_items', row),
    )
    if (ok) onDone()
  }

  async function toggleActive() {
    if (!initial) return
    const ok = await run(() => update('fixed_items', initial.id, { active: !initial.active }))
    if (ok) onDone()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-card bg-card p-4 shadow-card">
      <Field label="Name">
        <TextInput
          required
          placeholder="Rent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <MoneyInput required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Frequency">
          <SelectInput
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as FixedFrequency)}
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </SelectInput>
        </Field>
      </div>
      <Field label="Category">
        <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
          {FIXED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Type">
        <Segmented
          ariaLabel="Expense, saving, investment, or retirement"
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'saving', label: 'Saving' },
            { value: 'investment', label: 'Invest' },
            { value: 'retirement', label: 'Retire' },
          ]}
          value={kind}
          onChange={(v) => {
            setKind(v)
            // Clear card link when switching away from expense
            if (v !== 'expense') setPaidViaCardId('')
          }}
        />
        <p className="mt-1.5 text-xs font-normal text-ink-faint">
          Saving = cash (HYSA, emergency fund) · Invest = brokerage · Retire = Roth IRA, 401(k)
        </p>
      </Field>
      <Field label="Owner">
        <Segmented
          ariaLabel="Item owner"
          options={(['ammar', 'fiancee', 'joint'] as ItemOwner[]).map((o) => ({
            value: o,
            label: OWNER_LABELS[o],
          }))}
          value={owner}
          onChange={setOwner}
        />
      </Field>

      {kind === 'expense' && (
        <div>
          <label className="block text-sm font-medium">
            Paid with
            <SelectInput
              value={paidViaCardId}
              onChange={(e) => setPaidViaCardId(e.target.value)}
            >
              <option value="">Bank account / debit</option>
              {activeCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </label>
          <p className="mt-1.5 text-xs text-ink-faint">
            If this bill autopays on a credit card, pick it so it isn't counted twice in the statement total.
          </p>
        </div>
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
