import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import {
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
  type AuthUser,
} from '../auth.js'

type UserRow = {
  id: string
  email: string
  password_hash: string
  name: string | null
  plan: string
}

function publicUser(row: Pick<UserRow, 'id' | 'email' | 'name' | 'plan'>): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
  }
}

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase()
  const password = String(req.body?.password || '')
  const name = String(req.body?.name || '').trim() || null

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email required' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const id = uuid()
  const password_hash = await bcrypt.hash(password, 10)
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, plan) VALUES (?, ?, ?, ?, 'free')`,
  ).run(id, email, password_hash, name)

  const user = publicUser({ id, email, name, plan: 'free' })
  const token = signToken(user)
  setAuthCookie(res, token)
  res.status(201).json({ user })
})

authRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email || '')
    .trim()
    .toLowerCase()
  const password = String(req.body?.password || '')

  const row = db
    .prepare('SELECT id, email, password_hash, name, plan FROM users WHERE email = ?')
    .get(email) as UserRow | undefined

  if (!row) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const user = publicUser(row)
  const token = signToken(user)
  setAuthCookie(res, token)
  res.json({ user })
})

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})
