import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { listPublicMemeImages } from '~~/server/services/media/gallery.service'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'public-media-index')
  const group = getQuery(event).group
  return ok(await listPublicMemeImages(typeof group === 'string' && group ? group : undefined))
})
