import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Geometric mark: coin + rising bars — reads as “money” without a literal dollar. */
export function MoneyManMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="40" height="40" rx="11" fill="#1fd6b5" />
      <circle cx="20" cy="20" r="11.5" stroke="#070c0b" strokeWidth="1.5" opacity="0.25" />
      {/* Rising bars */}
      <rect x="12" y="22" width="3.5" height="6" rx="1" fill="#070c0b" opacity="0.4" />
      <rect x="18.25" y="17" width="3.5" height="11" rx="1" fill="#070c0b" opacity="0.65" />
      <rect x="24.5" y="12.5" width="3.5" height="15.5" rx="1" fill="#070c0b" />
      {/* Soft accent tip */}
      <circle cx="26.25" cy="11" r="1.6" fill="#f0a070" />
    </svg>
  )
}

export function Wordmark({ size = 'default' }: { size?: 'default' | 'hero' }) {
  const hero = size === 'hero'
  return (
    <span className={`flex items-center ${hero ? 'gap-3' : 'gap-2.5'}`}>
      <MoneyManMark className={hero ? 'size-11' : 'size-9'} />
      <span className="leading-none">
        <span
          className={`block font-extrabold tracking-tight text-ink ${
            hero ? 'text-[1.65rem]' : 'text-[1.2rem]'
          }`}
        >
          Money Man
        </span>
        {hero && (
          <span className="mt-1 block text-[12px] font-medium tracking-wide text-ink-soft">
            Household money, clear at a glance
          </span>
        )}
      </span>
    </span>
  )
}

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { isDemo, signOut } = useAuth()
  return (
    <header className="mb-7">
      {isDemo && (
        <p className="mb-4 rounded-full bg-clay-soft px-4 py-2 text-center text-xs font-medium text-clay">
          Demo data — connect Supabase env vars to go live (see README)
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="rounded-lg" aria-label="Money Man — home">
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
