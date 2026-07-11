import { badRequest } from '../../utils/api-error'
import { markdownSections, type ExtractedSection } from './file-chunker.service'

export async function parseKnowledgeFile(buffer: Buffer, extension: string): Promise<ExtractedSection[]> {
  if (extension === 'md') return markdownSections(decodeText(buffer))
  if (extension === 'txt') return [{ content: decodeText(buffer) }]
  if (extension === 'docx') {
    const { default: mammoth } = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return [{ content: result.value }]
  }
  if (extension === 'pdf') {
    await installPdfNodeGlobals()
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    try {
      const result = await parser.getText()
      return result.pages.map((page) => ({ content: page.text, pageNumber: page.num }))
    } finally {
      await parser.destroy().catch(() => undefined)
    }
  }
  throw badRequest('不支持的知识文件类型')
}

async function installPdfNodeGlobals() {
  const canvas = await import('@napi-rs/canvas')
  const globals = globalThis as Record<string, unknown>
  globals.DOMMatrix ||= canvas.DOMMatrix
  globals.ImageData ||= canvas.ImageData
  globals.Path2D ||= canvas.Path2D
}

function decodeText(buffer: Buffer) {
  const value = buffer.toString('utf8')
  const replacementRatio = (value.match(/\uFFFD/g)?.length || 0) / Math.max(value.length, 1)
  if (replacementRatio > 0.01) throw badRequest('文本文件不是有效的 UTF-8 编码')
  return value.replace(/^\uFEFF/, '')
}
