
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import './AuthPage.css'

function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      await register({ name, email, password })
      navigate('/', { replace: true })
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create your account.'
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
          <h1>Build something brilliant together.</h1>
          <p>
            Create your account and start organizing project
            knowledge in a shared AI-powered workspace.
          </p>
          <div className="auth-brand-tags">
            <span>Research</span>
            <span>Teamwork</span>
            <span>AI</span>
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
            <span className="auth-eyebrow">GET STARTED</span>
            <h2>Create your account</h2>
            <p>Join your collaborative AI workspace.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. John Smith"
              autoComplete="name"
              maxLength={100}
              required
            />

            <label htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label htmlFor="register-confirm">
              Confirm Password
            </label>
            <input
              id="register-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account →'}
            </Button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign In</Link>
          </p>

          <div className="auth-demo-note">
            Demo account only — do not use a real password.
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
