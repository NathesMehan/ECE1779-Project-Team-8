
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import './AuthPage.css'

function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const destination =
    (location.state as { from?: string } | null)?.from || '/'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError('')
    setLoading(true)

    try {
      await login({ email, password })
      navigate(destination, { replace: true })
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to sign in.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="auth-layout">
      <div className="auth-brand-panel">
        <div className="auth-brand">
          <span className="auth-brand-symbol">✦</span>
          <div>
            <strong>Context</strong>
            <small>WORKSPACE</small>
          </div>
        </div>

        <div className="auth-brand-content">
          <div className="auth-large-icon">✦</div>
          <h1>Your knowledge. One workspace.</h1>
          <p>
            Bring your documents, teammates, and AI-powered
            insights together in one collaborative space.
          </p>
          <div className="auth-brand-tags">
            <span>Organize</span>
            <span>Collaborate</span>
            <span>Explore</span>
          </div>
        </div>

        <div className="auth-brand-footer">
          LLM Context Workspace · ECE1779
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">✦ Context Workspace</div>

          <div className="auth-heading">
            <span className="auth-eyebrow">WELCOME BACK</span>
            <h2>Sign in to your workspace</h2>
            <p>Enter your account details to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In →'}
            </Button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register">Create an account</Link>
          </p>

          <div className="auth-demo-note">
            Demo authentication — use test credentials only.
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
