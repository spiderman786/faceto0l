import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
        Loading session…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
