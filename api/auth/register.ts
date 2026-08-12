import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import {
  findUser,
  publicUser,
  readBody,
  saveUser,
  setCookie,
  sign,
  type User,
} from '../_lib/users.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

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
  if (findUser(email)) {
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
  saveUser(user)
  const pub = publicUser(user)
  setCookie(res, sign(pub))
  res.status(201).json({ user: pub })
}
