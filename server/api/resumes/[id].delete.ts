import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { deleteResume } from '~~/server/services/resumes/resume.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  await deleteResume(user.id, id)
  return ok(null, '简历已删除')
})
