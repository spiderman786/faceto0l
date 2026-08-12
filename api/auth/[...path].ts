import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'

type User = {
  id: string
  email: string
  password_hash: string
  name: string | null
  plan: string
}

type PublicUser = {
  id: string
  email: string
  name: string | null
  plan: string
}

const COOKIE = 'faceto0l_token'

type GlobalStore = {
  __faceto0l_users?: Map<string, User>
}

function users(): Map<string, User> {
  const g = globalThis as GlobalStore
  if (!g.__faceto0l_users) g.__faceto0l_users = new Map()
  return g.__faceto0l_users
}

function secret() {
  return process.env.JWT_SECRET || 'faceto0l-vercel-dev-secret-change-me'
}

function publicUser(u: User): PublicUser {
  return { id: u.id, email: u.email, name: u.name, plan: u.plan }
}

function sign(user: PublicUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, plan: user.plan },
    secret(),
    { expiresIn: '30d' },
  )
}

function parseCookies(req: VercelRequest): Record<string, string> {
  const raw = req.headers.cookie || ''
  const out: Record<string, string> = {}
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (!k) continue
    out[k] = decodeURIComponent(rest.join('=') || '')
  }
  return out
}

function setCookie(res: VercelResponse, token: string) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}; Secure`,
  )
}

function clearCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`)
}

function readUser(req: VercelRequest): PublicUser | null {
  const token = parseCookies(req)[COOKIE]
  if (!token) return null
  try {
    const payload = jwt.verify(token, secret()) as {
      sub: string
      email: string
      name?: string | null
      plan?: string
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      plan: payload.plan || 'free',
    }
  } catch {
    return null
  }
}

function readBody(req: VercelRequest): Record<string, unknown> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  return {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parts = Array.isArray(req.query.path)
    ? req.query.path
    : String(req.query.path || '')
        .split('/')
        .filter(Boolean)
  const action = parts[0] || ''

  try {
    if (req.method === 'GET' && action === 'me') {
      const user = readUser(req)
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      res.status(200).json({ user })
      return
    }

    if (req.method === 'POST' && action === 'logout') {
      clearCookie(res)
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'POST' && action === 'register') {
      const body = readBody(req)
      const email = String(body.email || '')
        .trim()
        .toLowerCase()
      const password = String(body.password || '')
      const name = String(body.name || '').trim() || null

      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email required' })
        return
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' })
        return
      }
      if (users().has(email)) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      const user: User = {
        id: randomUUID(),
        email,
        password_hash: await bcrypt.hash(password, 10),
        name,
        plan: 'free',
      }
      users().set(email, user)
      const pub = publicUser(user)
      setCookie(res, sign(pub))
      res.status(201).json({ user: pub })
      return
    }

    if (req.method === 'POST' && action === 'login') {
      const body = readBody(req)
      const email = String(body.email || '')
        .trim()
        .toLowerCase()
      const password = String(body.password || '')
      const row = users().get(email)
      if (!row || !(await bcrypt.compare(password, row.password_hash))) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }
      const pub = publicUser(row)
      setCookie(res, sign(pub))
      res.status(200).json({ user: pub })
      return
    }

    res.status(404).json({ error: 'Not found' })
  } catch (err) {
    console.error('[faceto0l auth]', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Server error' })
  }
}
