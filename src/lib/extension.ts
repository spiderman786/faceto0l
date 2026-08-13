import { useEffect, useState } from 'react'

export type ExtensionStatus = {
  ok: boolean
  extension: boolean
  version?: string
  foundation?: string
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

export type GrabItem = {
  id: string
  url: string
  thumb?: string | null
  caption?: string
  platform?: string
}

export type SourcePlatform = 'tiktok' | 'instagram' | 'youtube'

const SOURCE_EXT = 'faceto0l-extension'
const SOURCE_WEB = 'faceto0l-web'

const DISCONNECTED: ExtensionStatus = {
  ok: false,
  extension: false,
}

function postToExtension(payload: Record<string, unknown>) {
  window.postMessage({ source: SOURCE_WEB, ...payload }, '*')
}

function waitForExtensionResult<T extends Record<string, unknown>>(
  resultType: string,
  timeoutMs = 45000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('Extension timed out — is Faceto0l extension loaded?'))
    }, timeoutMs)

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.source !== SOURCE_EXT) return
      if (data.type !== resultType) return
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve(data as T)
    }

    window.addEventListener('message', onMessage)
  })
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

export async function listPagesFromExtension(force = true) {
  const pending = waitForExtensionResult<{
    ok: boolean
    pages?: FbPage[]
    error?: string
    warning?: string
    source?: string
  }>('LIST_PAGES_RESULT', 90000)
  postToExtension({ type: 'LIST_PAGES', force })
  return pending
}

export function openPageComposer(pageId: string) {
  postToExtension({ type: 'OPEN_PAGE_COMPOSER', pageId })
}

export function openBusinessSuite(pageId?: string) {
  postToExtension({ type: 'OPEN_BUSINESS_SUITE', pageId })
}

export async function grabSource(
  platform: SourcePlatform,
  options: { maxItems?: number; scrollRounds?: number } = {},
) {
  const pending = waitForExtensionResult<{
    ok: boolean
    items?: GrabItem[]
    error?: string
    profile?: string | null
    scrolled?: number
    tabUrl?: string
  }>('GRAB_SOURCE_RESULT')
  postToExtension({ type: 'GRAB_SOURCE', platform, ...options })
  return pending
}

export async function preparePost(input: {
  pageId: string
  itemUrl: string
  caption?: string
}) {
  const pending = waitForExtensionResult<{
    ok: boolean
    error?: string
    note?: string
    uploaded?: boolean
    posted?: boolean
    mode?: string
    mediaResolved?: boolean
  }>('POST_TO_PAGE_RESULT', 120000)
  postToExtension({ type: 'POST_TO_PAGE', ...input })
  return pending
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
          foundation: data.foundation,
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
