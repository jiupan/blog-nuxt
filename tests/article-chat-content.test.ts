import { describe, expect, it } from 'vitest'
import { renderArticleChatBlocks } from '../app/utils/article-chat-markdown'
import { createArticleAnswerWriter, unwrapArticleAnswer } from '../server/services/ai/article-answer-format'

describe('article chat answer formatting', () => {
  it('extracts Chinese and English JSON envelopes with Markdown and math escapes intact', () => {
    const content = String.raw`**要点**：\(x^2\)。[ref:1]`
    expect(unwrapArticleAnswer(JSON.stringify({ 回答: content }))).toBe(content)
    expect(unwrapArticleAnswer(JSON.stringify({ 回答: content, 说明: '模型附加的字段' }))).toBe(content)
    expect(unwrapArticleAnswer('```json\n' + JSON.stringify({ answer: content, citationIds: [1] }) + '\n```')).toBe(content)
    expect(unwrapArticleAnswer('{"回答":"还没有结束')).toBeNull()
    expect(unwrapArticleAnswer('{"answer":null}')).toBeNull()
  })

  it('preserves ordinary text and legitimate JSON examples', () => {
    for (const content of ['（示例）「正常引号」', '```json\n{"model":"LongCat"}\n```', '{"answer":42,"operation":"add"}']) {
      expect(unwrapArticleAnswer(content)).toBe(content)
    }
  })

  it('streams normal Markdown immediately and withholds split JSON wrappers', async () => {
    const deltas: string[] = []
    const onDelta = (delta: string) => { deltas.push(delta) }
    const plain = createArticleAnswerWriter(onDelta)
    await plain.push('## 标题')
    await plain.push('\n正文')
    expect(deltas.splice(0)).toEqual(['## 标题', '\n正文'])
    expect(await plain.finish('## 标题\n正文')).toBe('## 标题\n正文')

    const wrapped = createArticleAnswerWriter(onDelta)
    const chunks = ['```j', 'son\r', '\n{"回', '答":"正文"}', '\n```']
    for (const chunk of chunks) await wrapped.push(chunk)
    expect(deltas).toEqual([])
    expect(await wrapped.finish(chunks.join(''))).toBe('正文')
    expect(deltas.splice(0)).toEqual(['正文'])

    const malformed = createArticleAnswerWriter(onDelta)
    await malformed.push('{"回答":"没结束')
    expect(await malformed.finish('{"回答":"没结束')).toBeNull()
    expect(deltas).toEqual([])
  })
})

describe('article chat Markdown', () => {
  it('renders only known citation IDs and keeps the same number on repeated use', () => {
    const content = '第一句。[ref:3] 第二句。[ref:3][ref:42]\n\n第三句。[ref:1]'
    const blocks = renderArticleChatBlocks(content, new Map([[3, 1], [1, 2]]), false)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]?.match(/aria-label="查看引用 1"/g)).toHaveLength(2)
    expect(blocks[1]).toContain('aria-label="查看引用 2"')
    expect(blocks.join('')).not.toContain('ref:42')
    expect(renderArticleChatBlocks('正在输出。[ref:3', new Map(), true).join('')).not.toContain('ref:3')
  })

  it('renders safe Markdown and formula delimiters while preserving literals in code', () => {
    const content = [
      String.raw`**加粗** 和 $x^2$，以及 \(y^2\)。`,
      String.raw`$$a^2+b^2=c^2$$`,
      String.raw`\[r_k=r_{k-1}-q_k\]`,
      '<script>alert(1)</script> [bad](javascript:alert(1))',
      '```ts\nconst literal = "[ref:1] $x$"\n```',
      '| 列 | 值 |\n| --- | --- |\n| 一 | 二 |'
    ].join('\n\n')
    const html = renderArticleChatBlocks(content, new Map([[1, 1]]), false).join('')
    expect(html).toContain('<strong>加粗</strong>')
    expect(html.match(/class="katex-display"/g)).toHaveLength(2)
    expect(html.match(/class="chat-inline-math"/g)).toHaveLength(2)
    expect(html).toContain('data-copy-code')
    expect(html).toContain('[ref:1] $x$')
    expect(html).toContain('class="chat-table"')
    expect(renderArticleChatBlocks('    indented code', new Map(), false).join('')).toContain('data-copy-code')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('href="javascript:')
  })

  it('keeps an unfinished code block or formula stable until its closing delimiter', () => {
    const partial = renderArticleChatBlocks('```ts\nconst x = 1', new Map(), true).join('')
    expect(partial).toContain('chat-unfinished')
    expect(partial).not.toContain('data-copy-code')
    expect(renderArticleChatBlocks('公式 $x^', new Map(), true).join('')).not.toContain('class="katex"')
    expect(renderArticleChatBlocks('```ts\nconst x = 1\n```', new Map(), true).join('')).toContain('data-copy-code')
  })
})
