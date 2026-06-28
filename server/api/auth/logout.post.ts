import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return ok(true)
})
