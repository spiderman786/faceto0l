import { useState } from 'react'
import {
  openBusinessSuite,
  openPageComposer,
  useExtensionStatus,
} from '../lib/extension'
import { usePages } from '../lib/pages'

export function PagePicker() {
  const { installed, facebookConnected, connected } = useExtensionStatus()
  const {
    pages,
    selectedIds,
    loading,
    error,
    warning,
    source,
    refreshPages,
    addManualPage,
    togglePage,
    selectAll,
    clearSelection,
  } = usePages()
  const [manualId, setManualId] = useState('')
  const [manualName, setManualName] = useState('')

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="brand-font text-lg font-semibold">Select which pages</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Loaded from your Facebook session — nothing stored on our servers
            {source ? ` · ${source}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refreshPages(true)}
            disabled={!installed || loading}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)] disabled:opacity-50"
          >
            {loading ? 'Scanning…' : 'Refresh pages'}
          </button>
          <button
            type="button"
            onClick={selectAll}
            disabled={!pages.length}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={!selectedIds.length}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {!connected && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {!installed
            ? 'Install the extension first.'
            : !facebookConnected
              ? 'Log into Facebook in this Chrome, then refresh pages.'
              : 'Connect Facebook to load pages.'}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {warning && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warning}
        </div>
      )}

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {loading && !pages.length ? (
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            Scanning Facebook for pages… (opens a pages tab briefly — wait up to ~30s)
          </div>
        ) : pages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No pages yet. Click <strong>Refresh pages</strong>, or add a Page ID manually below.
          </div>
        ) : (
          pages.map((page) => {
            const checked = selectedIds.includes(page.id)
            return (
              <label
                key={page.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  checked
                    ? 'border-[var(--brand)] bg-blue-50'
                    : 'border-[var(--line)] hover:border-[var(--brand)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePage(page.id)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{page.name}</div>
                  <div className="truncate text-xs text-[var(--muted)]">ID {page.id}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    openPageComposer(page.id)
                  }}
                  className="rounded-lg border border-[var(--line)] px-2 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
                >
                  Open
                </button>
              </label>
            )
          })
        )}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Add page manually (always works)
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Page ID (numbers)"
            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
          <input
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Name (optional)"
            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              addManualPage(manualId, manualName)
              setManualId('')
              setManualName('')
            }}
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          Tip: open your page → About / Page transparency, or look at the URL{' '}
          <code>profile.php?id=XXXXXXXX</code>.
        </p>
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
          <span className="text-xs text-[var(--muted)]">{selectedIds.length} selected</span>
          <button
            type="button"
            onClick={() => openPageComposer(selectedIds[0])}
            className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Open page
          </button>
          <button
            type="button"
            onClick={() => openBusinessSuite(selectedIds[0])}
            className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
          >
            Business Suite
          </button>
        </div>
      )}
    </div>
  )
}
