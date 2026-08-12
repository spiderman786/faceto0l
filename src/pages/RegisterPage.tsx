import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function RegisterPage() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register(email, password, name || undefined)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-white p-8 shadow-sm"
      >
        <Link to="/" className="brand-font text-2xl font-bold text-[var(--brand)]">
          Faceto0l
        </Link>
        <h1 className="brand-font mt-4 text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Free plan to start. Tools unlock with each foundation.</p>

        <label className="mt-6 block text-sm font-medium">
          Name (optional)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none ring-[var(--brand)] focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none ring-[var(--brand)] focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none ring-[var(--brand)] focus:ring-2"
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-[var(--brand)] py-3 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          Already have an account?{' '}
          <Link className="font-medium text-[var(--brand)]" to="/login">
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
