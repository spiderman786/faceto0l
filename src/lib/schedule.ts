export type ScheduleMode = 'interval' | 'daily'

export type ScheduleConfig = {
  mode: ScheduleMode
  intervalValue: number
  intervalUnit: 'minutes' | 'hours' | 'days'
  dailyPosts: number
  dailyStart: string
  dailyGapMinutes: number
  delaySeconds: number
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  mode: 'interval',
  intervalValue: 30,
  intervalUnit: 'minutes',
  dailyPosts: 3,
  dailyStart: '09:00',
  dailyGapMinutes: 60,
  delaySeconds: 45,
}

function intervalMs(cfg: ScheduleConfig) {
  const n = Math.max(1, cfg.intervalValue)
  if (cfg.intervalUnit === 'days') return n * 24 * 60 * 60 * 1000
  if (cfg.intervalUnit === 'hours') return n * 60 * 60 * 1000
  return n * 60 * 1000
}

function parseDailyStart(hhmm: string, from = new Date()) {
  const [h, m] = hhmm.split(':').map((x) => Number(x))
  const d = new Date(from)
  d.setSeconds(0, 0)
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0)
  if (d.getTime() < from.getTime()) d.setDate(d.getDate() + 1)
  return d
}

/** Preview publish timestamps for the next `count` items. */
export function previewScheduleTimes(cfg: ScheduleConfig, count: number, from = new Date()): Date[] {
  const n = Math.max(0, count)
  if (!n) return []
  const delay = Math.max(0, cfg.delaySeconds) * 1000
  const times: Date[] = []

  if (cfg.mode === 'interval') {
    const step = intervalMs(cfg)
    let t = from.getTime() + Math.max(delay, 5_000)
    for (let i = 0; i < n; i++) {
      times.push(new Date(t))
      t += step
    }
    return times
  }

  const postsPerDay = Math.max(1, cfg.dailyPosts)
  const gap = Math.max(1, cfg.dailyGapMinutes) * 60 * 1000
  let dayStart = parseDailyStart(cfg.dailyStart, from)
  let slot = 0
  let t = dayStart.getTime()

  for (let i = 0; i < n; i++) {
    if (slot >= postsPerDay) {
      dayStart = new Date(dayStart)
      dayStart.setDate(dayStart.getDate() + 1)
      t = dayStart.getTime()
      slot = 0
    }
    if (i === 0 && t < from.getTime() + delay) {
      t = from.getTime() + delay
    }
    times.push(new Date(t))
    t += gap
    slot += 1
  }
  return times
}

export type HistoryEntry = {
  id: string
  itemId: string
  url: string
  thumb?: string | null
  caption?: string
  pageId: string
  pageName?: string
  scheduledAt: string
  status: 'queued' | 'opened' | 'done' | 'failed'
  note?: string
  toolId: string
}

function historyKey(toolId: string) {
  return `faceto0l_history_${toolId}`
}

export function loadHistory(toolId: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(toolId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveHistory(toolId: string, entries: HistoryEntry[]) {
  localStorage.setItem(historyKey(toolId), JSON.stringify(entries.slice(0, 200)))
}

export function parseManualLinks(text: string, platform: string): { id: string; url: string; platform: string }[] {
  const urls = text.match(/https?:\/\/[^\s]+/g) || []
  const out: { id: string; url: string; platform: string }[] = []
  for (const raw of urls) {
    const url = raw.replace(/[),.;]+$/, '')
    let detected = platform
    if (platform === 'bulk') {
      if (/tiktok\.com/i.test(url)) detected = 'tiktok'
      else if (/instagram\.com/i.test(url)) detected = 'instagram'
      else if (/youtube\.com|youtu\.be/i.test(url)) detected = 'youtube'
    }
    let id = `${detected}_${url.length}_${url.slice(-12).replace(/\W/g, '')}`
    if (detected === 'tiktok') {
      const m = url.match(/\/video\/(\d+)/)
      if (m) id = `tt_${m[1]}`
    } else if (detected === 'instagram') {
      const m = url.match(/\/(p|reel|tv)\/([^/?#]+)/)
      if (m) id = `ig_${m[1]}_${m[2]}`
    } else if (detected === 'youtube') {
      const m = url.match(/[?&]v=([\w-]{6,})/) || url.match(/\/shorts\/([\w-]{6,})/) || url.match(/youtu\.be\/([\w-]{6,})/)
      if (m) id = `yt_${m[1]}`
    }
    out.push({ id, url, platform: detected })
  }
  return out
}
