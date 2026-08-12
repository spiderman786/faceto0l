import { useEffect, useState } from 'react'

export type ExtensionStatus = {
  ok: boolean
  extension: boolean
  version?: string
  facebook?: {
    connected: boolean
    userId: string | null
    error?: string
  }
  pagesCached?: number
  pagesCachedAt?: number | null
  checkedAt?: string
  error?: string
}

export type FbPage = {
  id: string
  name: string
}

const SOURCE_EXT = 'faceto0l-extension'
const SOURCE_WEB = 'faceto0l-web'

const DISCONNECTED: ExtensionStatus = {
  ok: false,
  extension: false,
}

function postToExtension(payload: Record<string, unknown>) {
  window.postMessage({ source: SOURCE_WEB, ...payload }, '*')
}

export function requestExtensionStatus() {
  postToExtension({ type: 'REQUEST_STATUS' })
}

export function openFacebookFromExtension() {
  postToExtension({ type: 'OPEN_FACEBOOK' })
}

export function requestListPages(force = true) {
  postToExtension({ type: 'LIST_PAGES', force })
}

export function openPageComposer(pageId: string) {
  postToExtension({ type: 'OPEN_PAGE_COMPOSER', pageId })
}

export function openBusinessSuite(pageId?: string) {
  postToExtension({ type: 'OPEN_BUSINESS_SUITE', pageId })
}

export function useExtensionStatus(pollMs = 4000) {
  const [status, setStatus] = useState<ExtensionStatus>(DISCONNECTED)
  const [heardFromExtension, setHeardFromExtension] = useState(false)

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.source !== SOURCE_EXT) return

      if (data.type === 'READY' || data.type === 'STATUS') {
        setHeardFromExtension(true)
        setStatus({
          ok: Boolean(data.ok ?? true),
          extension: true,
          version: data.version,
          facebook: data.facebook,
          pagesCached: data.pagesCached,
          pagesCachedAt: data.pagesCachedAt,
          checkedAt: data.checkedAt,
          error: data.error,
        })
      }
    }

    window.addEventListener('message', onMessage)
    requestExtensionStatus()
    const id = window.setInterval(requestExtensionStatus, pollMs)
    return () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(id)
    }
  }, [pollMs])

  const installed = heardFromExtension && status.extension
  const facebookConnected = Boolean(status.facebook?.connected)

  return {
    status,
    installed,
    facebookConnected,
    connected: installed && facebookConnected,
    refresh: requestExtensionStatus,
  }
}
