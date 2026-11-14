import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ post: { findMany: vi.fn() }, setting: { findMany: vi.fn() }, bookmark: { findMany: vi.fn() } }))
vi.mock('../server/utils/prisma', () => ({ prisma: db }))
const gallery = await import('../server/services/media/gallery.service')
const { updateGalleryMetadata, readGalleryMetadata } = await import('../server/services/media/gallery-metadata')
const { uploadImage } = await import('../server/services/media/upload.service')
let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'blog-gallery-'))
  vi.stubGlobal('useRuntimeConfig', () => ({ uploadDir: root }))
  db.post.findMany.mockResolvedValue([])
  db.setting.findMany.mockResolvedValue([])
  db.bookmark.findMany.mockResolvedValue([])
})
afterEach(async () => {
  if (!resolve(root).startsWith(resolve(tmpdir()) + sep + 'blog-gallery-')) throw Error('Unexpected test directory')
  await rm(root, { recursive: true, force: true })
  vi.unstubAllGlobals()
})
async function file(path: string) {
  const target = join(root, path)
  await mkdir(resolve(target, '..'), { recursive: true })
  await writeFile(target, 'fixture')
}

it('preserves legacy random covers, while article-specific cover uploads stay out of the pool', async () => {
  await file('covers/legacy.webp')
  const buffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } }).png().toBuffer()
  const uploaded = await uploadImage(buffer, 'cover')
  expect(uploaded.url).toContain('/uploads/covers/')
  const images = await gallery.listGalleryImages()
  expect(images.find(item => item.url === uploaded.url)?.collection).toBe('images')
  expect(await gallery.getRandomCoverUrl()).toBe('/uploads/covers/legacy.webp')
})

it('disables random selection without removing the file or changing its URL', async () => {
  await file('covers/legacy.webp')
  await gallery.updateGalleryImages(['covers/legacy.webp'], { randomEnabled: false })
  expect(await gallery.getRandomCoverUrl()).toBeNull()
  expect((await gallery.listGalleryImages())[0]).toMatchObject({ collection: 'covers', randomEnabled: false, url: '/uploads/covers/legacy.webp' })
  await access(join(root, 'covers/legacy.webp'))
})

it('avoids covers used by recent articles when another enabled cover is available', async () => {
  await file('covers/a.webp'); await file('covers/b.webp'); await file('covers/c.webp')
  db.post.findMany.mockResolvedValue([{ cover: '/uploads/covers/a.webp' }, { cover: '/uploads/covers/b.webp' }])
  expect(await gallery.getRandomCoverUrl()).toBe('/uploads/covers/c.webp')
})

it('reuses the least recently used cover when all covers have been used, and supports a single-image pool', async () => {
  await file('covers/a.webp'); await file('covers/b.webp')
  db.post.findMany.mockResolvedValue([{ cover: '/uploads/covers/a.webp' }, { cover: '/uploads/covers/b.webp' }])
  expect(await gallery.getRandomCoverUrl()).toBe('/uploads/covers/b.webp')
  await gallery.updateGalleryImages(['covers/b.webp'], { randomEnabled: false })
  expect(await gallery.getRandomCoverUrl()).toBe('/uploads/covers/a.webp')
})

it('moves memes and deletes populated groups without changing URLs or deleting images', async () => {
  const group = await gallery.createMemeGroup('cats')
  await file('memes/original/2026/cat.gif')
  const path = 'memes/original/2026/cat.gif'
  expect(await gallery.listPublicMemeImages()).toMatchObject([{ url: '/uploads/' + path, memeGroup: 'original' }])
  await gallery.updateGalleryImages([path], { memeGroup: group.id })
  const grouped = await gallery.listPublicMemeImages()
  expect(grouped).toMatchObject([{ url: '/uploads/' + path, memeGroup: group.id }])
  expect(await gallery.listPublicMemeImages(group.id)).toEqual(grouped)
  await gallery.deleteMemeGroup(group.id)
  expect(await gallery.listPublicMemeImages(group.id)).toHaveLength(0)
  const ungrouped = await gallery.listPublicMemeImages()
  expect(ungrouped).toMatchObject([{ url: '/uploads/' + path, memeGroup: null }])
  expect(await gallery.listPublicMemeImages('ungrouped')).toEqual(ungrouped)
  await access(join(root, path))
})

it('blocks deletion of referenced assets and internal metadata', async () => {
  await file('covers/used.webp')
  db.post.findMany.mockResolvedValue([{ id: 1, title: 'Draft', slug: 'draft', cover: '/uploads/covers/used.webp' }])
  await expect(gallery.deleteGalleryImage('covers/used.webp')).rejects.toMatchObject({ statusCode: 409 })
  await access(join(root, 'covers/used.webp'))
  db.post.findMany.mockResolvedValue([])
  db.bookmark.findMany.mockResolvedValue([{ id: 2, title: '友站' }])
  await expect(gallery.deleteGalleryImage('covers/used.webp')).rejects.toMatchObject({ statusCode: 409 })
  await access(join(root, 'covers/used.webp'))
  await updateGalleryMetadata(['covers/used.webp'], { randomEnabled: false })
  await expect(gallery.deleteGalleryImage('.gallery.json')).rejects.toMatchObject({ statusCode: 404 })
})

it('preserves concurrent metadata updates and rejects invalid group/pool operations', async () => {
  await file('a.webp'); await file('memes/cat.gif')
  await Promise.all([
    updateGalleryMetadata(['a.webp'], { displayName: '海边' }),
    updateGalleryMetadata(['memes/cat.gif'], { memeGroup: null })
  ])
  expect(await readGalleryMetadata()).toMatchObject({ 'a.webp': { displayName: '海边' }, 'memes/cat.gif': { memeGroup: null } })
  await expect(gallery.updateGalleryImages(['a.webp'], { memeGroup: 'missing' })).rejects.toThrow()
  await expect(gallery.updateGalleryImages(['memes/cat.gif'], { inRandomPool: true })).rejects.toThrow()
  expect(await readFile(join(root, 'a.webp'), 'utf8')).toBe('fixture')
})
