import { Link } from 'react-router-dom'
import { TOOLS } from '../config/tools'

export function LandingPage() {
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
          <Link className="hidden text-[var(--muted)] hover:text-[var(--ink)] sm:inline" to="/install">
            Extension
          </Link>
          <a className="hidden text-[var(--muted)] hover:text-[var(--ink)] md:inline" href="#tools">
            Tools
          </a>
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

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-950">
          <strong>Your security is our priority.</strong> We don&apos;t store cookies or session data on our
          servers — nothing leaves your browser. Just log into Facebook in the same Chrome; Faceto0l detects it.
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white px-6 py-14 shadow-sm md:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,109,255,0.1),transparent_42%),radial-gradient(circle_at_85%_10%,rgba(11,79,208,0.07),transparent_38%)]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h1 className="brand-font text-4xl font-extrabold leading-[1.1] tracking-tight text-[var(--ink)] md:text-6xl">
              Automate, grow &amp; schedule Facebook with{' '}
              <span className="text-[var(--brand)]">Faceto0l</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
              TikTok, Instagram &amp; YouTube → Facebook schedulers plus bulk controls. No developer API or
              separate Facebook password — your session stays in the browser via the Chrome extension.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[var(--brand-dark)]"
                to="/install"
              >
                Download extension
              </Link>
              <Link
                className="rounded-full border border-[var(--line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
                to="/register"
              >
                Start free today
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            ['4', 'Core schedulers'],
            ['0', 'Cookies stored on server'],
            ['1', 'Chrome extension bridge'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-[var(--line)] bg-white px-5 py-6 text-center">
              <div className="brand-font text-3xl font-bold text-[var(--brand)]">{value}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </section>

        <section id="tools" className="mt-14">
          <div className="text-center">
            <h2 className="brand-font text-3xl font-bold tracking-tight">Featured tools</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Hand-picked pipelines — Grab → thumbnails → Interval or Daily Window → post.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.id}
                to="/register"
                className="group rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white"
                    style={{ background: tool.accent }}
                  >
                    {tool.icon}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    {tool.badge}
                  </span>
                </div>
                <h3 className="brand-font mt-4 text-lg font-semibold">{tool.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.description}</p>
                <div className="mt-4 text-sm font-semibold text-[var(--brand)] group-hover:underline">
                  Open tool →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-[var(--line)] bg-white p-6 md:p-10">
          <h2 className="brand-font text-center text-3xl font-bold tracking-tight">Up and running in 2 minutes</h2>
          <p className="mt-2 text-center text-sm text-[var(--muted)]">Three steps. No technical skills required.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Install extension',
                body: 'Download the Faceto0l Chrome ZIP, unzip, then Load unpacked on chrome://extensions.',
                cta: (
                  <Link
                    to="/install"
                    className="mt-3 inline-block text-sm font-semibold text-[var(--brand)] underline"
                  >
                    Download extension (v0.3.2)
                  </Link>
                ),
              },
              {
                n: '02',
                title: 'Connect Facebook',
                body: 'Log into Facebook normally in the same browser. Faceto0l detects your session automatically.',
                cta: null,
              },
              {
                n: '03',
                title: 'Start automating',
                body: 'Open a TikTok / IG / YouTube profile, Grab videos, pick pages, schedule Interval or Daily Window.',
                cta: null,
              },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="text-xs font-bold tracking-[0.2em] text-[var(--brand)]">{step.n}</div>
                <h3 className="brand-font mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.body}</p>
                {step.cta}
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white"
            >
              Start free today
            </Link>
            <Link to="/install" className="text-sm font-semibold text-[var(--muted)] underline">
              Install steps
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
