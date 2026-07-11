import { hashContent } from '../rag/chunker.service'

export type ExtractedSection = { content: string, headingPath?: string | null, pageNumber?: number | null }
export type PreparedFileChunk = ExtractedSection & {
  chunkIndex: number
  contentHash: string
  tokenCount: number
  embeddingText: string
}

const targetLength = 760
const maxLength = 980
const overlapLength = 120

export function chunkKnowledgeFile(name: string, sections: ExtractedSection[]): PreparedFileChunk[] {
  const result: PreparedFileChunk[] = []
  for (const section of sections) {
    for (const content of splitText(cleanText(section.content))) {
      if (!content) continue
      const headingPath = section.headingPath?.trim() || null
      const pageNumber = section.pageNumber || null
      result.push({
        chunkIndex: result.length,
        content,
        headingPath,
        pageNumber,
        contentHash: hashContent(`${headingPath || ''}\n${pageNumber || ''}\n${content}`),
        tokenCount: Math.ceil(content.length / 1.6),
        embeddingText: [
          `文件：${name}`,
          headingPath ? `章节：${headingPath}` : '',
          pageNumber ? `页码：${pageNumber}` : '',
          `内容：${content}`
        ].filter(Boolean).join('\n')
      })
    }
  }
  return result
}

export function markdownSections(content: string): ExtractedSection[] {
  const sections: ExtractedSection[] = []
  let headings: string[] = []
  let buffer: string[] = []
  const push = () => {
    const text = buffer.join('\n').trim()
    if (text) sections.push({ content: text, headingPath: headings.join(' / ') || null })
    buffer = []
  }
  for (const line of content.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line)
    if (!match) {
      buffer.push(line)
      continue
    }
    push()
    const level = match[1]!.length
    headings = headings.slice(0, level - 1)
    headings[level - 1] = match[2]!.trim()
    headings = headings.filter(Boolean)
  }
  push()
  return sections.length ? sections : [{ content }]
}

function splitText(text: string): string[] {
  if (!text) return []
  if (text.length <= maxLength) return [text]
  const units = text.split(/\n{2,}|(?<=[。！？.!?])\s+/).flatMap(splitOversizedUnit)
  const chunks: string[] = []
  let current = ''
  for (const unit of units) {
    const candidate = [current, unit].filter(Boolean).join('\n\n')
    if (candidate.length > targetLength && current) {
      chunks.push(current)
      current = `${current.slice(-overlapLength)}\n\n${unit}`.trim()
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function splitOversizedUnit(unit: string): string[] {
  const clean = unit.trim()
  if (clean.length <= maxLength) return clean ? [clean] : []
  const parts: string[] = []
  for (let offset = 0; offset < clean.length; offset += targetLength - overlapLength) {
    parts.push(clean.slice(offset, offset + targetLength))
  }
  return parts
}

function cleanText(value: string) {
  return value.replace(/\0/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
