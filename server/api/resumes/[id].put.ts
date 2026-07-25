import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { saveResumeSchema } from '~~/server/services/resumes/resume.schema'
import { updateResume } from '~~/server/services/resumes/resume.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  const input = saveResumeSchema.parse(await readBody(event))
  return ok(await updateResume(user.id, id, input), '简历已保存')
})
