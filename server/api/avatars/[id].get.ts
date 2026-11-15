import { getHeader, getRouterParam, sendNoContent, setResponseHeaders } from 'h3'
import { notFound } from '~~/server/utils/api-error'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw notFound('头像不存在')
  const avatar = await prisma.userAvatar.findUnique({ where: { id }, select: { image: true } })
  if (!avatar) throw notFound('头像不存在')

  const etag = `"${id}"`
  setResponseHeaders(event, {
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'ETag': etag,
    'X-Content-Type-Options': 'nosniff'
  })
  if (getHeader(event, 'if-none-match') === etag) return sendNoContent(event, 304)
  return Buffer.from(avatar.image)
})
