import { useEffect, useMemo, useRef, useState } from 'react'
import {
  grabSource,
  preparePost,
  useExtensionStatus,
  type GrabItem,
  type SourcePlatform,
} from '../lib/extension'
import { usePages } from '../lib/pages'
import {
  DEFAULT_SCHEDULE,
  DELAY_PRESETS,
  loadHistory,
  parseManualLinks,
  previewScheduleTimes,
  resolveDelaySeconds,
  saveHistory,
  type HistoryEntry,
  type ScheduleConfig,
} from '../lib/schedule'

type Props = {
  toolId: string
  platform: SourcePlatform | 'bulk'
  title: string
  grabLabel: string
}

type QueueItem = GrabItem & { selected: boolean }
type ActivityLine = { at: string; text: string }

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How does Grab work?',
    a: 'Open a TikTok / Instagram / YouTube profile in another tab, then click Grab. The extension scrolls that tab, collects posts, and drops them here with thumbnail previews. You can Stop anytime.',
  },
  {
    q: 'What scheduling options are available?',
    a: 'Interval — every X minutes/hours/days. Daily Window — N posts per day starting at a time with a gap between posts. Preview times show before you start.',
  },
  {
    q: 'Can I keep the original caption?',
    a: 'Yes. Toggle “Keep original caption” on. When off, only the source link is used as caption text.',
  },
  {
    q: 'Where is Posted History stored?',
    a: 'In this browser only (localStorage). We do not store your Facebook session or post history on our servers.',
  },
]

export function SchedulerTool({ toolId, platform, title, grabLabel }: Props) {
  const { connected, installed } = useExtensionStatus()
  const { selectedIds, pages } = usePages()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [paste, setPaste] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [grabbing, setGrabbing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cfg, setCfg] = useState<ScheduleConfig>(DEFAULT_SCHEDULE)
  const [running, setRunning] = useState(false)
  const [faqOpen, setFaqOpen] = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityLine[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory(toolId))
  const runRef = useRef(false)
  const grabAbortRef = useRef(false)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    setHistory(loadHistory(toolId))
  }, [toolId])

  const selectedQueue = useMemo(() => queue.filter((q) => q.selected), [queue])
  const previewCfg = useMemo(
    () => ({ ...cfg, delaySeconds: cfg.delaySeconds < 0 ? 45 : cfg.delaySeconds }),
    [cfg],
  )
  const previewTimes = useMemo(
    () => previewScheduleTimes(previewCfg, selectedQueue.length),
    [previewCfg, selectedQueue.length],
  )

  const canGrab = installed && connected && platform !== 'bulk' && !running

  function log(text: string) {
    setActivity((prev) => [{ at: new Date().toLocaleTimeString(), text }, ...prev].slice(0, 40))
  }

  function mergeItems(items: GrabItem[]) {
    setQueue((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]))
      for (const item of items) {
        if (!map.has(item.id)) map.set(item.id, { ...item, selected: true })
      }
      return [...map.values()]
    })
  }

  async function onGrab() {
    if (platform === 'bulk') {
      setError('Bulk Scheduler uses Paste links — or grab from TikTok / Instagram / YouTube tools.')
      return
    }
    if (!connected) {
      setError('Extension Not Connected — install Faceto0l and log into Facebook first.')
      return
    }
    setError(null)
    setInfo(null)
    setGrabbing(true)
    grabAbortRef.current = false
    log(`Grab started (${platform})…`)
    try {
      const res = await grabSource(platform, { maxItems: 40, scrollRounds: 10 })
      if (grabAbortRef.current) {
        setInfo('Grab stopped.')
        log('Grab stopped by user')
        return
      }
      if (!res.ok && !res.items?.length) {
        setError(res.error || 'Grab failed')
        log(res.error || 'Grab failed')
        return
      }
      mergeItems(res.items || [])
      const msg = `Grabbed ${res.items?.length || 0} item(s)${res.profile ? ` from ${res.profile}` : ''}.`
      setInfo(msg)
      log(msg)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      log(msg)
    } finally {
      setGrabbing(false)
    }
  }

  function stopGrab() {
    grabAbortRef.current = true
    setGrabbing(false)
    setInfo('Stopping grab…')
  }

  function onPasteAdd() {
    const source = platform === 'bulk' ? 'bulk' : platform
    const items = parseManualLinks(paste, source).map((x) => ({
      ...x,
      thumb:
        x.platform === 'youtube' && x.id.startsWith('yt_')
          ? `https://i.ytimg.com/vi/${x.id.slice(3)}/hqdefault.jpg`
          : null,
      caption: '',
    }))
    if (!items.length) {
      setError('Paste at least one https:// link')
      return
    }
    mergeItems(items)
    setPaste('')
    setInfo(`Added ${items.length} link(s).`)
    setError(null)
    log(`Added ${items.length} pasted link(s)`)
  }

  function stopRun() {
    runRef.current = false
    setRunning(false)
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
    log('Schedule stopped')
  }

  function appendHistory(entry: HistoryEntry) {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 200)
      saveHistory(toolId, next)
      return next
    })
  }

  async function startRun() {
    if (!selectedQueue.length) {
      setError('Select at least one item in the queue')
      return
    }
    if (!selectedIds.length) {
      setError('Select at least one Facebook page above')
      return
    }
    if (!connected) {
      setError('Extension Not Connected — Facebook must be connected')
      return
    }

    stopRun()
    runRef.current = true
    setRunning(true)
    setError(null)
    const runCfg = { ...cfg, delaySeconds: resolveDelaySeconds(cfg) }
    setInfo(`Schedule started — ${selectedQueue.length} item(s). Keep this tab open.`)
    log(`Schedule started · ${cfg.mode} · ${selectedQueue.length} items`)

    const times = previewScheduleTimes(runCfg, selectedQueue.length)
    const pageCycle = [...selectedIds]

    selectedQueue.forEach((item, index) => {
      const when = times[index]
      const delay = Math.max(0, when.getTime() - Date.now())
      const pageId = pageCycle[index % pageCycle.length]
      const pageName = pages.find((p) => p.id === pageId)?.name

      const timer = window.setTimeout(async () => {
        if (!runRef.current) return
        try {
          const caption = cfg.keepOriginalCaption
            ? item.caption || item.url
            : item.url
          const res = await preparePost({
            pageId,
            itemUrl: item.url,
            caption,
          })
          const status = res.uploaded || res.posted ? 'done' : res.ok ? 'opened' : 'failed'
          appendHistory({
            id: `${Date.now()}_${item.id}`,
            itemId: item.id,
            url: item.url,
            thumb: item.thumb,
            caption: item.caption,
            pageId,
            pageName,
            scheduledAt: when.toISOString(),
            status,
            note: res.note || res.error,
            toolId,
          })
          const line = res.ok
            ? `${res.note || 'Posted'} (${index + 1}/${selectedQueue.length}) → ${pageName || pageId}`
            : res.error || 'Post failed'
          setInfo(line)
          log(line)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          appendHistory({
            id: `${Date.now()}_${item.id}`,
            itemId: item.id,
            url: item.url,
            thumb: item.thumb,
            pageId,
            pageName,
            scheduledAt: when.toISOString(),
            status: 'failed',
            note: msg,
            toolId,
          })
          log(msg)
        }

        if (index === selectedQueue.length - 1) {
          runRef.current = false
          setRunning(false)
          setInfo('Schedule finished.')
          log('Schedule finished')
        }
      }, delay)

      timersRef.current.push(timer)
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          100% remaining
        </span>
        <span className="text-xs text-[var(--muted)]">
          Posted History · this browser only · {history.length} entries
        </span>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="brand-font text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Open a source profile tab → <strong>{grabLabel}</strong> → items auto-land with thumbs →
              select → schedule.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {platform !== 'bulk' && !grabbing && (
              <button
                type="button"
                disabled={!canGrab}
                onClick={onGrab}
                title={!connected ? 'Extension Not Connected' : undefined}
                className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                {grabLabel}
              </button>
            )}
            {grabbing && (
              <button
                type="button"
                onClick={stopGrab}
                className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Stop grab
              </button>
            )}
            <button
              type="button"
              disabled={!queue.length}
              onClick={() => setQueue((q) => q.map((i) => ({ ...i, selected: true })))}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
            >
              Select all
            </button>
            <button
              type="button"
              disabled={!queue.length}
              onClick={() => setQueue([])}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold"
            >
              Clear
            </button>
          </div>
        </div>

        {!connected && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <strong>Extension Not Connected</strong> — Grab is disabled until the Faceto0l extension is
            installed and Facebook is logged in this Chrome.
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          className="mt-4 text-sm font-semibold text-[var(--brand)] underline"
        >
          {showPaste ? 'Hide paste links' : 'Paste links manually'}
        </button>
        {showPaste && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={2}
              placeholder="https://… one or more links"
              className="min-h-[64px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none ring-[var(--brand)] focus:ring-2"
            />
            <button
              type="button"
              onClick={onPasteAdd}
              className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:border-[var(--brand)]"
            >
              Add links
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </div>
        )}
        {info && !error && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {info}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queue.length === 0 ? (
            <div className="col-span-full grid place-items-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-14 text-center">
              <p className="text-sm text-[var(--muted)]">
                Queue empty — open a profile tab and {grabLabel.toLowerCase()}, or paste links
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <label
                key={item.id}
                className={`cursor-pointer overflow-hidden rounded-2xl border ${
                  item.selected ? 'border-[var(--brand)] ring-2 ring-blue-100' : 'border-[var(--line)]'
                } bg-white`}
              >
                <div className="aspect-[9/14] bg-slate-100">
                  {item.thumb ? (
                    <img
                      src={item.thumb}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.parentElement?.querySelector('[data-thumb-fallback]')
                        if (fallback) fallback.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div
                    data-thumb-fallback
                    className={`grid h-full place-items-center text-xs text-slate-400 ${item.thumb ? 'hidden' : ''}`}
                  >
                    No thumb
                  </div>
                </div>
                <div className="space-y-1 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        setQueue((prev) =>
                          prev.map((q) =>
                            q.id === item.id ? { ...q, selected: e.target.checked } : q,
                          ),
                        )
                      }
                    />
                    <span className="truncate text-xs font-semibold text-[var(--ink)]">
                      {item.caption || item.id}
                    </span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[11px] text-[var(--brand)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.url}
                  </a>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="brand-font text-xl font-semibold">Schedule</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Interval or Daily Window. Browser must stay open while the run is active.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['interval', 'daily'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCfg((c) => ({ ...c, mode }))}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                cfg.mode === mode
                  ? 'bg-[var(--brand)] text-white'
                  : 'border border-[var(--line)] text-[var(--ink)]'
              }`}
            >
              {mode === 'interval' ? 'Interval' : 'Daily Window'}
            </button>
          ))}
        </div>

        {cfg.mode === 'interval' ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Every</span>
              <input
                type="number"
                min={1}
                value={cfg.intervalValue}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, intervalValue: Math.max(1, Number(e.target.value) || 1) }))
                }
                className="w-24 rounded-xl border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Unit</span>
              <select
                value={cfg.intervalUnit}
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    intervalUnit: e.target.value as ScheduleConfig['intervalUnit'],
                  }))
                }
                className="rounded-xl border border-[var(--line)] px-3 py-2"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Posts / day</span>
              <input
                type="number"
                min={1}
                value={cfg.dailyPosts}
                onChange={(e) =>
                  setCfg((c) => ({ ...c, dailyPosts: Math.max(1, Number(e.target.value) || 1) }))
                }
                className="w-24 rounded-xl border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Start</span>
              <input
                type="time"
                value={cfg.dailyStart}
                onChange={(e) => setCfg((c) => ({ ...c, dailyStart: e.target.value }))}
                className="rounded-xl border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-[var(--muted)]">Gap (min)</span>
              <input
                type="number"
                min={1}
                value={cfg.dailyGapMinutes}
                onChange={(e) =>
                  setCfg((c) => ({
                    ...c,
                    dailyGapMinutes: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="w-24 rounded-xl border border-[var(--line)] px-3 py-2"
              />
            </label>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-[var(--muted)]">Delay before first post</div>
          <div className="flex flex-wrap gap-2">
            {DELAY_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setCfg((c) => ({ ...c, delaySeconds: p.value }))}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  cfg.delaySeconds === p.value
                    ? 'bg-[var(--brand)] text-white'
                    : 'border border-[var(--line)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cfg.keepOriginalCaption}
            onChange={(e) => setCfg((c) => ({ ...c, keepOriginalCaption: e.target.checked }))}
            className="accent-[var(--brand)]"
          />
          Keep original caption
        </label>

        {previewTimes.length > 0 && (
          <div className="mt-4 rounded-xl bg-[var(--surface)] px-3 py-3 text-xs text-[var(--muted)]">
            <div className="font-semibold text-[var(--ink)]">Preview publish times</div>
            <ul className="mt-2 space-y-1">
              {previewTimes.slice(0, 8).map((t, i) => (
                <li key={`${t.toISOString()}-${i}`}>
                  #{i + 1} · {t.toLocaleString()} · page{' '}
                  {pages.find((p) => p.id === selectedIds[i % Math.max(selectedIds.length, 1)])
                    ?.name ||
                    selectedIds[i % Math.max(selectedIds.length, 1)] ||
                    '—'}
                </li>
              ))}
              {previewTimes.length > 8 && <li>…and {previewTimes.length - 8} more</li>}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!running ? (
            <button
              type="button"
              onClick={startRun}
              disabled={!connected || !selectedQueue.length || !selectedIds.length}
              className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              Start schedule
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRun}
              className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <h2 className="brand-font text-xl font-semibold">Activity</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Live log for this session</p>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No activity yet.</p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
              {activity.map((line, i) => (
                <li key={`${line.at}-${i}`} className="rounded-lg bg-[var(--surface)] px-3 py-2">
                  <span className="text-xs text-[var(--muted)]">{line.at}</span>
                  <div>{line.text}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
          <h2 className="brand-font text-xl font-semibold">Posted History</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Stored in this browser only.</p>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No history yet.</p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {history.slice(0, 20).map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                >
                  {h.thumb ? (
                    <img
                      src={h.thumb}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded bg-slate-100 text-[10px]">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{h.caption || h.url}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {h.status} · {new Date(h.scheduledAt).toLocaleString()} · {h.pageName || h.pageId}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="brand-font text-xl font-semibold">About this tool</h2>
        <div className="mt-3 space-y-2">
          {FAQ.map((item) => {
            const open = faqOpen === item.q
            return (
              <div key={item.q} className="rounded-xl border border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setFaqOpen(open ? null : item.q)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                >
                  {item.q}
                  <span className="text-[var(--muted)]">{open ? '−' : '+'}</span>
                </button>
                {open && <p className="border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">{item.a}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
