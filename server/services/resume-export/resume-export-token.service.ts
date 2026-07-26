import { randomBytes } from 'node:crypto'
import type { SaveResumeInput } from '../resumes/resume.schema'

type ExportPayload = {
  resume: SaveResumeInput
  expiresAt: number
}

type ExportTokenState = {
  payloads: Map<string, ExportPayload>
}

const globalForExportTokens = globalThis as typeof globalThis & {
  __resumeExportTokens?: ExportTokenState
}

const state = globalForExportTokens.__resumeExportTokens ?? {
  payloads: new Map<string, ExportPayload>()
}

globalForExportTokens.__resumeExportTokens = state

function pruneExpiredTokens() {
  const now = Date.now()
  for (const [token, payload] of state.payloads) {
    if (payload.expiresAt <= now) state.payloads.delete(token)
  }
}

export function createResumeExportToken(resume: SaveResumeInput) {
  pruneExpiredTokens()
  const token = randomBytes(32).toString('base64url')
  state.payloads.set(token, {
    resume,
    expiresAt: Date.now() + 60_000
  })
  return token
}

export function getResumeExportPayload(token: string) {
  pruneExpiredTokens()
  return state.payloads.get(token)?.resume ?? null
}

export function deleteResumeExportToken(token: string) {
  state.payloads.delete(token)
}
