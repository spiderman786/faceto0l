import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'faceto0l_token'

export type AuthUser = {
  id: string
  email: string
  name: string | null
  plan: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

function jwtSecret() {
  return process.env.JWT_SECRET || 'faceto0l-dev-secret-change-me'
}

export function signToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, plan: user.plan },
    jwtSecret(),
    { expiresIn: '30d' },
  )
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(token, jwtSecret()) as {
      sub: string
      email: string
      name?: string | null
      plan?: string
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      plan: payload.plan || 'free',
    }
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined
  if (!token) {
    next()
    return
  }
  try {
    const payload = jwt.verify(token, jwtSecret()) as {
      sub: string
      email: string
      name?: string | null
      plan?: string
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      plan: payload.plan || 'free',
    }
  } catch {
    // ignore invalid token
  }
  next()
}
