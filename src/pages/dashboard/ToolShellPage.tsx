import { Link, useParams } from 'react-router-dom'
import { PagePicker } from '../../components/PagePicker'
import { SchedulerTool } from '../../components/SchedulerTool'
import { TOOLS } from '../../config/tools'
import { openFacebookFromExtension, useExtensionStatus, type SourcePlatform } from '../../lib/extension'
import { usePages } from '../../lib/pages'

const TOOL_PLATFORM: Record<string, SourcePlatform | 'bulk'> = {
  'tiktok-fb': 'tiktok',
  'instagram-fb': 'instagram',
  'youtube-fb': 'youtube',
  'bulk-scheduler': 'bulk',
}

const GRAB_LABEL: Record<string, string> = {
  tiktok: 'Grab Videos',
  instagram: 'Grab Posts',
  youtube: 'Grab Videos',
  bulk: 'Grab',
}

const PITCH: Record<string, string> = {
  'tiktok-fb': 'Grab all videos from a TikTok profile and schedule them to your Facebook pages.',
  'instagram-fb': 'Grab Instagram posts (photo / video / carousel) and schedule them to your pages.',
  'youtube-fb': 'Grab or paste YouTube videos and schedule them to your Facebook pages.',
  'bulk-scheduler': 'Paste mixed links and schedule across pages with Interval or Daily Window.',
}

export function ToolShellPage() {
  const { toolId } = useParams()
  const tool = TOOLS.find((t) => t.id === toolId)
  const { installed, connected } = useExtensionStatus()
  const { selectedIds } = usePages()

  if (!tool) {
    return (
      <div>
        <h1 className="brand-font text-2xl font-bold">Tool not found</h1>
        <Link to="/dashboard" className="mt-3 inline-block text-[var(--brand)]">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const platform = TOOL_PLATFORM[tool.id] || 'bulk'

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">{tool.category}</div>
        <h1 className="brand-font mt-2 text-3xl font-bold tracking-tight">{tool.name}</h1>
        <p className="mt-2 text-[var(--muted)]">{PITCH[tool.id] || tool.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {connected ? 'Facebook Connected' : installed ? 'Facebook Disconnected' : 'Extension Not Connected'}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            100% remaining
          </span>
          {selectedIds.length > 0 && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {selectedIds.length} page(s) selected
            </span>
          )}
        </div>
      </div>

      {!connected && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {!installed ? (
            <>
              Extension Not Connected.{' '}
              <Link className="font-semibold underline" to="/install">
                Download from website
              </Link>
            </>
          ) : (
            <>
              Log into Facebook in this Chrome, then load pages.{' '}
              <button type="button" onClick={openFacebookFromExtension} className="font-semibold underline">
                Open Facebook
              </button>
            </>
          )}
        </div>
      )}

      <PagePicker />

      <SchedulerTool
        toolId={tool.id}
        platform={platform}
        title="Thumbnail preview queue"
        grabLabel={GRAB_LABEL[platform]}
      />
    </div>
  )
}
