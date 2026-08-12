import type { VercelRequest, VercelResponse } from '@vercel/node'
import bcrypt from 'bcryptjs'
import { findUser, publicUser, readBody, setCookie, sign } from '../_lib/users.js'

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
  const row = findUser(email)
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }
  const pub = publicUser(row)
  setCookie(res, sign(pub))
  res.status(200).json({ user: pub })
}
