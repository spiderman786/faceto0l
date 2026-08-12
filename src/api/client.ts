export type User = {
  id: string
  email: string
  name: string | null
  plan: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  return data
}

export async function apiRegister(input: {
  email: string
  password: string
  name?: string
}) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  return parseJson<{ user: User }>(res)
}

export async function apiLogin(input: { email: string; password: string }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  return parseJson<{ user: User }>(res)
}

export async function apiLogout() {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  return parseJson<{ ok: boolean }>(res)
}

export async function apiMe() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (!res.ok) return null
    return parseJson<{ user: User }>(res)
  } catch {
    return null
  }
}
