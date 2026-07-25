import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getResume } from '~~/server/services/resumes/resume.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  return ok(await getResume(user.id, id))
})
