import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    service: 'faceto0l',
    foundation: 'D',
    host: 'vercel',
    time: new Date().toISOString(),
  })
}
