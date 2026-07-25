import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { saveResumeSchema } from '~~/server/services/resumes/resume.schema'
import { createResume } from '~~/server/services/resumes/resume.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = saveResumeSchema.parse(await readBody(event))
  return ok(await createResume(user.id, input), '简历已创建')
})
