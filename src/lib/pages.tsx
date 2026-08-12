import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { requestListPages, useExtensionStatus, type FbPage } from '../lib/extension'

type PagesContextValue = {
  pages: FbPage[]
  selectedIds: string[]
  selectedPages: FbPage[]
  loading: boolean
  error: string | null
  warning: string | null
  source: string | null
  refreshPages: (force?: boolean) => void
  togglePage: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
}

const PagesContext = createContext<PagesContextValue | null>(null)

const SOURCE_EXT = 'faceto0l-extension'

export function PagesProvider({ children }: { children: ReactNode }) {
  const { connected, installed } = useExtensionStatus()
  const [pages, setPages] = useState<FbPage[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.source !== SOURCE_EXT) return
      if (data.type !== 'LIST_PAGES_RESULT') return

      setLoading(false)
      if (!data.ok) {
        setError(data.error || 'Failed to list pages')
        setPages([])
        return
      }
      setError(null)
      setWarning(data.warning || null)
      setSource(data.source || null)
      const next = Array.isArray(data.pages) ? (data.pages as FbPage[]) : []
      setPages(next)
      setSelectedIds((prev) => prev.filter((id) => next.some((p) => p.id === id)))
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const refreshPages = useCallback(
    (force = true) => {
      if (!installed) {
        setError('Extension not installed')
        return
      }
      setLoading(true)
      setError(null)
      setWarning(null)
      requestListPages(force)
    },
    [installed],
  )

  useEffect(() => {
    if (connected) refreshPages(false)
  }, [connected, refreshPages])

  const value = useMemo<PagesContextValue>(
    () => ({
      pages,
      selectedIds,
      selectedPages: pages.filter((p) => selectedIds.includes(p.id)),
      loading,
      error,
      warning,
      source,
      refreshPages,
      togglePage: (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      },
      selectAll: () => setSelectedIds(pages.map((p) => p.id)),
      clearSelection: () => setSelectedIds([]),
    }),
    [pages, selectedIds, loading, error, warning, source, refreshPages],
  )

  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>
}

export function usePages() {
  const ctx = useContext(PagesContext)
  if (!ctx) throw new Error('usePages must be used within PagesProvider')
  return ctx
}
