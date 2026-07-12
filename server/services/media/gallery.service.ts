import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
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
  memeGroup?: string
  updatedAt: string
}

export type MemeGroup = { id: string, name: string }
const memeGroupsFilename = '.groups.json'

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
      memeGroup: resolveMemeGroup(relativePath),
      updatedAt: fileStat.mtime.toISOString()
    })
  })

  return sortByUpdatedAt(images)
}

export async function listMemeGroups(): Promise<MemeGroup[]> {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const filepath = join(uploadRoot, 'memes', memeGroupsFilename)
  const content = await readFile(filepath, 'utf8').catch(() => '[]')
  try {
    const value = JSON.parse(content)
    return Array.isArray(value) ? value.filter(group => typeof group?.id === 'string' && typeof group?.name === 'string') : []
  } catch {
    return []
  }
}

export async function createMemeGroup(name: string): Promise<MemeGroup> {
  const normalizedName = name.trim()
  if (!normalizedName || normalizedName.length > 30) throw badRequest('分组名称需为 1 到 30 个字符')
  const groups = await listMemeGroups()
  if (groups.some(group => group.name.toLowerCase() === normalizedName.toLowerCase())) throw badRequest('该表情包分组已存在')
  const base = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group'
  let id = base.slice(0, 48)
  let suffix = 2
  while (groups.some(group => group.id === id)) id = `${base.slice(0, 44)}-${suffix++}`
  const group = { id, name: normalizedName }
  await saveMemeGroups([...groups, group])
  return group
}

export async function requireMemeGroup(id: string) {
  const group = (await listMemeGroups()).find(item => item.id === id)
  if (!group) throw badRequest('表情包分组不存在')
  return group
}

export async function deleteMemeGroup(id: string) {
  const groups = await listMemeGroups()
  const group = groups.find(item => item.id === id)
  if (!group) throw notFound('表情包分组不存在')
  const images = await listGalleryImages()
  if (images.some(image => image.collection === 'memes' && image.memeGroup === id)) throw badRequest('请先删除该分组中的表情包')
  await saveMemeGroups(groups.filter(item => item.id !== id))
  return group
}

async function saveMemeGroups(groups: MemeGroup[]) {
  const memeRoot = join(resolveUploadRoot(useRuntimeConfig().uploadDir), 'memes')
  await mkdir(memeRoot, { recursive: true })
  await writeFile(join(memeRoot, memeGroupsFilename), JSON.stringify(groups, null, 2), 'utf8')
}

export async function listPublicMemeImages(memeGroup?: string): Promise<PublicMemeImage[]> {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const memeRoot = join(uploadRoot, 'memes')
  const images: PublicMemeImage[] = []

  await walkMediaFiles(uploadRoot, memeRoot, async ({ filepath, name, extension }) => {
    if (!publicMemeExtensions.has(extension)) return

    const fileStat = await stat(filepath).catch(() => null)
    if (!fileStat?.isFile()) return

    const relativePath = toUploadRelativePath(uploadRoot, filepath)
    if (!relativePath) return
    if (memeGroup) {
      const resolvedGroup = resolveMemeGroup(relativePath)
      if (memeGroup === 'ungrouped' ? resolvedGroup : resolvedGroup !== memeGroup) return
    }

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

function resolveMemeGroup(relativePath: string) {
  const match = relativePath.match(/^memes\/([^/]+)\//)
  if (!match || /^\d{4}$/.test(match[1]!)) return undefined
  return match[1]
}

function sortByUpdatedAt<T extends { updatedAt: string }>(items: T[]) {
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}
