import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { badRequest } from '../../utils/api-error'
import { markdownSections, type ExtractedSection } from './file-chunker.service'

export async function parseKnowledgeFile(buffer: Buffer, extension: string): Promise<ExtractedSection[]> {
  if (extension === 'md') return markdownSections(decodeText(buffer))
  if (extension === 'txt') return [{ content: decodeText(buffer) }]
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return [{ content: result.value }]
  }
  if (extension === 'pdf') {
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

function decodeText(buffer: Buffer) {
  const value = buffer.toString('utf8')
  const replacementRatio = (value.match(/\uFFFD/g)?.length || 0) / Math.max(value.length, 1)
  if (replacementRatio > 0.01) throw badRequest('文本文件不是有效的 UTF-8 编码')
  return value.replace(/^\uFEFF/, '')
}
