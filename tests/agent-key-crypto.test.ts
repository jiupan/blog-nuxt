import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  decryptAgentToken,
  encryptAgentToken,
  hashAgentToken,
  resolveAgentEncryptionSecret
} from '../server/services/agent/agent-key-crypto'

const token = `blog_agent_${'z'.repeat(43)}`
const secret = 'a-stable-server-side-secret-over-32-characters'
afterEach(() => vi.unstubAllEnvs())

describe('recoverable Agent credentials', () => {
  it('round-trips with distinct random nonces and ciphertexts', () => {
    const first = encryptAgentToken(token, secret)
    const second = encryptAgentToken(token, secret)
    expect(first).not.toBe(second)
    expect(first).not.toContain(token)
    expect(decryptAgentToken(first, hashAgentToken(token), secret)).toBe(token)
    expect(decryptAgentToken(second, hashAgentToken(token), secret)).toBe(token)
  })
  it('binds the ciphertext to its original key digest', () => {
    const encrypted = encryptAgentToken(token, secret)
    expect(() =>
      decryptAgentToken(encrypted, hashAgentToken(`blog_agent_${'a'.repeat(43)}`), secret)
    ).toThrow()
  })
  it('rejects tampering, malformed envelopes and changed server keys', () => {
    const encrypted = encryptAgentToken(token, secret)
    const pieces = encrypted.split('.')
    pieces[2] = `_${pieces[2]!.slice(1)}`
    for (const value of [
      pieces.join('.'),
      'v1.bad.bad.bad',
      `v2.${encrypted.slice(3)}`,
      `${encrypted}.extra`
    ]) {
      expect(() => decryptAgentToken(value, hashAgentToken(token), secret)).toThrow()
    }
    expect(() => decryptAgentToken(encrypted, hashAgentToken(token), `${secret}-changed`)).toThrow()
  })
  it('rejects missing or short encryption settings before storing credentials', () => {
    for (const value of ['', 'short']) expect(() => encryptAgentToken(token, value)).toThrow()
  })
  it('prefers a dedicated key, then the environment session secret, then the runtime setting', () => {
    vi.stubEnv('AGENT_TOKEN_ENCRYPTION_KEY', 'dedicated')
    vi.stubEnv('NUXT_SESSION_PASSWORD', 'session')
    expect(resolveAgentEncryptionSecret('runtime')).toBe('dedicated')
    vi.stubEnv('AGENT_TOKEN_ENCRYPTION_KEY', '')
    expect(resolveAgentEncryptionSecret('runtime')).toBe('session')
    vi.stubEnv('NUXT_SESSION_PASSWORD', '')
    expect(resolveAgentEncryptionSecret('runtime')).toBe('runtime')
  })
})
