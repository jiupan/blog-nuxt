import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual
} from 'node:crypto'
import { conflict, fail } from '../../utils/api-error'

export function hashAgentToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function encryptionKey(secret: string) {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw fail({
      statusCode: 503,
      code: 'AGENT_KEY_ENCRYPTION_UNAVAILABLE',
      statusMessage: '密钥加密配置不可用，请检查服务器配置'
    })
  }
  return Buffer.from(hkdfSync('sha256', secret, 'jiupan-blog', 'agent-api-key:v1', 32))
}

export function resolveAgentEncryptionSecret(sessionPassword: string) {
  return (
    process.env.AGENT_TOKEN_ENCRYPTION_KEY || process.env.NUXT_SESSION_PASSWORD || sessionPassword
  )
}

export function encryptAgentToken(token: string, secret: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv)
  cipher.setAAD(Buffer.from(`agent-key:v1:${hashAgentToken(token)}`))
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return [
    'v1',
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    cipher.getAuthTag().toString('base64url')
  ].join('.')
}

export function decryptAgentToken(encrypted: string, expectedHash: string, secret: string) {
  const key = encryptionKey(secret)
  try {
    const [version, nonce, body, signature, extra] = encrypted.split('.')
    if (version !== 'v1' || !nonce || !body || !signature || extra !== undefined)
      throw new Error('Invalid envelope')
    const iv = Buffer.from(nonce, 'base64url')
    const tag = Buffer.from(signature, 'base64url')
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid envelope')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAAD(Buffer.from(`agent-key:v1:${expectedHash}`))
    decipher.setAuthTag(tag)
    const token = Buffer.concat([
      decipher.update(Buffer.from(body, 'base64url')),
      decipher.final()
    ]).toString('utf8')
    if (
      !/^blog_agent_[A-Za-z0-9_-]{43}$/.test(token) ||
      !timingSafeEqual(Buffer.from(hashAgentToken(token), 'hex'), Buffer.from(expectedHash, 'hex'))
    )
      throw new Error('Invalid token')
    return token
  } catch {
    throw conflict('无法解密该密钥，可能是服务器加密配置已变更，请创建新密钥')
  }
}
