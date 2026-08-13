import { Link } from 'react-router-dom'

const EXT_ZIP = '/extension/faceto0l-extension.zip'
const VERSION = '0.4.0'

export function InstallExtensionPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="brand-font text-xl font-bold text-[var(--brand)]">
          Faceto0l
        </Link>
        <Link to="/dashboard" className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
          Dashboard →
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-6 py-10 shadow-sm md:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Chrome extension</p>
          <h1 className="brand-font mt-3 text-4xl font-extrabold tracking-tight">Download Faceto0l</h1>
          <p className="mt-3 text-[var(--muted)]">
            Same flow as FaceBot-style tools: download from this website, Load unpacked in Chrome. Version{' '}
            <strong className="text-[var(--ink)]">v{VERSION}</strong>.
          </p>

          <a
            href={EXT_ZIP}
            download={`faceto0l-extension-v${VERSION}.zip`}
            className="mt-8 flex w-full items-center justify-center rounded-2xl bg-[var(--brand)] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[var(--brand-dark)]"
          >
            Download the extension (v{VERSION})
          </a>

          <ol className="mt-10 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
            <li className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
              <div className="text-xs font-bold text-[var(--brand)]">01</div>
              <div className="mt-1 font-semibold">Download &amp; unzip</div>
              <p className="mt-1 text-[var(--muted)]">
                Click the button above. Right-click the zip → Extract All. Open the folder until you see{' '}
                <code className="rounded bg-white px-1">manifest.json</code>.
              </p>
            </li>
            <li className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
              <div className="text-xs font-bold text-[var(--brand)]">02</div>
              <div className="mt-1 font-semibold">Load unpacked in Chrome</div>
              <p className="mt-1 text-[var(--muted)]">
                Open <code className="rounded bg-white px-1">chrome://extensions</code> → Developer mode ON →
                Load unpacked → select that folder (must show v{VERSION}).
              </p>
            </li>
            <li className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
              <div className="text-xs font-bold text-[var(--brand)]">03</div>
              <div className="mt-1 font-semibold">Open Faceto0l in the same Chrome</div>
              <p className="mt-1 text-[var(--muted)]">
                Go to the dashboard, log into Facebook in this browser, then use Grab → schedule.
              </p>
            </li>
          </ol>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Create free account
            </Link>
            <Link
              to="/dashboard"
              className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-semibold"
            >
              Open dashboard
            </Link>
          </div>

          <p className="mt-6 text-xs text-[var(--muted)]">
            Direct zip link:{' '}
            <a className="font-semibold text-[var(--brand)] underline" href={EXT_ZIP}>
              https://faceto0l.vercel.app{EXT_ZIP}
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
