import { readdir, stat, unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { notFound } from '~~/server/utils/api-error'
import { resolveUploadPath, resolveUploadRoot, toUploadRelativePath, toUploadUrl } from './path-safety'

const imageTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

const publicMemeExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export type GalleryImage = {
  name: string
  path: string
  url: string
  size: number
  type: string
  collection: 'images' | 'covers' | 'memes'
  updatedAt: string
}

export type PublicMemeImage = {
  name: string
  url: string
  updatedAt: string
}

export async function listGalleryImages(): Promise<GalleryImage[]> {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const images: GalleryImage[] = []

  await walkMediaFiles(uploadRoot, uploadRoot, async ({ filepath, name, extension }) => {
    const type = imageTypes[extension]
    if (!type) return

    const fileStat = await stat(filepath).catch(() => null)
    if (!fileStat?.isFile()) return

    const relativePath = toUploadRelativePath(uploadRoot, filepath)
    if (!relativePath) return

    images.push({
      name,
      path: relativePath,
      url: toUploadUrl(relativePath),
      size: fileStat.size,
      type,
      collection: resolveCollection(relativePath),
      updatedAt: fileStat.mtime.toISOString()
    })
  })

  return sortByUpdatedAt(images)
}

export async function listPublicMemeImages(): Promise<PublicMemeImage[]> {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const memeRoot = join(uploadRoot, 'memes')
  const images: PublicMemeImage[] = []

  await walkMediaFiles(uploadRoot, memeRoot, async ({ filepath, name, extension }) => {
    if (!publicMemeExtensions.has(extension)) return

    const fileStat = await stat(filepath).catch(() => null)
    if (!fileStat?.isFile()) return

    const relativePath = toUploadRelativePath(uploadRoot, filepath)
    if (!relativePath) return

    images.push({
      name,
      url: toUploadUrl(relativePath),
      updatedAt: fileStat.mtime.toISOString()
    })
  })

  return sortByUpdatedAt(images)
}

export async function getRandomCoverUrl(): Promise<string | null> {
  const covers = (await listGalleryImages()).filter(image => image.collection === 'covers')
  if (!covers.length) return null
  return covers[Math.floor(Math.random() * covers.length)]?.url || null
}

export async function deleteGalleryImage(requestedPath: string) {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const { filepath, relativePath } = resolveUploadPath(uploadRoot, requestedPath)

  await unlink(filepath).catch(() => {
    throw notFound('图片不存在或已删除')
  })

  return {
    path: relativePath
  }
}

async function walkMediaFiles(uploadRoot: string, dir: string, visitor: (file: { filepath: string, name: string, extension: string }) => Promise<void>) {
  const rootRelativePath = toUploadRelativePath(uploadRoot, dir)
  if (dir !== uploadRoot && !rootRelativePath) return

  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    const filepath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkMediaFiles(uploadRoot, filepath, visitor)
      continue
    }

    if (!entry.isFile()) continue

    await visitor({
      filepath,
      name: entry.name,
      extension: extname(entry.name).toLowerCase()
    })
  }
}

function resolveCollection(relativePath: string): GalleryImage['collection'] {
  if (relativePath === 'memes' || relativePath.startsWith('memes/')) return 'memes'
  if (relativePath === 'covers' || relativePath.startsWith('covers/')) return 'covers'
  return 'images'
}

function sortByUpdatedAt<T extends { updatedAt: string }>(items: T[]) {
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}
