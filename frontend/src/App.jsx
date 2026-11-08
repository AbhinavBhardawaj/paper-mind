import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './styles.css'
import Dashboard from './pages/Dashboard'
import LandingPage, { SAMPLE_QUERY } from './pages/LandingPage'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage } from './pages/AuthPages'
import ProtectedRoute from './auth/ProtectedRoute'
import { AuthProvider, useAuth } from './auth/AuthContext'
import sampleResult from './assets/sample-result.json'

function DemoPage() {
  return <Dashboard demo sampleResult={sampleResult} sampleQuery={SAMPLE_QUERY} />
}

function NotFoundPage() {
  return (
    <main className="not-found-page">
      <p className="section-kicker">Page not found</p>
      <h1>We could not find that page.</h1>
      <p>Return home to explore research trends.</p>
      <Link className="site-button secondary-button" to="/">Go home</Link>
    </main>
  )
}

function AppRoutes() {
  const { signOut, user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/app" element={<ProtectedRoute><Dashboard user={user} onSignOut={signOut} /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}

export default App
