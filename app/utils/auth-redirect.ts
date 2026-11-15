const localOrigin = 'https://internal.invalid'

function unsafePath(path: string) {
  return path.startsWith('//') || path.includes('\\') || Array.from(path).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
}

export function resolveAuthRedirect(value: unknown, fallback = '/account') {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string') return fallback
  if (!candidate.startsWith('/') || unsafePath(candidate)) return fallback
  try {
    const path = decodeURIComponent(new URL(candidate, localOrigin).pathname)
    if (unsafePath(path) || /^\/(?:login|register)\/?$/i.test(path)) return fallback
  } catch {
    return fallback
  }
  return candidate
}

export function resolveAdminRedirect(value: unknown) {
  const target = resolveAuthRedirect(value, '/admin')
  const path = decodeURIComponent(new URL(target, localOrigin).pathname)
  return /^\/admin(?:\/|$)/.test(path) && !/^\/admin\/login\/?$/.test(path) ? target : '/admin'
}
