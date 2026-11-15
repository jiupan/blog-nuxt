import { createError, getHeader } from 'h3'
import { accountAvatarMaxBytes } from '~~/shared/account-profile'
import { updateAccountProfile } from '~~/server/services/users/account-profile.service'
import { consumeFixedWindow, createFixedWindowStore } from '~~/server/services/security/rate-limit.service'
import { badRequest, rateLimited } from '~~/server/utils/api-error'
import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

const editWindows = createFixedWindowStore()
const maxFormBytes = accountAvatarMaxBytes + 8192

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  consumeFixedWindow(editWindows, user.id.toString(), 60_000, 10, () => {
    throw rateLimited('更改过于频繁，请稍后再试')
  })
  const type = getHeader(event, 'content-type')
  if (!type?.startsWith('multipart/form-data;')) throw badRequest('资料表单不完整，请重新保存')

  let size = 0
  const chunks: Buffer[] = []
  const request = event.node.req
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const bytes = chunk as Buffer
    size += bytes.length
    if (size > maxFormBytes) {
      request.resume()
      throw createError({ statusCode: 413, message: '头像图片不能超过 3 MB' })
    }
    chunks.push(bytes)
  }
  const body = new Uint8Array(Buffer.concat(chunks, size))
  const form = await new Response(body, { headers: { 'content-type': type } }).formData().catch(() => {
    throw badRequest('资料表单不完整，请重新保存')
  })
  const displayName = form.get('displayName')
  const avatar = form.get('avatar')
  const removeAvatar = form.get('removeAvatar') === 'true'
  if (typeof displayName !== 'string' || displayName.length > 128 || typeof avatar === 'string' || (avatar && removeAvatar)) {
    throw badRequest('资料表单不完整，请重新保存')
  }
  const image = avatar ? Buffer.from(await avatar.arrayBuffer()) : undefined
  return ok(await updateAccountProfile(user, { displayName, removeAvatar, image }))
})
