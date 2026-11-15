import { randomUUID } from 'node:crypto'
import type { Role } from '@prisma/client'
import sharp from 'sharp'
import { accountAvatarMaxBytes, accountNameLimit } from '../../../shared/account-profile'
import { badRequest, unauthorized, validationError } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { assertUsableDisplayName } from '../comments/comment-identity.service'
import { publicProfile, publicProfileSelect } from './public-profile'

export async function updateAccountProfile(user: { id: number, role: Role }, input: {
  displayName: string
  removeAvatar: boolean
  image?: Buffer
}) {
  const displayName = input.displayName.trim()
    ? assertUsableDisplayName(input.displayName, user.role === 'ADMIN')
    : null
  if (displayName && Array.from(displayName).length > accountNameLimit) {
    throw validationError(`昵称最多 ${accountNameLimit} 个字符`)
  }
  const image = input.image ? await prepareAvatar(input.image) : null
  return prisma.$transaction(async tx => {
    const updated = await tx.user.updateMany({
      where: { id: user.id, status: 'ACTIVE', role: user.role },
      data: { displayName }
    })
    if (!updated.count) throw unauthorized()

    if (image) {
      const data = { id: randomUUID(), image: new Uint8Array(image) }
      await tx.userAvatar.upsert({ where: { userId: user.id }, update: data, create: { ...data, userId: user.id } })
    } else if (input.removeAvatar) {
      await tx.userAvatar.deleteMany({ where: { userId: user.id } })
    }
    return publicProfile(await tx.user.findUnique({ where: { id: user.id }, select: publicProfileSelect }))
  })
}

async function prepareAvatar(input: Buffer) {
  if (input.length > accountAvatarMaxBytes) throw badRequest('头像图片不能超过 3 MB')
  if (!looksLikeRasterImage(input)) throw badRequest('请选择 JPG、PNG 或 WebP 图片')

  const image = sharp(input, { limitInputPixels: 16_000_000, failOn: 'error' })
  const metadata = await image.metadata().catch(() => null)
  if (!metadata || !['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
    throw badRequest('图片无法读取，请更换一张')
  }
  if ((metadata.pages ?? 1) > 1) throw badRequest('请选择静态头像图片')
  return image.rotate().resize(384, 384, { fit: 'cover' }).webp({ quality: 82 }).toBuffer().catch(() => {
    throw badRequest('图片无法处理，请更换一张')
  })
}

function looksLikeRasterImage(input: Buffer) {
  return input.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    input.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (input.toString('ascii', 0, 4) === 'RIFF' && input.toString('ascii', 8, 12) === 'WEBP')
}
