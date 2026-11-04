import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../server/utils/markdown'

it('renders body H1 headings as H2 and preserves anchors and the table of contents', async () => {
  const { html, toc } = await renderMarkdown('# Title\n\n## Section\n\n### Detail\n\n```text\n# Code\n```')
  expect(html).not.toMatch(/<h1\b/)
  expect(html).toContain('<h2 id="title">Title</h2>')
  expect(toc).toEqual([
    { id: 'title', text: 'Title', level: 2 },
    { id: 'section', text: 'Section', level: 2 },
    { id: 'detail', text: 'Detail', level: 3 }
  ])
})

describe('article table rendering', () => {
  it('keeps a semantic table with its complete data inside a focusable scroll region', async () => {
    const { html } = await renderMarkdown('| 模式 | 数量 |\n| :--- | ---: |\n| off | 1 |\n| auto | 2 |')
    expect(html).toMatch(/<div[^>]*role="region"[^>]*><table>/)
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('<th>数量</th>')
    expect(html).toContain('<td>2</td>')
    expect(html).toContain('</table></div>')
    expect(html.match(/<tr>/g)).toHaveLength(3)
  })

  it('preserves wide tables without losing columns or adding wrappers to normal paragraphs', async () => {
    const headings = Array.from({ length: 12 }, (_, index) => `列 ${index + 1}`)
    const cells = headings.map((_, index) => `value_${index + 1}_${'long'.repeat(20)}`)
    const { html } = await renderMarkdown([
      '前面的正文。',
      '',
      `| ${headings.join(' | ')} |`,
      `| ${headings.map(() => '---').join(' | ')} |`,
      `| ${cells.join(' | ')} |`,
      '',
      '后面的正文。'
    ].join('\n'))
    expect(html.match(/<th>/g)).toHaveLength(12)
    expect(html.match(/<td>/g)).toHaveLength(12)
    expect(html).toContain(cells[11])
    expect(html.startsWith('<p>前面的正文。</p>')).toBe(true)
    expect(html.trim().endsWith('<p>后面的正文。</p>')).toBe(true)
  })
})
