import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { badRequest } from '~~/server/utils/api-error'
import { parseUploadPurpose, uploadImage } from '~~/server/services/media/upload.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const files = await readMultipartFormData(event)
  const file = files?.find((item) => item.name === 'file')

  if (!file?.data) {
    throw badRequest('请选择要上传的图片')
  }

  return ok(await uploadImage(file.data, parseUploadPurpose(getQuery(event).purpose)))
})
