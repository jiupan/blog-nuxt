import type { H3Event } from 'h3'
import { getTrustedClientIp } from '../../utils/client-ip'

export type FixedWindowState = {
  count: number
  resetAt: number
}

const sweepIntervalMs = 60_000

type FixedWindowStore = ReturnType<typeof createFixedWindowStore>

export function createFixedWindowStore(maxEntries = 10_000) {
  return { entries: new Map<string, FixedWindowState>(), maxEntries, nextSweepAt: 0 }
}

export function getClientIp(event: H3Event) {
  return getTrustedClientIp(event) || 'unknown'
}

export function consumeFixedWindow(
  store: FixedWindowStore,
  key: string,
  windowMs: number,
  limit: number,
  onLimited: (state: FixedWindowState) => never
) {
  const now = Date.now()
  if (now >= store.nextSweepAt) {
    for (const [entry, state] of store.entries) {
      if (state.resetAt <= now) store.entries.delete(entry)
    }
    store.nextSweepAt = now + sweepIntervalMs
  }

  const state = store.entries.get(key)
  if (state && state.resetAt > now) {
    if (state.count >= limit) onLimited(state)
    state.count += 1
    return
  }

  // Reusing an expired key is safe. Evicting a live key would reset its quota.
  if (!state && store.entries.size >= store.maxEntries) {
    onLimited({ count: limit, resetAt: store.nextSweepAt })
  }
  store.entries.set(key, { count: 1, resetAt: now + windowMs })
}

export function clearFixedWindow(store: FixedWindowStore, key: string) {
  store.entries.delete(key)
}

export function retryAfterSeconds(resetAt: number) {
  return Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1)
}
