document.documentElement.setAttribute('data-faceto0l', '1')

function scrapePages() {
  const map = new Map()
  const html = document.documentElement?.innerHTML || ''

  const push = (id, name) => {
    if (!id || !/^\d{5,}$/.test(id)) return
    let cleanName = name || `Page ${id}`
    try {
      cleanName = cleanName.replace(/\\u([\dA-Fa-f]{4})/g, (_, h) =>
        String.fromCharCode(parseInt(h, 16)),
      )
    } catch {
      // keep raw
    }
    if (!map.has(id)) map.set(id, { id, name: cleanName })
  }

  const patterns = [
    /"pageID"\s*:\s*"(\d+)"[\s\S]{0,180}?"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    /"id"\s*:\s*"(\d+)"\s*,\s*"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"category_type"\s*:\s*"PAGE"/g,
    /"delegate_page"\s*:\s*\{\s*"id"\s*:\s*"(\d+)"/g,
    /"page_id"\s*:\s*"(\d+)"[\s\S]{0,120}?"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g,
  ]

  for (const re of patterns) {
    let m
    while ((m = re.exec(html))) {
      push(m[1], m[2] || null)
    }
  }

  document.querySelectorAll('a[href*="facebook.com/"], a[href^="/"]').forEach((a) => {
    const href = a.getAttribute('href') || ''
    const text = (a.textContent || '').trim()
    const idMatch = href.match(/[?&]id=(\d{5,})/) || href.match(/\/(\d{8,})\b/)
    if (idMatch && text.length > 1 && text.length < 80) push(idMatch[1], text)
  })

  return [...map.values()]
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SCRAPE_PAGES') {
    sendResponse({ ok: true, pages: scrapePages(), href: location.href })
    return false
  }
  return undefined
})

chrome.runtime.sendMessage(
  {
    type: 'FACEBOOK_TAB_SEEN',
    href: location.href,
  },
  () => {
    void chrome.runtime.lastError
  },
)
