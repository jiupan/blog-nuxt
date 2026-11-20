import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { collectBookmarkIcon, proposeBookmarkNote } from '../server/services/bookmarks/bookmark-enrichment.service'
import { normalizeSiteIcon } from '../server/services/bookmarks/icon'
import { readPublicResource } from '../server/services/bookmarks/public-resource'

const mocks = vi.hoisted(() => ({ read: vi.fn(), ai: vi.fn(), upload: vi.fn() }))
vi.mock('../server/services/bookmarks/public-resource', async (original) => ({
  ...await original<typeof import('../server/services/bookmarks/public-resource')>(), readPublicResource: mocks.read
}))
vi.mock('../server/services/ai/client', () => ({ requestAiChatJson: mocks.ai }))
vi.mock('../server/services/media/upload.service', () => ({ uploadImage: mocks.upload }))

const url = new URL('https://example.org/articles/guide')
const page = (html: string) => ({ type: 'text/html; charset=utf-8', url, bytes: Buffer.from(html) })
const detailed = '<title>A &amp; B</title><meta property="og:description" content="面向开发者的浏览器性能分析与调试工具"><body><script>SECRET_SCRIPT</script><main>通过性能时间线定位网页加载和渲染问题。</main></body>'
const uploadedUrl = '/uploads/bookmark-icon.png'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.upload.mockResolvedValue({ url: uploadedUrl })
})

describe('bookmark metadata suggestions', () => {
  it('resolves a relative icon and falls back to the root ICO if it cannot be downloaded', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: 'red' } }).png().toBuffer()
    mocks.read.mockResolvedValueOnce(page('<base href="/assets/"><link href="icon.png" rel="shortcut icon">'))
      .mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ bytes: ico(png) })

    expect(await collectBookmarkIcon(url)).toBe(uploadedUrl)
    expect(vi.mocked(readPublicResource).mock.calls.map(([target]) => target.href)).toEqual([
      url.href, 'https://example.org/assets/icon.png', 'https://example.org/favicon.ico'
    ])
    const [stored, purpose] = mocks.upload.mock.calls[0]!
    expect(purpose).toBe('favicon')
    expect(await sharp(stored).metadata()).toMatchObject({ format: 'png', width: 2, height: 2 })
  })

  it('supplies readable content to AI and enforces the generated length limit', async () => {
    mocks.read.mockResolvedValue(page(detailed))
    mocks.ai.mockResolvedValueOnce(JSON.stringify({ note: '用来分析网页加载和渲染性能的开发调试工具。' }))
      .mockResolvedValueOnce(JSON.stringify({ note: '字'.repeat(61) }))
    expect(await proposeBookmarkNote(url)).toBe('用来分析网页加载和渲染性能的开发调试工具。')
    const source = JSON.parse(mocks.ai.mock.calls[0]![0].messages[1].content)
    expect(source).toMatchObject({ title: 'A & B', description: '面向开发者的浏览器性能分析与调试工具', text: '通过性能时间线定位网页加载和渲染问题。' })
    await expect(proposeBookmarkNote(url)).rejects.toThrow('超过 60 字')
  })

  it('does not ask AI to invent a description from only the page title', async () => {
    mocks.read.mockResolvedValue(page('<title>Example</title><body><script>secret content never visible in the page</script></body>'))
    await expect(proposeBookmarkNote(url)).rejects.toThrow('信息太少')
    expect(mocks.ai).not.toHaveBeenCalled()
  })
})

function ico(frame: Buffer) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header[6] = header[7] = 2
  header.writeUInt32LE(frame.length, 14)
  header.writeUInt32LE(header.length, 18)
  return Buffer.concat([header, frame])
}

it('converts a bitmap ICO frame and rejects an oversized embedded bitmap', async () => {
  const bmp = Buffer.alloc(56, 0)
  bmp.writeUInt32LE(40, 0)
  bmp.writeUInt32LE(2, 4)
  bmp.writeUInt32LE(4, 8) // ICO bitmap height includes the mask.
  bmp.writeUInt16LE(1, 12)
  bmp.writeUInt16LE(32, 14)
  bmp.fill(255, 40)
  expect(await sharp(await normalizeSiteIcon(ico(bmp))).metadata()).toMatchObject({ format: 'png', width: 2, height: 2 })
  bmp.writeUInt32LE(0x7fffffff, 4)
  await expect(normalizeSiteIcon(ico(bmp))).rejects.toThrow('Invalid ICO bitmap')
})
