import { createHash } from 'node:crypto'

export type ChunkInputPost = {
  id: number
  title: string
  slug: string
  summary?: string | null
  content: string
  categoryId?: number | null
  category?: { name: string } | null
  tags?: Array<{ tag?: { id: number, name: string }, id?: number, name?: string }>
}

export type PreparedPostChunk = {
  postId: number
  chunkIndex: number
  title: string
  slug: string
  summary?: string | null
  content: string
  headingPath?: string | null
  contentHash: string
  tokenCount: number
  categoryId?: number | null
  tagIds: number[]
  embeddingText: string
}

const targetChunkLength = 760
const maxChunkLength = 980
const overlapLength = 120
export const chunkingVersion = 'markdown-headings-v1:760:980:120'

export function hashPostKnowledgeSource(post: ChunkInputPost) {
  const tags = normalizeTags(post).sort((a, b) => a.id - b.id)
  return hashContent(JSON.stringify({
    version: chunkingVersion,
    title: post.title,
    content: post.content,
    categoryId: post.categoryId || null,
    categoryName: post.category?.name || '',
    tags
  }))
}

export function chunkPost(post: ChunkInputPost): PreparedPostChunk[] {
  const sections = splitMarkdownSections(post.content)
  const tagNames = normalizeTags(post).map((tag) => tag.name)
  const tagIds = normalizeTags(post).map((tag) => tag.id)
  const chunks: PreparedPostChunk[] = []

  for (const section of sections) {
    const parts = splitSectionText(section.content)

    for (const part of parts) {
      const content = cleanMarkdown(part).trim()
      if (!content) continue

      const headingPath = section.headings.join(' / ') || null
      const embeddingText = [
        `标题：${post.title}`,
        post.category?.name ? `分类：${post.category.name}` : '',
        tagNames.length ? `标签：${tagNames.join('、')}` : '',
        headingPath ? `章节：${headingPath}` : '',
        `内容：${content}`
      ].filter(Boolean).join('\n')

      chunks.push({
        postId: post.id,
        chunkIndex: chunks.length,
        title: post.title,
        slug: post.slug,
        summary: post.summary || null,
        content,
        headingPath,
        contentHash: hashContent(`${headingPath || ''}\n${content}`),
        tokenCount: estimateTokens(content),
        categoryId: post.categoryId || null,
        tagIds,
        embeddingText
      })
    }
  }

  return chunks
}

export function hashContent(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function splitMarkdownSections(content: string) {
  const lines = content.split(/\r?\n/)
  const sections: Array<{ headings: string[], content: string }> = []
  let headings: string[] = []
  let buffer: string[] = []

  for (const line of lines) {
    const headingMatch = /^(#{2,3})\s+(.+)$/.exec(line)

    if (headingMatch) {
      pushSection()
      const marker = headingMatch[1] || '##'
      const level = marker.length
      const text = (headingMatch[2] || '').trim()
      headings = level === 2 ? [text] : [headings[0] || '', text].filter(Boolean)
      buffer.push(line)
    } else {
      buffer.push(line)
    }
  }

  pushSection()

  if (!sections.length) {
    return [{ headings: [], content }]
  }

  return sections

  function pushSection() {
    const text = buffer.join('\n').trim()
    if (text) {
      sections.push({ headings: [...headings], content: text })
    }
    buffer = []
  }
}

function splitSectionText(content: string) {
  const clean = content.trim()
  if (clean.length <= maxChunkLength) {
    return [clean]
  }

  const paragraphs = clean.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).trim().length > targetChunkLength && current.trim()) {
      chunks.push(current.trim())
      current = `${current.slice(-overlapLength)}\n\n${paragraph}`
    } else {
      current = `${current}\n\n${paragraph}`.trim()
    }
  }

  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks
}

function cleanMarkdown(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[#>*_~`-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function estimateTokens(content: string) {
  return Math.ceil(content.length / 1.6)
}

function normalizeTags(post: ChunkInputPost) {
  return (post.tags || [])
    .map((item) => {
      const tag = item.tag || item
      return {
        id: Number(tag.id),
        name: String(tag.name || '').trim()
      }
    })
    .filter((tag) => tag.id && tag.name)
}
