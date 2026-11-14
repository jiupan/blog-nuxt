import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { prisma } from '../../utils/prisma'
import { readGalleryMetadata, updateGalleryMetadata } from './gallery-metadata'
import { badRequest, conflict, notFound } from '~~/server/utils/api-error'
import { resolveUploadPath, resolveUploadRoot, toUploadRelativePath, toUploadUrl } from './path-safety'
import type { PublicMemeImagePayload } from '~~/types/api'

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
  randomEnabled?: boolean
  filename?: string
}

export type MemeGroup = { id: string, name: string }
const memeGroupsFilename = '.groups.json'

export async function listGalleryImages(): Promise<GalleryImage[]> {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const images: GalleryImage[] = []
  const metadata = await readGalleryMetadata()

  await walkMediaFiles(uploadRoot, uploadRoot, async ({ filepath, name, extension }) => {
    const type = imageTypes[extension]
    if (!type) return

    const fileStat = await stat(filepath).catch(() => null)
    if (!fileStat?.isFile()) return

    const relativePath = toUploadRelativePath(uploadRoot, filepath)
    if (!relativePath) return

    images.push({
      name: metadata[relativePath]?.displayName || name,
      filename: name,
      randomEnabled: metadata[relativePath]?.randomEnabled !== false,
      path: relativePath,
      url: toUploadUrl(relativePath),
      size: fileStat.size,
      type,
      collection: metadata[relativePath]?.inRandomPool === true ? 'covers' : metadata[relativePath]?.inRandomPool === false ? 'images' : resolveCollection(relativePath),
      memeGroup: metadata[relativePath]?.memeGroup === null ? undefined : metadata[relativePath]?.memeGroup ?? resolveMemeGroup(relativePath),
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
  await updateGalleryMetadata(images.filter(image => image.collection === 'memes' && image.memeGroup === id).map(image => image.path), { memeGroup: null })
  await saveMemeGroups(groups.filter(item => item.id !== id))
  return group
}

async function saveMemeGroups(groups: MemeGroup[]) {
  const memeRoot = join(resolveUploadRoot(useRuntimeConfig().uploadDir), 'memes')
  await mkdir(memeRoot, { recursive: true })
  await writeFile(join(memeRoot, memeGroupsFilename), JSON.stringify(groups, null, 2), 'utf8')
}

export async function listPublicMemeImages(memeGroup?: string): Promise<PublicMemeImagePayload[]> {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const memeRoot = join(uploadRoot, 'memes')
  const images: PublicMemeImagePayload[] = []
  const metadata = await readGalleryMetadata()

  await walkMediaFiles(uploadRoot, memeRoot, async ({ filepath, name, extension }) => {
    if (!publicMemeExtensions.has(extension)) return

    const fileStat = await stat(filepath).catch(() => null)
    if (!fileStat?.isFile()) return

    const relativePath = toUploadRelativePath(uploadRoot, filepath)
    if (!relativePath) return
    const storedGroup = metadata[relativePath]?.memeGroup
    const resolvedGroup = storedGroup === undefined ? resolveMemeGroup(relativePath) : storedGroup
    if (memeGroup && (memeGroup === 'ungrouped' ? resolvedGroup : resolvedGroup !== memeGroup)) return

    images.push({
      name,
      url: toUploadUrl(relativePath),
      updatedAt: fileStat.mtime.toISOString(),
      memeGroup: resolvedGroup || null
    })
  })

  return sortByUpdatedAt(images)
}

export async function getRandomCoverUrl(excludePostId?: number): Promise<string | null> {
  const covers = (await listGalleryImages()).filter(image => image.collection === 'covers' && image.randomEnabled !== false)
  if (!covers.length) return null
  const recent = await prisma.post.findMany({
    where: { cover: { not: null }, ...(excludePostId ? { id: { not: excludePostId } } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: Math.max(20, covers.length),
    select: { cover: true }
  })
  // 优先未被近期文章使用的封面；都用过时选最久未用的，仍保留同优先级内的随机性。
  const ranked = covers.map(image => ({ image, age: recent.findIndex(post => post.cover === image.url) }))
  const unused = ranked.filter(item => item.age === -1)
  const oldest = Math.max(...ranked.map(item => item.age))
  const candidates = unused.length ? unused : ranked.filter(item => item.age === oldest)
  return candidates[Math.floor(Math.random() * candidates.length)]?.image.url || null
}

export async function deleteGalleryImage(requestedPath: string) {
  const uploadRoot = resolveUploadRoot(useRuntimeConfig().uploadDir)
  const { filepath, relativePath } = resolveUploadPath(uploadRoot, requestedPath)
  if (!(await listGalleryImages()).some(image => image.path === relativePath)) throw notFound('图片不存在或不可删除')

  const usage = await getGalleryImageUsage(relativePath)
  if (usage.posts.length || usage.settings.length || usage.bookmarks.length) throw conflict('图片仍被文章、站点设置或网站导航引用，请先替换引用')

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

export async function getGalleryImageUsage(requestedPath: string) {
  const { relativePath } = resolveUploadPath(resolveUploadRoot(useRuntimeConfig().uploadDir), requestedPath)
  const url = toUploadUrl(relativePath)
  const [posts, settings, bookmarks] = await Promise.all([
    prisma.post.findMany({ where: { OR: [{ cover: { contains: url } }, { content: { contains: url } }] }, select: { id: true, title: true, slug: true, cover: true } }),
    prisma.setting.findMany({ where: { value: { contains: url } }, select: { key: true } }),
    prisma.bookmark.findMany({ where: { OR: [{ avatar: { contains: url } }, { cover: { contains: url } }] }, select: { id: true, title: true } })
  ])
  return { posts: posts.map(post => ({ id: post.id, title: post.title, slug: post.slug, use: post.cover?.includes(url) ? '封面' : '正文' })), settings: settings.map(item => item.key), bookmarks }
}

export async function updateGalleryImages(paths: string[], changes: { inRandomPool?: boolean, randomEnabled?: boolean, memeGroup?: string | null }) {
  const images = await listGalleryImages()
  if (changes.memeGroup) await requireMemeGroup(changes.memeGroup)
  const normalized = paths.map(path => {
    const relative = resolveUploadPath(resolveUploadRoot(useRuntimeConfig().uploadDir), path).relativePath
    const image = images.find(item => item.path === relative)
    if (!image) throw notFound('图片不存在')
    if (changes.memeGroup !== undefined && image.collection !== 'memes') throw badRequest('只有表情素材可以调整分组')
    if ((changes.inRandomPool !== undefined || changes.randomEnabled !== undefined) && image.collection === 'memes') throw badRequest('表情素材不能加入随机封面池')
    if (changes.inRandomPool && !['.jpg', '.jpeg', '.png', '.webp'].includes(extname(relative).toLowerCase())) throw badRequest('随机封面仅支持 jpg/png/webp 图片')
    return relative
  })
  await updateGalleryMetadata(normalized, changes)
}
