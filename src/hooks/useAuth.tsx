import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthStatus = 'loading' | 'signedIn' | 'signedOut'

interface AuthContextValue {
  status: AuthStatus
  isDemo: boolean
  /** Returns an error message on failure, null on success. */
  signIn(email: string, password: string): Promise<string | null>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'signedIn')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'signedIn' : 'signedOut')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'signedIn' : 'signedOut')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthContextValue = {
    status,
    isDemo: !isSupabaseConfigured,
    async signIn(email, password) {
      if (!supabase) return null
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? error.message : null
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
