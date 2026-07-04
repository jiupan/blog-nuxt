import { readdir, stat } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'
import { ok } from '~~/server/utils/response'

const imageTypes = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

type PublicMemeImage = {
  name: string
  url: string
  updatedAt: string
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const uploadRoot = resolve(config.uploadDir)
  const memeRoot = join(uploadRoot, 'memes')
  const images: PublicMemeImage[] = []

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
      if (!imageTypes.has(extension)) continue

      const fileStat = await stat(filepath).catch(() => null)
      if (!fileStat?.isFile()) continue

      const relativePath = relative(uploadRoot, filepath).split(sep).join('/')
      images.push({
        name: entry.name,
        url: `/uploads/${relativePath}`,
        updatedAt: fileStat.mtime.toISOString()
      })
    }
  }

  await walk(memeRoot)
  images.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return ok(images)
})
