import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { TOOLS, TOOL_CATEGORIES } from '../config/tools'
import { useAuth } from '../lib/auth'
import { openFacebookFromExtension, useExtensionStatus } from '../lib/extension'

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { installed, facebookConnected, connected, status, refresh } = useExtensionStatus()
  const [query, setQuery] = useState('')
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOOL_CATEGORIES.map((c) => [c, true])),
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TOOLS
    return TOOLS.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    )
  }, [query])

  async function onLogout() {
    await logout()
    navigate('/login')
  }

  const statusLabel = !installed
    ? 'Extension not installed'
    : connected
      ? 'Facebook Connected'
      : 'Facebook Disconnected'

  const statusClass = connected
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-amber-50 text-amber-700'

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)] md:flex">
      <aside className="flex w-full flex-col border-b border-[var(--line)] bg-white md:h-screen md:w-72 md:border-b-0 md:border-r md:sticky md:top-0">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">
            F0
          </div>
          <div>
            <Link to="/dashboard" className="brand-font text-lg font-bold tracking-tight">
              Faceto0l
            </Link>
            <div className="text-[11px] text-[var(--muted)]">Toolkit dashboard</div>
          </div>
        </div>

        {!installed && (
          <div className="border-b border-blue-100 bg-blue-50 px-3 py-3 text-xs text-blue-900">
            Extension not installed.{' '}
            <Link className="font-semibold underline" to="/install">
              Download from website
            </Link>
          </div>
        )}

        <div className="border-b border-[var(--line)] px-3 py-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none ring-[var(--brand)] focus:ring-2"
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `mb-2 block rounded-xl px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-blue-50 text-[var(--brand)]' : 'text-[var(--ink)] hover:bg-[var(--surface)]'
              }`
            }
          >
            Dashboard
          </NavLink>

          {TOOL_CATEGORIES.map((cat) => {
            const items = filtered.filter((t) => t.category === cat)
            if (!items.length) return null
            const open = openCats[cat]
            return (
              <div key={cat} className="mb-2">
                <button
                  type="button"
                  onClick={() => setOpenCats((s) => ({ ...s, [cat]: !s[cat] }))}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] hover:bg-[var(--surface)]"
                >
                  <span>
                    {cat} <span className="text-[10px] opacity-70">{items.length}</span>
                  </span>
                  <span>{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="mt-1 space-y-1">
                    {items.map((tool) => (
                      <NavLink
                        key={tool.id}
                        to={tool.path}
                        className={({ isActive }) =>
                          `block rounded-xl px-3 py-2 text-sm ${
                            isActive
                              ? 'bg-blue-50 font-medium text-[var(--brand)]'
                              : 'text-[var(--ink)] hover:bg-[var(--surface)]'
                          }`
                        }
                      >
                        {tool.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-[var(--line)] p-3 text-sm">
          <div className="truncate font-medium">{user?.name || user?.email}</div>
          <div className="mt-0.5 text-xs capitalize text-[var(--muted)]">Plan: {user?.plan}</div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--brand)]"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-950 md:px-6">
          We have a strict policy of <strong>not saving</strong> cookies/session data on our servers. Prefer a fresh
          dedicated Chrome profile and secondary Facebook IDs for testing.
        </div>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-white/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-1.5">
              {[
                { label: 'FB', on: facebookConnected },
                { label: 'IG', on: false },
                { label: 'YT', on: false },
              ].map((p) => (
                <span
                  key={p.label}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {p.label}
                </span>
              ))}
            </div>
            <span>
              Status:{' '}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                {statusLabel}
              </span>
            </span>
            {status.version && <span className="text-xs text-[var(--muted)]">ext v{status.version}</span>}
            {facebookConnected && status.facebook?.userId && (
              <span className="hidden text-xs sm:inline">uid {status.facebook.userId}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)]"
            >
              Reload
            </button>
            {!facebookConnected && (
              <button
                type="button"
                onClick={openFacebookFromExtension}
                className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)]"
              >
                Open Facebook
              </button>
            )}
            <Link
              to="/install"
              className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Download extension
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
