import { describe, expect, it } from 'vitest'
import { chunkKnowledgeFile, markdownSections } from '../server/services/knowledge-files/file-chunker.service'

describe('knowledge file chunking', () => {
  it('preserves markdown heading paths in embedding context', () => {
    const sections = markdownSections('# 指南\n\n简介\n\n## 安装\n\n安装内容')
    const chunks = chunkKnowledgeFile('手册', sections)

    expect(chunks).toHaveLength(2)
    expect(chunks[1]).toMatchObject({ headingPath: '指南 / 安装', content: '安装内容' })
    expect(chunks[1]!.embeddingText).toContain('章节：指南 / 安装')
  })

  it('splits oversized unbroken text and never emits an oversized chunk', () => {
    const chunks = chunkKnowledgeFile('长文', [{ content: '甲'.repeat(2500), pageNumber: 3 }])

    expect(chunks.length).toBeGreaterThan(2)
    expect(Math.max(...chunks.map((chunk) => chunk.content.length))).toBeLessThanOrEqual(980)
    expect(chunks.every((chunk) => chunk.pageNumber === 3)).toBe(true)
  })
})
