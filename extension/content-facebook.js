document.documentElement.setAttribute('data-faceto0l', '1')

function scrapePages() {
  const map = new Map()
  const html = document.documentElement?.innerHTML || ''

  const push = (id, name) => {
    if (!id || !/^\d{5,}$/.test(String(id))) return
    // Skip obvious personal user id noise when name looks empty and id equals common lengths — keep all pages
    let cleanName = (name || `Page ${id}`).trim()
    try {
      cleanName = cleanName
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\"/g, '"')
    } catch {
      // keep raw
    }
    if (cleanName.length > 80) cleanName = cleanName.slice(0, 80)
    if (!map.has(id)) map.set(id, { id: String(id), name: cleanName || `Page ${id}` })
    else if (name && map.get(id).name.startsWith('Page ')) map.set(id, { id: String(id), name: cleanName })
  }

  const patterns = [
    /"pageID"\s*:\s*"(\d+)"[\s\S]{0,240}?"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    /"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"[\s\S]{0,240}?"pageID"\s*:\s*"(\d+)"/g,
    /"id"\s*:\s*"(\d+)"\s*,\s*"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"category_type"\s*:\s*"PAGE"/g,
    /"delegate_page"\s*:\s*\{\s*"id"\s*:\s*"(\d+)"/g,
    /"page_id"\s*:\s*"(\d+)"[\s\S]{0,160}?"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    /"profile_owner_id"\s*:\s*"(\d+)"/g,
    /"actorID"\s*:\s*"(\d+)"/g,
    /"page_id"\s*:\s*(\d+)/g,
    /pageID%22%3A%22(\d+)/g,
    /"additional_profile_id"\s*:\s*"(\d+)"/g,
    /"profile_plus_id"\s*:\s*"(\d+)"/g,
  ]

  for (const re of patterns) {
    let m
    while ((m = re.exec(html))) {
      // patterns alternate id/name order
      if (re.source.startsWith('"name"')) push(m[2], m[1])
      else push(m[1], m[2] || null)
    }
  }

  document.querySelectorAll('a[href*="facebook.com/"], a[href^="/"], a[href*="profile.php"]').forEach((a) => {
    const href = a.getAttribute('href') || ''
    const text = (a.textContent || '').replace(/\s+/g, ' ').trim()
    const idMatch =
      href.match(/[?&]id=(\d{5,})/) ||
      href.match(/\/pages\/[^/]+\/(\d{5,})/) ||
      href.match(/\/(\d{8,})\b/)
    if (idMatch && text.length > 1 && text.length < 80) push(idMatch[1], text)
  })

  // Account / page switcher rows
  document.querySelectorAll('[role="listitem"], [role="option"], [data-pageid]').forEach((el) => {
    const id = el.getAttribute('data-pageid') || el.getAttribute('data-id')
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
    if (id) push(id, text)
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
