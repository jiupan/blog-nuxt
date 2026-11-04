import { getQuery, readMultipartFormData, setResponseStatus } from 'h3'
import { z } from 'zod'
import { requireAgentToken } from '../../services/agent/agent-key.service'
import { uploadImage } from '../../services/media/upload.service'
import { badRequest, parseRequest } from '../../utils/api-error'
import { ok } from '../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAgentToken(event)
  const { purpose } = parseRequest(
    z.object({ purpose: z.enum(['image', 'cover']).default('image') }).strict(),
    getQuery(event)
  )
  const parts = await readMultipartFormData(event)
  const file = parts?.[0]
  if (parts?.length !== 1 || file?.name !== 'file' || !file.filename || !file.data.length) {
    throw badRequest('请使用 multipart/form-data，每次通过 file 字段上传一张图片')
  }
  const originalName = file.filename.split(/[\\/]/).pop()!.slice(0, 255)
  const result = await uploadImage(file.data, purpose, undefined, originalName)
  const url = encodeURI(result.url)
  const origin = (
    process.env.NUXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    useRuntimeConfig(event).public.siteUrl
  ).replace(/\/$/, '')
  setResponseStatus(event, 200)
  return ok(
    {
      ...result,
      url,
      absoluteUrl: `${origin}${url}`,
      originalName,
      collection: purpose === 'cover' ? 'covers' : 'images'
    },
    '图片已存入图库'
  )
})
