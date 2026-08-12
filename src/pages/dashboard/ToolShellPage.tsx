import { Link, useParams } from 'react-router-dom'
import { PagePicker } from '../../components/PagePicker'
import { TOOLS } from '../../config/tools'
import { openFacebookFromExtension, useExtensionStatus } from '../../lib/extension'
import { usePages } from '../../lib/pages'

export function ToolShellPage() {
  const { toolId } = useParams()
  const tool = TOOLS.find((t) => t.id === toolId)
  const { installed, connected } = useExtensionStatus()
  const { selectedIds } = usePages()

  if (!tool) {
    return (
      <div>
        <h1 className="brand-font text-2xl font-bold">Tool not found</h1>
        <Link to="/dashboard" className="mt-3 inline-block text-[var(--brand)]">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">{tool.category}</div>
        <h1 className="brand-font mt-2 text-3xl font-bold tracking-tight">{tool.name}</h1>
        <p className="mt-2 text-[var(--muted)]">{tool.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {connected ? 'Facebook Connected' : installed ? 'Facebook Disconnected' : 'Extension required'}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Foundation D · Pages
          </span>
          {selectedIds.length > 0 && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {selectedIds.length} page(s) selected
            </span>
          )}
        </div>
      </div>

      {!connected && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {!installed ? (
            <>
              Install the extension first.{' '}
              <a className="font-semibold underline" href="/extension/README.txt">
                Guide
              </a>
            </>
          ) : (
            <>
              Log into Facebook in this Chrome, then load pages.{' '}
              <button type="button" onClick={openFacebookFromExtension} className="font-semibold underline">
                Open Facebook
              </button>
            </>
          )}
        </div>
      )}

      <PagePicker />

      <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="brand-font text-xl font-semibold">Thumbnail preview queue</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Grab → items land here with thumbs (Foundation E). For now, select pages above and use{' '}
          <strong>Open first page</strong> to smoke-test the session bridge.
        </p>
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-14 text-center">
          <p className="text-sm text-[var(--muted)]">Queue empty — grab ships next</p>
          <button
            type="button"
            disabled
            className="mt-4 rounded-full bg-slate-300 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Grab Videos (Foundation E)
          </button>
        </div>
      </div>
    </div>
  )
}
