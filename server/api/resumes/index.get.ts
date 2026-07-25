import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { listResumes } from '~~/server/services/resumes/resume.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return ok(await listResumes(user.id))
})
