import { ok } from '~~/server/utils/response'
import { assertSameOrigin } from '~~/server/utils/origin'
import {
  ensureGuestCredential,
  resolveSessionAccount
} from '~~/server/services/comments/comment-identity.service'

/**
 * 建立或复用访客凭证。
 *
 * 凭证只写 HttpOnly Cookie，响应里不回传明文 —— 前端拿到的只有昵称，
 * 拿不到令牌也就无法伪造别人的访客身份。
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)

  const credential = ensureGuestCredential(event)
  const account = await resolveSessionAccount(event)

  return ok({
    guest: {
      hasCredential: true,
      displayName: credential.nickname
    },
    account: account ? { id: account.id, username: account.username } : null
  })
})
