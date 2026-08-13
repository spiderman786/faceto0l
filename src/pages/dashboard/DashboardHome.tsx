import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TOOLS, TOOL_CATEGORIES, badgeClass } from '../../config/tools'
import { useAuth } from '../../lib/auth'
import { openFacebookFromExtension, useExtensionStatus } from '../../lib/extension'

export function DashboardHome() {
  const { user } = useAuth()
  const { installed, facebookConnected, connected } = useExtensionStatus()
  const [filter, setFilter] = useState<string>('All Tools')

  const filters = useMemo(() => ['All Tools', ...TOOL_CATEGORIES], [])

  const visible = useMemo(() => {
    if (filter === 'All Tools') return TOOLS
    return TOOLS.filter((t) => t.category === filter)
  }, [filter])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof TOOLS>()
    for (const tool of visible) {
      const list = map.get(tool.category) || []
      list.push(tool)
      map.set(tool.category, list)
    }
    return [...map.entries()]
  }, [visible])

  const setupStep = !installed ? 1 : !facebookConnected ? 2 : 3

  return (
    <div className="relative mx-auto max-w-6xl pb-10">
      {/* FaceBot-style floating setup card */}
      {!connected && (
        <div className="mb-5 rounded-2xl border border-slate-800 bg-[#111827] p-4 text-white shadow-xl md:absolute md:right-0 md:top-0 md:mb-0 md:w-80 md:z-10">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {setupStep}/2 Finish setup to run tools
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                  installed ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-200'
                }`}
              >
                {installed ? '✓' : '1'}
              </span>
              <div>
                <div className="font-medium">Install the extension</div>
                {!installed && (
                  <div className="mt-1 flex flex-wrap gap-3 text-xs">
                    <Link to="/install" className="font-semibold text-sky-300 underline">
                      Download from website
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                  facebookConnected ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-200'
                }`}
              >
                {facebookConnected ? '✓' : '2'}
              </span>
              <div className="flex-1">
                <div className="font-medium">Log into your Facebook</div>
                <p className="mt-1 text-xs text-slate-400">
                  Same Chrome browser — Faceto0l detects it automatically.
                </p>
                {!facebookConnected && (
                  <button
                    type="button"
                    onClick={openFacebookFromExtension}
                    className="mt-2 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold"
                  >
                    Open Facebook
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={!connected ? 'md:pr-[22rem]' : ''}>
        <h1 className="brand-font text-3xl font-bold tracking-tight md:text-4xl">Welcome back</h1>
        <p className="mt-2 text-[var(--muted)]">
          {TOOLS.length} tools ready to use. Pick one to get started.
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Signed in as {user?.name || user?.email} · Plan {user?.plan}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        We don&apos;t store cookies or session data. Prefer a dedicated Chrome profile. Grab → thumbs →
        Interval / Daily Window is ready on all four tools.
      </div>

      {/* Activity strip like FaceBot */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="brand-font text-lg font-semibold">Your Activity</h2>
          <span className="text-xs text-[var(--muted)]">Local preview</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Items this month', value: '0', hint: '0 tools used' },
            { label: 'Time saved', value: '0h', hint: 'After first schedules' },
            { label: 'Queued posts', value: '0', hint: 'Thumbnail queue empty' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {card.label}
              </div>
              <div className="brand-font mt-2 text-3xl font-bold tracking-tight">{card.value}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{card.hint}</div>
              <div className="mt-3 h-10 rounded-lg bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50" />
            </div>
          ))}
        </div>
      </section>

      {/* Category pills */}
      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((name) => {
          const active = filter === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => setFilter(name)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-[var(--brand)] text-white shadow-sm shadow-blue-500/25'
                  : 'border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--brand)]'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>

      {/* Tool grids by category */}
      <div className="mt-6 space-y-8">
        {grouped.map(([category, tools]) => (
          <section key={category}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="brand-font text-xl font-semibold">{category}</h2>
              <span className="text-xs text-[var(--muted)]">{tools.length} tools</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tools.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
                >
                  <span
                    className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass(tool.badge)}`}
                  >
                    {tool.badge}
                  </span>
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white"
                    style={{ background: tool.accent }}
                  >
                    {tool.icon}
                  </div>
                  <h3 className="brand-font mt-4 pr-14 text-lg font-semibold leading-snug">
                    {tool.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.description}</p>
                  <div className="mt-4 text-sm font-semibold text-[var(--brand)] group-hover:underline">
                    Open Tool →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
