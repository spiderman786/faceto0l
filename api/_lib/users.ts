import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'

export type User = {
  id: string
  email: string
  password_hash: string
  name: string | null
  plan: string
}

export type PublicUser = {
  id: string
  email: string
  name: string | null
  plan: string
}

const COOKIE = 'faceto0l_token'

type GlobalStore = {
  __faceto0l_users?: Map<string, User>
}

export function users(): Map<string, User> {
  const g = globalThis as GlobalStore
  if (!g.__faceto0l_users) g.__faceto0l_users = new Map()
  return g.__faceto0l_users
}

export function secret() {
  return process.env.JWT_SECRET || 'faceto0l-vercel-dev-secret-change-me'
}

export function publicUser(u: User): PublicUser {
  return { id: u.id, email: u.email, name: u.name, plan: u.plan }
}

export function sign(user: PublicUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, plan: user.plan },
    secret(),
    { expiresIn: '30d' },
  )
}

export function parseCookies(req: VercelRequest): Record<string, string> {
  const raw = req.headers.cookie || ''
  const out: Record<string, string> = {}
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (!k) continue
    out[k] = decodeURIComponent(rest.join('=') || '')
  }
  return out
}

export function setCookie(res: VercelResponse, token: string) {
  const secure = true
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${
      secure ? '; Secure' : ''
    }`,
  )
}

export function clearCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`)
}

export function readUser(req: VercelRequest): PublicUser | null {
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

export function readBody(req: VercelRequest): Record<string, unknown> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>
  return {}
}

export function findUser(email: string) {
  return users().get(email)
}

export function saveUser(user: User) {
  users().set(user.email, user)
}
