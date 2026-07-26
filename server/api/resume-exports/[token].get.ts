import { notFound } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { getResumeExportPayload } from '~~/server/services/resume-export/resume-export-token.service'

export default defineEventHandler((event) => {
  const token = getRouterParam(event, 'token') || ''
  const payload = getResumeExportPayload(token)
  if (!payload) throw notFound('导出页面已过期')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return ok(payload)
})
