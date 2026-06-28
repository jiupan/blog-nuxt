import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  return ok({
    user: session.user || null
  })
})
