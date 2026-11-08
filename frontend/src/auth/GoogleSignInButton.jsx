import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const GOOGLE_SCRIPT_ID = 'google-identity-services'

export default function GoogleSignInButton({ text = 'signin_with', onSuccess }) {
  const { clientId, configured, completeGoogleSignIn } = useAuth()
  const buttonRef = useRef(null)
  const [error, setError] = useState('')
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.accounts?.id))

  useEffect(() => {
    if (!configured || window.google?.accounts?.id) return undefined
    let active = true
    let script = document.getElementById(GOOGLE_SCRIPT_ID)
    const loaded = () => { if (active) setScriptReady(true) }
    const failed = () => { if (active) setError('Google sign-in could not load. Check your connection and try again.') }
    if (!script) {
      script = document.createElement('script')
      script.id = GOOGLE_SCRIPT_ID
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', loaded)
    script.addEventListener('error', failed)
    if (window.google?.accounts?.id) loaded()
    return () => {
      active = false
      script?.removeEventListener('load', loaded)
      script?.removeEventListener('error', failed)
    }
  }, [configured])

  useEffect(() => {
    if (!scriptReady || !configured || !buttonRef.current || !window.google?.accounts?.id) return undefined
    let active = true
    const target = buttonRef.current
    target.replaceChildren()
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        if (!active || !credential) return
        try {
          completeGoogleSignIn(credential)
          onSuccess?.()
        } catch (signInError) {
          setError(signInError.message || 'Google sign-in failed. Please try again.')
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    window.google.accounts.id.renderButton(target, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      shape: 'rectangular',
      width: Math.min(Math.max(target.clientWidth, 240), 400),
      logo_alignment: 'left',
    })
    return () => { active = false }
  }, [clientId, completeGoogleSignIn, configured, onSuccess, scriptReady, text])

  if (!configured) {
    return <p className="form-message form-error" role="alert">Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to frontend/.env.local and restart Vite.</p>
  }

  return (
    <div className="google-signin-wrap">
      {!scriptReady && !error && <p className="google-button-loading" role="status">Loading Google sign-in…</p>}
      <div ref={buttonRef} className="google-signin-button" />
      <p className="form-live" aria-live="polite">{error && <span className="form-message form-error">{error}</span>}</p>
    </div>
  )
}
