/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { clearAuthSession, readAuthSession, saveAuthSession } from './session'

const AuthContext = createContext(null)
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readAuthSession)
  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading: false,
    configured: Boolean(googleClientId),
    clientId: googleClientId,
    completeGoogleSignIn: (credential) => {
      const nextSession = saveAuthSession(credential)
      setSession(nextSession)
      return nextSession
    },
    signOut: () => {
      clearAuthSession()
      window.google?.accounts?.id?.disableAutoSelect?.()
      setSession(null)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
