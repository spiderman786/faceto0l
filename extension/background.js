const FACEBOOK_URL = 'https://www.facebook.com'
const PAGES_URL = 'https://www.facebook.com/pages/?category=your_pages'
const PAGES_CACHE_KEY = 'faceto0l_pages'
const PAGES_CACHE_AT = 'faceto0l_pages_at'

const PLATFORM_TAB_URLS = {
  tiktok: ['*://www.tiktok.com/*', '*://*.tiktok.com/*'],
  instagram: ['*://www.instagram.com/*', '*://*.instagram.com/*'],
  youtube: ['*://www.youtube.com/*', '*://*.youtube.com/*', '*://youtu.be/*'],
}

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
    foundation: 'E',
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

/** Self-contained scrape injected into source tabs */
async function scrapeSourceInPage(platform, options) {
  const maxItems = Math.min(Number(options.maxItems) || 40, 80)
  const scrollRounds = Math.min(Number(options.scrollRounds) || 8, 20)
  const pauseMs = 700
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const map = new Map()

  const push = (item) => {
    if (!item?.url || !item.id) return
    if (map.has(item.id)) return
    map.set(item.id, item)
  }

  const abs = (href) => {
    try {
      return new URL(href, location.href).href
    } catch {
      return null
    }
  }

  const scrapeOnce = () => {
    if (platform === 'tiktok') {
      document.querySelectorAll('a[href*="/video/"]').forEach((a) => {
        const href = abs(a.getAttribute('href') || '')
        if (!href) return
        const m = href.match(/\/video\/(\d+)/)
        if (!m) return
        const card = a.closest('div') || a.parentElement
        const img = card?.querySelector?.('img')
        push({
          id: `tt_${m[1]}`,
          url: href.split('?')[0],
          thumb: img?.src || null,
          caption: (img?.alt || '').slice(0, 200),
          platform: 'tiktok',
        })
      })
    } else if (platform === 'instagram') {
      document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]').forEach((a) => {
        const href = abs(a.getAttribute('href') || '')
        if (!href) return
        const m = href.match(/\/(p|reel|tv)\/([^/?#]+)/)
        if (!m) return
        const img = a.querySelector('img') || a.parentElement?.querySelector('img')
        push({
          id: `ig_${m[1]}_${m[2]}`,
          url: href.split('?')[0],
          thumb: img?.src || null,
          caption: (img?.alt || '').slice(0, 200),
          platform: 'instagram',
        })
      })
    } else if (platform === 'youtube') {
      document.querySelectorAll('a[href*="/watch"], a[href*="/shorts/"]').forEach((a) => {
        const href = abs(a.getAttribute('href') || '')
        if (!href) return
        const watch = href.match(/[?&]v=([\w-]{6,})/)
        const shorts = href.match(/\/shorts\/([\w-]{6,})/)
        let id
        let url
        let vid
        if (watch) {
          vid = watch[1]
          id = `yt_${vid}`
          url = `https://www.youtube.com/watch?v=${vid}`
        } else if (shorts) {
          vid = shorts[1]
          id = `yt_${vid}`
          url = `https://www.youtube.com/shorts/${vid}`
        } else return
        const img = a.querySelector('img')
        const title =
          a.getAttribute('title') ||
          a.querySelector('#video-title')?.textContent ||
          img?.alt ||
          ''
        push({
          id,
          url,
          thumb: img?.src || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          caption: title.trim().slice(0, 200),
          platform: 'youtube',
        })
      })
    }
  }

  scrapeOnce()
  let scrolled = 0
  for (let i = 0; i < scrollRounds && map.size < maxItems; i++) {
    window.scrollBy(0, Math.max(900, window.innerHeight * 0.9))
    scrolled += 1
    await sleep(pauseMs)
    scrapeOnce()
  }

  return {
    items: [...map.values()].slice(0, maxItems),
    scrolled,
    profile: location.pathname.match(/@[\w._-]+/)?.[0] || null,
    href: location.href,
  }
}

function pickBestSourceTab(tabs, platform) {
  const scored = tabs
    .filter((t) => t.id && t.url)
    .map((t) => {
      const url = t.url || ''
      let score = 0
      if (platform === 'tiktok' && /tiktok\.com\/@/.test(url)) score += 5
      if (platform === 'instagram' && /instagram\.com\/[^/]+\/?$/.test(url)) score += 5
      if (platform === 'instagram' && /instagram\.com\/(p|reel)\//.test(url)) score += 2
      if (platform === 'youtube' && /youtube\.com\/(@|channel|c\/|user\/)/.test(url)) score += 5
      if (platform === 'youtube' && /youtube\.com\/(watch|shorts)/.test(url)) score += 2
      if (t.active) score += 1
      return { tab: t, score }
    })
    .sort((a, b) => b.score - a.score)
  return scored[0]?.tab || null
}

async function grabSource(platform, options = {}) {
  if (!PLATFORM_TAB_URLS[platform]) {
    return { ok: false, error: `Unknown platform: ${platform}`, items: [] }
  }

  const tabs = await chrome.tabs.query({ url: PLATFORM_TAB_URLS[platform] })
  const tab = pickBestSourceTab(tabs, platform)
  if (!tab?.id) {
    const hint =
      platform === 'tiktok'
        ? 'Open a TikTok profile tab (tiktok.com/@username), then Grab again.'
        : platform === 'instagram'
          ? 'Open an Instagram profile tab, then Grab again.'
          : 'Open a YouTube channel or shorts tab, then Grab again.'
    return { ok: false, error: hint, items: [] }
  }

  try {
    await chrome.tabs.update(tab.id, { active: true })
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeSourceInPage,
      args: [platform, options],
    })

    const items = Array.isArray(result?.items) ? result.items : []
    return {
      ok: items.length > 0,
      items,
      scrolled: result?.scrolled || 0,
      profile: result?.profile || null,
      tabUrl: result?.href || tab.url,
      error: items.length ? undefined : 'No videos/posts found on that tab. Scroll the profile and try again.',
    }
  } catch (err) {
    return { ok: false, error: String(err), items: [] }
  }
}

async function preparePost({ pageId, itemUrl, caption }) {
  if (!pageId) return { ok: false, error: 'pageId required' }
  if (!itemUrl) return { ok: false, error: 'itemUrl required' }

  const pageUrl = `https://www.facebook.com/profile.php?id=${encodeURIComponent(pageId)}`
  await chrome.tabs.create({ url: itemUrl, active: false })
  await chrome.tabs.create({ url: pageUrl, active: true })

  try {
    await chrome.scripting.executeScript({
      target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id },
      func: async (text) => {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          // ignore clipboard failures
        }
      },
      args: [caption || itemUrl],
    })
  } catch {
    // clipboard optional
  }

  return {
    ok: true,
    pageUrl,
    itemUrl,
    note: 'Opened source + Facebook page. Caption/URL copied when clipboard allowed — paste into composer to finish post.',
  }
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
    listPages({ force: Boolean(message.force) })
      .then(sendResponse)
      .catch((err) => {
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

  if (message.type === 'GRAB_SOURCE') {
    grabSource(message.platform, {
      maxItems: message.maxItems,
      scrollRounds: message.scrollRounds,
    })
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err), items: [] }))
    return true
  }

  if (message.type === 'PREPARE_POST') {
    preparePost({
      pageId: message.pageId,
      itemUrl: message.itemUrl,
      caption: message.caption,
    })
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }))
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

console.log('[faceto0l] background ready · foundation E')
