import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

const imageTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

type GalleryImage = {
  name: string
  path: string
  url: string
  size: number
  type: string
  collection: 'images' | 'memes'
  updatedAt: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const config = useRuntimeConfig()
  const uploadRoot = resolve(config.uploadDir)
  const images: GalleryImage[] = []

  async function walk(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])

    for (const entry of entries) {
      const filepath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(filepath)
        continue
      }

      if (!entry.isFile()) continue

      const extension = extname(entry.name).toLowerCase()
      const type = imageTypes[extension]
      if (!type) continue

      const fileStat = await stat(filepath).catch(() => null)
      if (!fileStat?.isFile()) continue

      const relativePath = relative(uploadRoot, filepath).split(sep).join('/')
      const collection = relativePath === 'memes' || relativePath.startsWith('memes/') ? 'memes' : 'images'
      images.push({
        name: entry.name,
        path: relativePath,
        url: `/uploads/${relativePath}`,
        size: fileStat.size,
        type,
        collection,
        updatedAt: fileStat.mtime.toISOString()
      })
    }
  }

  await walk(uploadRoot)
  images.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return ok(images)
})
