import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { badRequest } from '~~/server/utils/api-error'
import { parseUploadPurpose, uploadImage } from '~~/server/services/media/upload.service'
import { requireMemeGroup } from '~~/server/services/media/gallery.service'
import { updateGalleryMetadata } from '~~/server/services/media/gallery-metadata'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const files = await readMultipartFormData(event)
  const file = files?.find((item) => item.name === 'file')

  if (!file?.data) {
    throw badRequest('请选择要上传的文件')
  }

  const query = getQuery(event)
  const purpose = parseUploadPurpose(query.purpose)
  const memeGroup = typeof query.memeGroup === 'string' ? query.memeGroup : undefined
  if (purpose === 'meme' && memeGroup) await requireMemeGroup(memeGroup)
  const image = await uploadImage(file.data, purpose, memeGroup)
  await updateGalleryMetadata([image.url.replace(/^\/uploads\//, '')], {
    displayName: file.filename?.split(/[\\/]/).pop()?.slice(0, 200),
    ...(purpose === 'cover' && query.randomPool === 'true' ? { inRandomPool: true, randomEnabled: true } : {})
  })
  return ok(image)
})
