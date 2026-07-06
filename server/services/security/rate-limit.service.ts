import { getRequestIP, type H3Event } from 'h3'

export type FixedWindowState = {
  count: number
  resetAt: number
}

export type FixedWindowStore = Map<string, FixedWindowState>

export function getClientIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

export function assertFixedWindowAllowed(
  store: FixedWindowStore,
  key: string,
  limit: number,
  onLimited: (state: FixedWindowState) => never
) {
  const now = Date.now()
  const state = store.get(key)

  if (!state || state.resetAt <= now) {
    store.delete(key)
    return
  }

  if (state.count >= limit) {
    onLimited(state)
  }
}

export function incrementFixedWindow(store: FixedWindowStore, key: string, windowMs: number) {
  const now = Date.now()
  const state = store.get(key)

  if (!state || state.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    })
    return
  }

  state.count += 1
}

export function consumeFixedWindow(
  store: FixedWindowStore,
  key: string,
  windowMs: number,
  limit: number,
  onLimited: (state: FixedWindowState) => never
) {
  assertFixedWindowAllowed(store, key, limit, onLimited)
  incrementFixedWindow(store, key, windowMs)
}

export function clearFixedWindow(store: FixedWindowStore, key: string) {
  store.delete(key)
}

export function retryAfterSeconds(resetAt: number) {
  return Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1)
}
