import { useCallback } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import GoogleSignInButton from '../auth/GoogleSignInButton'

function nextPath(value) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/app'
}

function AuthLayout({ title, description, children, footer }) {
  return (
    <main className="auth-page">
      <Link className="site-wordmark auth-wordmark" to="/" aria-label="PaperMind home">PaperMind</Link>
      <section className="auth-panel" aria-labelledby="auth-title">
        <h1 id="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        <div className="auth-footer">{footer}</div>
      </section>
    </main>
  )
}

function GoogleAuthPage({ signup = false }) {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const next = nextPath(searchParams.get('next'))
  const finishSignIn = useCallback(() => navigate(next, { replace: true }), [navigate, next])

  if (user) return <Navigate to={next} replace />

  return (
    <AuthLayout
      title={signup ? 'Create your account' : 'Sign in'}
      description={signup ? 'Use your Google account to start your research workspace.' : 'Continue to your PaperMind research workspace.'}
      footer={<>By continuing, you agree to use PaperMind responsibly. <Link to="/">Back to home</Link></>}
    >
      {searchParams.get('reason') === 'expired' && <p className="form-message form-error" role="status">Your session expired. Sign in again.</p>}
      <GoogleSignInButton text={signup ? 'signup_with' : 'signin_with'} onSuccess={finishSignIn} />
      <p className="google-auth-note">PaperMind uses Google to verify your identity. Your Google password is never shared with PaperMind.</p>
    </AuthLayout>
  )
}

export function LoginPage() {
  return <GoogleAuthPage />
}

export function SignupPage() {
  return <GoogleAuthPage signup />
}

export function ForgotPasswordPage() {
  return (
    <AuthLayout title="Use your Google account" description="PaperMind sign-in is managed by Google. If you cannot access your account, recover it through Google, then return here." footer={<Link to="/login">Back to sign in</Link>}>
      <a className="site-button secondary-button google-recovery-link" href="https://accounts.google.com/signin/recovery" target="_blank" rel="noreferrer">Recover a Google account</a>
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  return <ForgotPasswordPage />
}
