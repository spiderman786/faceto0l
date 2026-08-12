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
  return new Promise(async (resolve, reject) => {
    try {
      const existing = await chrome.tabs.get(tabId)
      if (existing.status === 'complete') {
        resolve()
        return
      }
    } catch (err) {
      reject(err)
      return
    }

    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      reject(new Error('Timed out loading tab'))
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

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

function resolveMediaInPage() {
  const html = document.documentElement?.innerHTML || ''
  const ogVideo =
    document.querySelector('meta[property="og:video"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content')
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
  const videoEl = document.querySelector('video')
  const videoSrc = videoEl?.currentSrc || videoEl?.src || null

  const playAddr =
    html.match(/"playAddr"\s*:\s*"([^"]+)"/)?.[1] ||
    html.match(/"downloadAddr"\s*:\s*"([^"]+)"/)?.[1] ||
    html.match(/"play_url"\s*:\s*"([^"]+)"/)?.[1]

  const decode = (u) => {
    if (!u) return null
    try {
      return JSON.parse(`"${u.replace(/^"/, '').replace(/"$/, '')}"`)
    } catch {
      return u.replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/\\u0026/g, '&')
    }
  }

  const candidates = [decode(playAddr), ogVideo, videoSrc].filter(Boolean)
  const mediaUrl = candidates.find((u) => /^https?:\/\//i.test(u)) || null
  const imageUrl = ogImage && /^https?:\/\//i.test(ogImage) ? ogImage : null

  let kind = 'link'
  if (mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)) kind = 'video'
  else if (mediaUrl) kind = 'video'
  else if (imageUrl) kind = 'image'

  const title =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    document.title ||
    ''

  return {
    mediaUrl,
    imageUrl,
    kind: mediaUrl ? kind : imageUrl ? 'image' : 'link',
    title: title.slice(0, 200),
    href: location.href,
  }
}

async function fetchMediaAsBase64(url, maxBytes = 4.5 * 1024 * 1024) {
  const res = await fetch(url, { credentials: 'omit' })
  if (!res.ok) throw new Error(`Media fetch HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  if (buf.byteLength > maxBytes) {
    return { tooLarge: true, size: buf.byteLength, mime: res.headers.get('content-type') || 'application/octet-stream' }
  }
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const mime = res.headers.get('content-type') || 'application/octet-stream'
  return {
    tooLarge: false,
    size: buf.byteLength,
    mime,
    base64: btoa(binary),
  }
}

async function runFacebookComposer(tabId, payload) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (input) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

      const clickByText = (texts) => {
        const nodes = [...document.querySelectorAll('[role="button"], button, div[tabindex="0"], span')]
        for (const t of texts) {
          const el = nodes.find((n) => (n.textContent || '').trim().toLowerCase() === t.toLowerCase())
          if (el) {
            el.click()
            return true
          }
        }
        for (const t of texts) {
          const el = nodes.find((n) => (n.textContent || '').trim().toLowerCase().includes(t.toLowerCase()))
          if (el) {
            el.click()
            return true
          }
        }
        return false
      }

      const setCaption = async (text) => {
        const editors = [
          ...document.querySelectorAll('div[contenteditable="true"][role="textbox"]'),
          ...document.querySelectorAll('div[contenteditable="true"]'),
          ...document.querySelectorAll('[data-lexical-editor="true"]'),
        ]
        const editor = editors[0]
        if (!editor) return false
        editor.focus()
        try {
          document.execCommand('selectAll', false)
          document.execCommand('insertText', false, text)
        } catch {
          editor.textContent = text
          editor.dispatchEvent(new InputEvent('input', { bubbles: true }))
        }
        await sleep(400)
        return true
      }

      const attachFile = async () => {
        if (!input.base64 || !input.fileName) return false
        const binary = atob(input.base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const file = new File([bytes], input.fileName, { type: input.mime || 'application/octet-stream' })

        clickByText(['Photo/video', 'Photo/Video', 'Add photo/video', 'Reel', 'Reels'])
        await sleep(1200)

        let inputEl = document.querySelector('input[type="file"]')
        if (!inputEl) {
          clickByText(['Photo/video', 'Add photo/video'])
          await sleep(1000)
          inputEl = document.querySelector('input[type="file"]')
        }
        if (!inputEl) return false

        const dt = new DataTransfer()
        dt.items.add(file)
        inputEl.files = dt.files
        inputEl.dispatchEvent(new Event('change', { bubbles: true }))
        inputEl.dispatchEvent(new Event('input', { bubbles: true }))
        await sleep(2000)
        return true
      }

      // Open composer if needed
      clickByText(['Create post', 'Post', "What's on your mind?"])
      await sleep(900)

      let uploaded = false
      if (input.mode === 'upload') {
        uploaded = await attachFile()
      }

      const captionText = [input.caption, input.linkUrl].filter(Boolean).join('\n\n')
      const captioned = await setCaption(captionText)

      await sleep(800)
      const posted =
        clickByText(['Post', 'Publish', 'Share now', 'Next']) ||
        clickByText(['Post'])

      return {
        ok: Boolean(uploaded || captioned),
        uploaded,
        captioned,
        posted,
        mode: input.mode,
      }
    },
    args: [payload],
  })
  return result || { ok: false }
}

async function postToPage({ pageId, itemUrl, caption }) {
  if (!pageId) return { ok: false, error: 'pageId required' }
  if (!itemUrl) return { ok: false, error: 'itemUrl required' }

  const session = await getFacebookSession()
  if (!session.connected) return { ok: false, error: 'Facebook Disconnected' }

  // Resolve media from source item page
  const sourceTab = await chrome.tabs.create({ url: itemUrl, active: false })
  let media = null
  try {
    await waitForTabComplete(sourceTab.id, 30000)
    await sleep(2500)
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: sourceTab.id },
      func: resolveMediaInPage,
    })
    media = result
  } catch (err) {
    console.warn('[faceto0l] media resolve failed', err)
  }

  let uploadPayload = null
  const fetchUrl = media?.mediaUrl || (media?.kind === 'image' ? media?.imageUrl : null)
  if (fetchUrl) {
    try {
      const fetched = await fetchMediaAsBase64(fetchUrl)
      if (!fetched.tooLarge) {
        const isImage = (fetched.mime || '').startsWith('image') || media?.kind === 'image'
        uploadPayload = {
          mode: 'upload',
          base64: fetched.base64,
          mime: fetched.mime || (isImage ? 'image/jpeg' : 'video/mp4'),
          fileName: isImage ? 'faceto0l.jpg' : 'faceto0l.mp4',
          caption: caption || media?.title || '',
          linkUrl: itemUrl,
        }
      } else {
        // Large video: download for manual attach fallback
        try {
          await chrome.downloads.download({
            url: fetchUrl,
            filename: `Faceto0l/${Date.now()}_media`,
            saveAs: false,
          })
        } catch {
          // optional
        }
      }
    } catch (err) {
      console.warn('[faceto0l] media fetch failed', err)
    }
  }

  const composerUrl = `https://www.facebook.com/profile.php?id=${encodeURIComponent(pageId)}`
  const composerTab = await chrome.tabs.create({ url: composerUrl, active: true })
  try {
    await waitForTabComplete(composerTab.id, 30000)
    await sleep(2500)

    const payload = uploadPayload || {
      mode: 'link',
      caption: caption || media?.title || '',
      linkUrl: itemUrl,
    }

    const result = await runFacebookComposer(composerTab.id, payload)

    return {
      ok: Boolean(result?.ok || result?.captioned || result?.uploaded),
      uploaded: Boolean(result?.uploaded),
      posted: Boolean(result?.posted),
      mode: payload.mode,
      mediaResolved: Boolean(fetchUrl),
      note: result?.uploaded
        ? 'Media attached to Facebook composer — confirm Post if needed.'
        : result?.captioned
          ? 'Caption/link filled in composer — click Post to publish.'
          : 'Opened Facebook page. Composer controls may have changed — finish Post manually.',
      error: result?.ok ? undefined : 'Composer automation partially failed',
    }
  } finally {
    if (sourceTab.id) chrome.tabs.remove(sourceTab.id).catch(() => {})
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

  if (message.type === 'PREPARE_POST' || message.type === 'POST_TO_PAGE') {
    postToPage({
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
