import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { listPagesFromExtension, useExtensionStatus, type FbPage } from './extension'

type PagesContextValue = {
  pages: FbPage[]
  selectedIds: string[]
  selectedPages: FbPage[]
  loading: boolean
  error: string | null
  warning: string | null
  source: string | null
  refreshPages: (force?: boolean) => void
  addManualPage: (id: string, name?: string) => void
  togglePage: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
}

const PagesContext = createContext<PagesContextValue | null>(null)
const MANUAL_KEY = 'faceto0l_manual_pages'

function loadManual(): FbPage[] {
  try {
    const raw = localStorage.getItem(MANUAL_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveManual(pages: FbPage[]) {
  localStorage.setItem(MANUAL_KEY, JSON.stringify(pages.slice(0, 50)))
}

function mergePages(a: FbPage[], b: FbPage[]) {
  const map = new Map<string, FbPage>()
  for (const p of [...a, ...b]) {
    if (!p?.id) continue
    map.set(p.id, { id: p.id, name: p.name || `Page ${p.id}` })
  }
  return [...map.values()]
}

export function PagesProvider({ children }: { children: ReactNode }) {
  const { connected, installed } = useExtensionStatus()
  const [pages, setPages] = useState<FbPage[]>(() => loadManual())
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const reqRef = useRef(0)

  const refreshPages = useCallback(
    async (force = true) => {
      if (!installed) {
        setError('Extension not installed')
        setLoading(false)
        return
      }
      const req = ++reqRef.current
      setLoading(true)
      setError(null)
      setWarning(null)
      try {
        const res = await listPagesFromExtension(force)
        if (req !== reqRef.current) return
        if (!res.ok) {
          setError(res.error || 'Failed to list pages')
          setPages(loadManual())
          return
        }
        const next = mergePages(loadManual(), Array.isArray(res.pages) ? res.pages : [])
        setPages(next)
        setWarning(res.warning || (next.length ? null : 'No pages found yet — add a Page ID manually.'))
        setSource(res.source || null)
        setSelectedIds((prev) => prev.filter((id) => next.some((p) => p.id === id)))
        setError(null)
      } catch (err) {
        if (req !== reqRef.current) return
        setError(err instanceof Error ? err.message : String(err))
        setPages(loadManual())
      } finally {
        if (req === reqRef.current) setLoading(false)
      }
    },
    [installed],
  )

  useEffect(() => {
    if (connected) void refreshPages(true)
  }, [connected, refreshPages])

  const addManualPage = useCallback((id: string, name?: string) => {
    const clean = id.replace(/\D/g, '')
    if (clean.length < 5) {
      setError('Enter a valid numeric Facebook Page ID')
      return
    }
    const page = { id: clean, name: (name || '').trim() || `Page ${clean}` }
    const manual = mergePages(loadManual(), [page])
    saveManual(manual)
    setPages((prev) => mergePages(prev, [page]))
    setSelectedIds((prev) => (prev.includes(clean) ? prev : [...prev, clean]))
    setError(null)
    setWarning(null)
  }, [])

  const value = useMemo<PagesContextValue>(
    () => ({
      pages,
      selectedIds,
      selectedPages: pages.filter((p) => selectedIds.includes(p.id)),
      loading,
      error,
      warning,
      source,
      refreshPages: (force = true) => {
        void refreshPages(force)
      },
      addManualPage,
      togglePage: (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      },
      selectAll: () => setSelectedIds(pages.map((p) => p.id)),
      clearSelection: () => setSelectedIds([]),
    }),
    [pages, selectedIds, loading, error, warning, source, refreshPages, addManualPage],
  )

  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>
}

export function usePages() {
  const ctx = useContext(PagesContext)
  if (!ctx) throw new Error('usePages must be used within PagesProvider')
  return ctx
}
