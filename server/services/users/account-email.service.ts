import { createHash, randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '../../utils/prisma'
import { badRequest, conflict, fail, rateLimited } from '../../utils/api-error'
import { revokeUserSessions } from '../security/account-session.service'
import { withSerializableRetry } from '../../utils/serializable'
import { consumeFixedWindow, createFixedWindowStore, getClientIp } from '../security/rate-limit.service'

export type AccountEmailPurpose = 'VERIFY' | 'RESET' | 'INVITE'
const templates = {
  VERIFY: { title: '验证邮箱', path: '/account/verify', minutes: 30 },
  RESET: { title: '重置密码', path: '/account/reset', minutes: 30 },
  INVITE: { title: '设置账号密码', path: '/account/invite', minutes: 1440 }
} as const
const mailWindows = createFixedWindowStore()

export const accountTokenPattern = /^[A-Za-z0-9_-]{43}$/

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function accountMailAvailable(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.accountMailApiKey || !config.accountMailFrom) return false
  try {
    const url = new URL(config.public.siteUrl)
    return url.protocol === 'https:' ||
      (process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  } catch {
    return false
  }
}

export function requireAccountMail(event: H3Event) {
  if (!accountMailAvailable(event)) {
    throw fail({ code: 'ACCOUNT_EMAIL_UNAVAILABLE', statusCode: 503, statusMessage: '邮件服务暂不可用，请稍后再试' })
  }
}

export function limitAccountMail(event: H3Event, action: string, userId?: number) {
  const limited = () => { throw rateLimited('操作过于频繁，请稍后再试') }
  consumeFixedWindow(mailWindows, `${action}:ip:${getClientIp(event)}`, 60 * 60_000, 15, limited)
  if (userId !== undefined) consumeFixedWindow(mailWindows, `${action}:user:${userId}`, 15 * 60_000, 3, limited)
}

export async function sendAccountEmail(event: H3Event, userId: number, email: string, purpose: AccountEmailPurpose) {
  requireAccountMail(event)
  consumeFixedWindow(mailWindows, `email:${tokenHash(email.toLowerCase())}`, 60 * 60_000, 5, () => {
    throw rateLimited('邮件发送过于频繁，请稍后再试')
  })
  const config = useRuntimeConfig(event)
  const { title, path, minutes } = templates[purpose]
  const token = randomBytes(32).toString('base64url')
  const digest = tokenHash(token)
  const record = { tokenHash: digest, email, expiresAt: new Date(Date.now() + minutes * 60_000) }
  await prisma.accountEmailToken.upsert({
    where: { userId_purpose: { userId, purpose } },
    update: record,
    create: { userId, purpose, ...record }
  })

  const url = new URL(path, config.public.siteUrl)
  url.hash = new URLSearchParams({ token }).toString()
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accountMailApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.accountMailFrom,
        to: [email],
        subject: title,
        text: `请打开以下链接${title}。链接将在 ${minutes} 分钟后过期。\n\n${url.href}`
      }),
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) throw new Error('Mail provider rejected request')
  } catch {
    await prisma.accountEmailToken.deleteMany({ where: { tokenHash: digest } })
    throw fail({ code: 'ACCOUNT_EMAIL_UNAVAILABLE', statusCode: 503, statusMessage: '邮件发送失败，请稍后重试' })
  }
}

const unusableLink = () => badRequest('链接无效或已过期，请重新申请')

export async function applyAccountEmailToken(token: string, purpose: AccountEmailPurpose, passwordHash?: string) {
  if (purpose !== 'VERIFY' && !passwordHash) throw unusableLink()
  try {
    await withSerializableRetry(async tx => {
      const record = await tx.accountEmailToken.findUnique({
        where: { tokenHash: tokenHash(token) }, include: { user: true }
      })
      if (!record || record.purpose !== purpose || record.expiresAt <= new Date() || record.user.status !== 'ACTIVE') {
        throw unusableLink()
      }
      const { user, email } = record
      if (purpose === 'RESET') {
        if (!user.emailVerifiedAt || user.email !== email) throw unusableLink()
      } else if ((user.pendingEmail ?? user.email) !== email) {
        throw unusableLink()
      }

      const claimed = await tx.accountEmailToken.deleteMany({ where: { tokenHash: record.tokenHash, expiresAt: { gt: new Date() } } })
      if (claimed.count !== 1) throw unusableLink()

      // Legacy, unverified emails permit password login until their owner verifies
      // the address. They never authorize recovery or block proof of ownership.
      if (purpose !== 'RESET') {
        await tx.user.updateMany({
          where: { id: { not: user.id }, email, emailVerifiedAt: null },
          data: { email: null }
        })
      }
      const updated = await tx.user.updateMany({
        where: { id: user.id, status: 'ACTIVE', email: user.email, pendingEmail: user.pendingEmail, passwordHash: user.passwordHash },
        data: {
          ...(purpose === 'RESET' ? {} : { email, pendingEmail: null, emailVerifiedAt: new Date() }),
          ...(passwordHash ? { passwordHash, pendingEmail: null } : {})
        }
      })
      if (updated.count !== 1) throw unusableLink()

      if (passwordHash || (user.emailVerifiedAt && user.email !== email)) {
        await revokeUserSessions(user.id, tx)
        await tx.accountEmailToken.deleteMany({ where: { userId: user.id } })
      }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw conflict('该邮箱已绑定其他账号')
    throw error
  }
}
