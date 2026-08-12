import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Health = {
  ok: boolean
  service: string
  foundation: string
  time: string
}

export function LandingPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as Health
      })
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setHealthError(err instanceof Error ? err.message : 'API unreachable')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white shadow-lg shadow-blue-500/30">
            F0
          </div>
          <div>
            <div className="brand-font text-xl font-bold tracking-tight text-[var(--ink)]">Faceto0l</div>
            <div className="text-xs text-[var(--muted)]">Facebook automation toolkit</div>
          </div>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-[var(--ink)] transition hover:border-[var(--brand)]"
            to="/login"
          >
            Log in
          </Link>
          <Link
            className="rounded-full bg-[var(--brand)] px-4 py-2 font-medium text-white shadow-md shadow-blue-500/25 transition hover:bg-[var(--brand-dark)]"
            to="/register"
          >
            Start free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white/70 px-6 py-14 shadow-sm backdrop-blur md:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,109,255,0.08),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(11,79,208,0.06),transparent_35%)]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-[var(--brand)]">
              Foundation C · Extension bridge
            </p>
            <h1 className="brand-font text-4xl font-extrabold leading-tight tracking-tight text-[var(--ink)] md:text-6xl">
              Automate, grow &amp; schedule Facebook —{' '}
              <span className="bg-gradient-to-r from-[var(--brand)] to-[#3aa0ff] bg-clip-text text-transparent">
                Faceto0l
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
              Browser extension + toolkit dashboard. Create an account, open the dashboard, and use TikTok / Instagram /
              YouTube → Facebook schedulers as we unlock each foundation.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[var(--brand-dark)]"
                to="/register"
              >
                Create free account
              </Link>
              <a
                className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
                href="/extension/faceto0l-extension.zip"
                download
              >
                Download extension
              </a>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Unzip → chrome://extensions → Developer mode → Load unpacked.{' '}
              <a className="underline" href="/extension/README.txt">
                Install steps
              </a>
            </p>

            <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
              {[
                ['Install extension', 'Download ZIP → Load unpacked in Chrome'],
                ['Connect Facebook', 'Same-browser session detect'],
                ['Start scheduling', 'Grab → thumbnails → bulk schedule'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-[var(--line)] bg-white/90 p-4">
                  <div className="brand-font text-sm font-semibold text-[var(--ink)]">{title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="brand-font text-lg font-semibold">API health check</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Should show foundation C.</p>
          {health ? (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0b1220] p-4 text-xs text-emerald-300">
              {JSON.stringify(health, null, 2)}
            </pre>
          ) : (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0b1220] p-4 text-xs text-amber-300">
              {healthError ? `Error: ${healthError}` : 'Checking API…'}
            </pre>
          )}
        </section>
      </main>
    </div>
  )
}
