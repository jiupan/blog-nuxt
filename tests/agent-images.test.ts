import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createApp,
  defineEventHandler,
  getRouterParams,
  setHeader,
  createError,
  getHeader,
  setResponseStatus,
  sendStream,
  toWebHandler
} from 'h3'
import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('../server/services/agent/agent-key.service', () => ({ requireAgentToken: auth }))
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('getRouterParams', getRouterParams)
vi.stubGlobal('setHeader', setHeader)
vi.stubGlobal('createError', createError)
vi.stubGlobal('getHeader', getHeader)
vi.stubGlobal('setResponseStatus', setResponseStatus)
vi.stubGlobal('sendStream', sendStream)
const root = await mkdtemp(join(tmpdir(), 'blog-agent-images-'))
vi.stubGlobal('useRuntimeConfig', () => ({
  uploadDir: root,
  public: { siteUrl: 'https://blog.example' }
}))
const { uploadImage } = await import('../server/services/media/upload.service')
const { agentPostSchema } = await import('../server/services/agent/agent.schema')
const { renderMarkdown } = await import('../server/utils/markdown')
const route = (await import('../server/api/agent/images.post')).default
const serve = (await import('../server/routes/uploads/[...path].get')).default
const handler = toWebHandler(
  createApp()
    .use('/api/agent/images', route)
    .use(
      '/uploads',
      defineEventHandler((event) => {
        event.context.params = {
          path: new URL(event.node.req.url!, 'http://test').pathname.replace(/^\/uploads\//, '')
        }
        return serve(event)
      })
    )
)
const png = await sharp({ create: { width: 24, height: 16, channels: 3, background: '#6554c0' } })
  .png()
  .toBuffer()
const request = (form: FormData, query = '') =>
  handler(
    new Request(`https://blog.example/api/agent/images${query}`, { method: 'POST', body: form })
  )
const formFor = (data = png, name = 'diagram.png', type = 'image/png') => {
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(data)], { type }), name)
  return form
}
beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ keyId: 1 })
})

describe('Agent local image uploads', () => {
  it('uploads to the gallery, preserves a searchable filename, and returns a working encoded URL', async () => {
    const response = await request(formFor(png, '流程 图.png'))
    expect(response.status).toBe(200)
    const { data } = await response.json()
    expect(data.collection).toBe('images')
    expect(data.originalName).toBe('流程 图.png')
    expect(decodeURI(data.url)).toMatch(/\/uploads\/\d{4}\/\d{2}\/流程-图-[a-f0-9]{64}\.webp$/)
    expect(() =>
      agentPostSchema.parse({
        requestId: 'with-cover',
        title: 'Title',
        content: 'Body',
        cover: data.url
      })
    ).not.toThrow()
    expect((await renderMarkdown(`![流程示意图](${data.url})`)).html).toContain(`src="${data.url}"`)
    const image = await handler(new Request(`https://blog.example${data.url}`))
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/webp')
    expect(await sharp(Buffer.from(await image.arrayBuffer())).metadata()).toMatchObject({
      format: 'webp',
      width: 24,
      height: 16
    })
  })
  it('stores covers in their separate collection and reuses matching repeated uploads', async () => {
    const first = (await (await request(formFor(), '?purpose=cover')).json()).data
    const second = (await (await request(formFor(), '?purpose=cover')).json()).data
    expect(first.url).toBe(second.url)
    expect(first.collection).toBe('covers')
    expect(first.url).toContain('/uploads/covers/')
    const filename = first.url.split('/').pop()
    const folder = join(root, ...first.url.replace('/uploads/', '').split('/').slice(0, -1))
    expect((await readdir(folder)).filter((name) => name === filename)).toHaveLength(1)
  })
  it('resizes and serves animated WebP with all frames, delays and the loop count', async () => {
    const width = 1700
    const pageHeight = 17
    const frameSize = width * pageHeight * 3
    const frames = Buffer.concat([Buffer.alloc(frameSize, 40), Buffer.alloc(frameSize, 200)])
    const delay = [120, 230]
    const input = await sharp(frames, { raw: { width, height: pageHeight * 2, pageHeight, channels: 3 } })
      .withMetadata({ orientation: 6 })
      .webp({ delay, loop: 2 })
      .toBuffer()

    const upload = await request(formFor(input, 'animation.webp', 'image/webp'))
    expect(upload.status).toBe(200)
    const { data } = await upload.json()
    const image = await handler(new Request(data.absoluteUrl))
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/webp')
    expect(await sharp(Buffer.from(await image.arrayBuffer()), { animated: true }).metadata()).toMatchObject({
      format: 'webp', width: 1600, pageHeight: 16, pages: 2, delay, loop: 2, orientation: 6
    })

    const favicon = await uploadImage(input, 'favicon')
    const faviconImage = await handler(new Request(`https://blog.example${favicon.url}`))
    const faviconMetadata = await sharp(Buffer.from(await faviconImage.arrayBuffer())).metadata()
    expect(faviconMetadata).toMatchObject({ format: 'png', height: 512 })
    expect(faviconMetadata.pages ?? 1).toBe(1)
  })
  it.each(['avatar', 'meme', 'favicon', 'other'])(
    'rejects unsupported upload purpose %s',
    async (purpose) => {
      expect((await request(formFor(), `?purpose=${purpose}`)).status).toBe(400)
    }
  )
  it('requires one file, rejects extra fields and checks authentication first', async () => {
    expect((await request(new FormData())).status).toBe(400)
    const extra = formFor()
    extra.append('caption', 'extra')
    expect((await request(extra)).status).toBe(400)
    const wrong = new FormData()
    wrong.append('image', new Blob([new Uint8Array(png)]), 'x.png')
    expect((await request(wrong)).status).toBe(400)
    auth.mockRejectedValue(createError({ statusCode: 401 }))
    expect((await request(formFor())).status).toBe(401)
  })
  it.each([
    Buffer.from('not an image'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>bad</script></svg>'),
    Buffer.from('GIF89a')
  ])(
    'validates actual file bytes rather than trusting the provided image MIME type',
    async (bytes) => {
      expect((await request(formFor(bytes))).status).toBe(400)
    }
  )
  it('rejects oversized files and preserves existing admin upload behavior', async () => {
    await expect(uploadImage(Buffer.alloc(50 * 1024 * 1024 + 1), 'image')).rejects.toMatchObject({
      statusCode: 400
    })
    const first = await uploadImage(png, 'image')
    const second = await uploadImage(png, 'image')
    expect(first.url).not.toBe(second.url)
    expect(first.url).toMatch(/[a-f0-9-]{36}\.webp$/)
    const stored = await readFile(join(root, first.url.replace('/uploads/', '')))
    expect((await sharp(stored).metadata()).format).toBe('webp')
  })
  it('keeps source filenames and encoded paths inside the upload directory', async () => {
    const result = await uploadImage(png, 'image', undefined, '../../evil.png')
    expect(result.url).toMatch(/\/evil-[a-f0-9]{64}\.webp$/)
    const traversal = await handler(
      new Request('https://blog.example/uploads/%2e%2e%2foutside.png')
    )
    expect(traversal.status).toBe(404)
  })
})
