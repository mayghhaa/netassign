import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from '../components/Feedback.jsx'
import useAuth from '../hooks/useAuth.js'

export default function Login() {
  const { status, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from
  const redirectTo = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/'

  if (status === 'authenticated') return <Navigate to={redirectTo} replace />
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/favicon.svg" alt="" className="h-12 w-12 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Sign in to NetAssign</h1>
            <p className="mt-1 text-sm text-slate-500">IP address management portal</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label htmlFor="login-email" className="label">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
