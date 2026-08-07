import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

export const btnPrimary =
  'rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60'
export const btnGhost =
  'rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink'
export const btnDanger =
  'rounded-xl px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-clay-soft'

const inputClass =
  'mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[15px] transition-colors focus:border-accent'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />
}

export function MoneyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute bottom-2.5 left-3.5 text-[15px] text-ink-faint">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        {...props}
        className={`${inputClass} pl-7`}
      />
    </div>
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="mt-1.5 flex rounded-xl border border-line bg-paper p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
            o.value === value ? 'bg-card font-semibold shadow-card' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Wraps a mutation with busy/error state for form submits. */
export function useAsyncAction(): {
  run: (fn: () => Promise<void>) => Promise<boolean>
  busy: boolean
  error: string | null
} {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return {
    busy,
    error,
    async run(fn) {
      setBusy(true)
      setError(null)
      try {
        await fn()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
        return false
      } finally {
        setBusy(false)
      }
    },
  }
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-clay-soft px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  )
}

/** Parse a money field; returns null when invalid. */
export function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/[$,\s]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}
