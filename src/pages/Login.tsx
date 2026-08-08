import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FullPageLoader, Spinner } from '../components/Loader'
import { Wordmark } from '../components/AppHeader'

export default function Login() {
  const { status, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') return <FullPageLoader />
  if (status === 'signedIn') return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const message = await signIn(email, password)
      if (message) setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="rise w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Wordmark size="hero" />
        </div>
        <form
          onSubmit={onSubmit}
          className="surface-pad"
          aria-label="Sign in"
        >
          <h1 className="text-lg font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Sign in to your shared household account.</p>

          <label className="mt-6 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base transition-colors focus:border-accent"
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base transition-colors focus:border-accent"
          />

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-clay-soft px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-solid transition-colors hover:bg-accent-deep disabled:opacity-60"
          >
            {submitting && <Spinner className="border-solid/40 border-t-solid" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
