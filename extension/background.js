const FACEBOOK_URL = 'https://www.facebook.com'
const PAGES_URL = 'https://www.facebook.com/pages/?category=your_pages'
const PAGES_CACHE_KEY = 'faceto0l_pages'
const PAGES_CACHE_AT = 'faceto0l_pages_at'

async function getFacebookSession() {
  try {
    const cookie = await chrome.cookies.get({
      url: FACEBOOK_URL,
      name: 'c_user',
    })
    if (!cookie?.value) {
      return { connected: false, userId: null }
    }
    return { connected: true, userId: cookie.value }
  } catch (err) {
    console.warn('[faceto0l] cookie read failed', err)
    return { connected: false, userId: null, error: String(err) }
  }
}

async function getStatus() {
  const fb = await getFacebookSession()
  const stored = await chrome.storage.local.get([PAGES_CACHE_KEY, PAGES_CACHE_AT])
  return {
    ok: true,
    extension: true,
    version: chrome.runtime.getManifest().version,
    facebook: fb,
    pagesCached: Array.isArray(stored[PAGES_CACHE_KEY]) ? stored[PAGES_CACHE_KEY].length : 0,
    pagesCachedAt: stored[PAGES_CACHE_AT] || null,
    checkedAt: new Date().toISOString(),
  }
}

function waitForTabComplete(tabId, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      reject(new Error('Timed out loading Facebook pages tab'))
    }, timeoutMs)

    function onUpdated(id, info) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer)
        chrome.tabs.onUpdated.removeListener(onUpdated)
        resolve()
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated)
  })
}

async function scrapePagesFromTab(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_PAGES' })
    if (res?.pages?.length) return res.pages
  } catch {
    // content script may not be ready yet
  }

  // Inject scrape function if content script didn't respond
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const map = new Map()
      const html = document.documentElement?.innerHTML || ''

      const push = (id, name) => {
        if (!id || !/^\d{5,}$/.test(id)) return
        const cleanName = (name || `Page ${id}`).replace(/\\u[\dA-Fa-f]{4}/g, (m) =>
          String.fromCharCode(parseInt(m.slice(2), 16)),
        )
        if (!map.has(id)) map.set(id, { id, name: cleanName })
      }

      const patterns = [
        /"pageID"\s*:\s*"(\d+)"[\s\S]{0,180}?"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g,
        /"id"\s*:\s*"(\d+)"\s*,\s*"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"category_type"\s*:\s*"PAGE"/g,
        /"delegate_page"\s*:\s*\{\s*"id"\s*:\s*"(\d+)"/g,
      ]

      for (const re of patterns) {
        let m
        while ((m = re.exec(html))) {
          push(m[1], m[2] || null)
        }
      }

      document.querySelectorAll('a[href*="facebook.com/"]').forEach((a) => {
        const href = a.getAttribute('href') || ''
        const text = (a.textContent || '').trim()
        const idMatch = href.match(/[?&]id=(\d{5,})/) || href.match(/\/(\d{8,})\b/)
        if (idMatch && text.length > 1 && text.length < 80) push(idMatch[1], text)
      })

      return [...map.values()]
    },
  })

  return Array.isArray(result) ? result : []
}

async function listPages({ force = false } = {}) {
  const session = await getFacebookSession()
  if (!session.connected) {
    return { ok: false, error: 'Facebook Disconnected', pages: [] }
  }

  if (!force) {
    const stored = await chrome.storage.local.get([PAGES_CACHE_KEY, PAGES_CACHE_AT])
    const cached = stored[PAGES_CACHE_KEY]
    const at = stored[PAGES_CACHE_AT] || 0
    if (Array.isArray(cached) && cached.length && Date.now() - at < 5 * 60 * 1000) {
      return { ok: true, pages: cached, source: 'cache' }
    }
  }

  // Prefer an already-open Facebook tab
  const existing = await chrome.tabs.query({
    url: ['*://www.facebook.com/*', '*://*.facebook.com/*', '*://business.facebook.com/*'],
  })
  for (const tab of existing) {
    if (!tab.id) continue
    try {
      const pages = await scrapePagesFromTab(tab.id)
      if (pages.length) {
        await chrome.storage.local.set({
          [PAGES_CACHE_KEY]: pages,
          [PAGES_CACHE_AT]: Date.now(),
        })
        return { ok: true, pages, source: 'open-tab' }
      }
    } catch (err) {
      console.warn('[faceto0l] scrape open tab failed', err)
    }
  }

  // Hidden pages manager tab
  const tab = await chrome.tabs.create({ url: PAGES_URL, active: false })
  try {
    await waitForTabComplete(tab.id)
    await new Promise((r) => setTimeout(r, 2500))
    const pages = await scrapePagesFromTab(tab.id)
    await chrome.storage.local.set({
      [PAGES_CACHE_KEY]: pages,
      [PAGES_CACHE_AT]: Date.now(),
    })
    return {
      ok: true,
      pages,
      source: 'pages-tab',
      warning:
        pages.length === 0
          ? 'No pages found. Open facebook.com/pages while logged in, then Refresh pages.'
          : undefined,
    }
  } finally {
    if (tab.id) chrome.tabs.remove(tab.id).catch(() => {})
  }
}

async function openPageComposer(pageId) {
  if (!pageId) return { ok: false, error: 'pageId required' }
  const url = `https://www.facebook.com/profile.php?id=${encodeURIComponent(pageId)}`
  await chrome.tabs.create({ url, active: true })
  return { ok: true, url }
}

async function openBusinessSuite(pageId) {
  const url = pageId
    ? `https://business.facebook.com/latest/home?asset_id=${encodeURIComponent(pageId)}`
    : 'https://business.facebook.com/'
  await chrome.tabs.create({ url, active: true })
  return { ok: true, url }
}

function handleMessage(message, sendResponse) {
  if (!message || typeof message !== 'object') return false

  if (message.type === 'PING' || message.type === 'GET_STATUS') {
    getStatus().then(sendResponse)
    return true
  }

  if (message.type === 'OPEN_FACEBOOK') {
    chrome.tabs.create({ url: FACEBOOK_URL })
    sendResponse({ ok: true })
    return false
  }

  if (message.type === 'LIST_PAGES') {
    listPages({ force: Boolean(message.force) }).then(sendResponse).catch((err) => {
      sendResponse({ ok: false, error: String(err), pages: [] })
    })
    return true
  }

  if (message.type === 'OPEN_PAGE_COMPOSER') {
    openPageComposer(message.pageId).then(sendResponse)
    return true
  }

  if (message.type === 'OPEN_BUSINESS_SUITE') {
    openBusinessSuite(message.pageId).then(sendResponse)
    return true
  }

  return false
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  return handleMessage(message, sendResponse)
})

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  return handleMessage(message, sendResponse)
})

console.log('[faceto0l] background ready · foundation D')
