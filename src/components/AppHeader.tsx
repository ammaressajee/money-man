import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
      <span className="size-2.5 rounded-full bg-accent" aria-hidden />
      Money Man
    </span>
  )
}

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { isDemo, signOut } = useAuth()
  return (
    <header className="mb-6">
      {isDemo && (
        <p className="mb-4 rounded-full bg-clay-soft px-4 py-2 text-center text-xs font-medium text-clay">
          Demo data — connect Supabase env vars to go live (see README)
        </p>
      )}
      <div className="flex items-center justify-between">
        <Link to="/" className="rounded" aria-label="Money Man — home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4">
          {subtitle && <span className="text-sm text-ink-soft">{subtitle}</span>}
          {!isDemo && (
            <button
              onClick={() => void signOut()}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
