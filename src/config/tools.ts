export type ToolDef = {
  id: string
  name: string
  description: string
  path: string
  category: string
  status: 'ready' | 'shell'
  badge: 'Free' | 'Pro' | 'Gold'
  icon: string
  accent: string
}

export const TOOL_CATEGORIES = [
  'TikTok to FB',
  'Instagram to FB',
  'YouTube to FB',
  'Schedulers',
] as const

export const TOOLS: ToolDef[] = [
  {
    id: 'tiktok-fb',
    name: 'TikTok → Facebook',
    description: 'Grab TikTok profile videos with thumbnail previews and schedule to pages.',
    path: '/dashboard/tools/tiktok-fb',
    category: 'TikTok to FB',
    status: 'ready',
    badge: 'Pro',
    icon: 'TT',
    accent: '#111827',
  },
  {
    id: 'instagram-fb',
    name: 'Instagram → Facebook',
    description: 'Grab IG posts (photo/video/carousel) onto the tool page and schedule.',
    path: '/dashboard/tools/instagram-fb',
    category: 'Instagram to FB',
    status: 'ready',
    badge: 'Pro',
    icon: 'IG',
    accent: '#db2777',
  },
  {
    id: 'youtube-fb',
    name: 'YouTube → Facebook',
    description: 'Paste or grab YouTube videos and schedule to Facebook pages.',
    path: '/dashboard/tools/youtube-fb',
    category: 'YouTube to FB',
    status: 'ready',
    badge: 'Gold',
    icon: 'YT',
    accent: '#dc2626',
  },
  {
    id: 'bulk-scheduler',
    name: 'Bulk Scheduler',
    description: 'Interval or Daily Window scheduling, delays, multi-page spread, activity.',
    path: '/dashboard/tools/bulk-scheduler',
    category: 'Schedulers',
    status: 'ready',
    badge: 'Free',
    icon: 'SC',
    accent: '#1a6dff',
  },
]

export function badgeClass(badge: ToolDef['badge']) {
  if (badge === 'Gold') return 'bg-amber-100 text-amber-800'
  if (badge === 'Pro') return 'bg-violet-100 text-violet-800'
  return 'bg-emerald-100 text-emerald-800'
}
