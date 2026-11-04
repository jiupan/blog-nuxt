import MarkdownIt from 'markdown-it'
import katex from 'katex'

export type ArticleChatCitation = {
  referenceId?: number
  chunkId?: number
  headingPath?: string | null
  excerpt?: string
}

type RenderEnv = {
  references: ReadonlyMap<number, number>
  streaming: boolean
  lines: string[]
}

const md = new MarkdownIt({ html: false, breaks: true, linkify: true }).disable('image')

md.inline.ruler.before('link', 'article_reference', (state, silent) => {
  const remaining = state.src.slice(state.pos, state.posMax)
  const marker = /^\[ref:(\d{1,5})\]/.exec(remaining)
  const env = state.env as RenderEnv
  const incomplete = /^\[ref:\d{0,5}$/.test(remaining) ||
    (env.streaming && /^\[(?:r(?:e(?:f)?)?)?$/.test(remaining))
  if (!marker && !incomplete) return false
  const linkLevel = (state as typeof state & { linkLevel: number }).linkLevel
  if (!silent && marker && linkLevel === 0) {
    state.push('article_reference', '', 0).content = marker[1]!
  }
  state.pos += marker?.[0].length ?? remaining.length
  return true
})

md.inline.ruler.before('escape', 'article_math', (state, silent) => {
  const start = state.pos
  const open = ['$$', '$', '\\(', '\\['].find(delimiter => state.src.startsWith(delimiter, start))
  if (!open) return false
  const close = open === '\\(' ? '\\)' : open === '\\[' ? '\\]' : open
  const contentStart = start + open.length
  let end = state.src.indexOf(close, contentStart)
  while (end >= 0 && state.src[end - 1] === '\\') {
    let slash = end - 1
    while (slash >= contentStart && state.src[slash] === '\\') slash--
    if ((end - slash) % 2 !== 0) break
    end = state.src.indexOf(close, end + close.length)
  }
  if (end < 0 || end + close.length > state.posMax) return false
  const content = state.src.slice(contentStart, end)
  if (!content.trim() || (open === '$' && (/^\s|\s$|\n/.test(content) || /\d/.test(state.src[end + 1] || '')))) return false
  if (!silent) {
    const token = state.push('article_math', '', 0)
    token.content = content
    token.markup = open
  }
  state.pos = end + close.length
  return true
})

md.renderer.rules.article_reference = (tokens, index, _options, env: RenderEnv) => {
  const referenceId = Number(tokens[index]!.content)
  const number = env.references.get(referenceId)
  return number === undefined ? '' : `<button type="button" class="chat-reference" data-reference-id="${referenceId}" aria-label="查看引用 ${number}" aria-expanded="false">${number}</button>`
}

md.renderer.rules.article_math = (tokens, index) => {
  const { content, markup } = tokens[index]!
  const displayMode = markup === '$$' || markup === '\\['
  const html = katex.renderToString(content, { displayMode, trust: false, throwOnError: false, maxExpand: 200, maxSize: 16, strict: 'ignore' })
  return displayMode ? html : `<span class="chat-inline-math">${html}</span>`
}

md.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
  tokens[index]!.attrSet('target', '_blank')
  tokens[index]!.attrSet('rel', 'noopener noreferrer')
  return renderer.renderToken(tokens, index, options)
}

md.renderer.rules.table_open = () => '<div class="chat-table" tabindex="0" role="region" aria-label="表格，可横向滚动"><table>'
md.renderer.rules.table_close = () => '</table></div>'

md.renderer.rules.fence = (tokens, index, _options, env: RenderEnv) => {
  const token = tokens[index]!
  const [start, end] = token.map || []
  if (env.streaming && start !== undefined && end !== undefined) {
    const lastLine = env.lines[end - 1]?.trim() || ''
    const closed = end > start + 1 && lastLine.startsWith(token.markup) &&
      [...lastLine].every(character => character === token.markup[0])
    if (!closed) return `<p class="chat-unfinished">${md.utils.escapeHtml(env.lines.slice(start, end).join('\n'))}</p>`
  }
  return renderCodeBlock(token.content, token.info.trim().split(/\s+/, 1)[0])
}

md.renderer.rules.code_block = (tokens, index) => renderCodeBlock(tokens[index]!.content)

function renderCodeBlock(content: string, language = '') {
  const label = md.utils.escapeHtml(language || '代码')
  return `<div class="chat-code"><div class="chat-code-heading"><span>${label}</span><button type="button" data-copy-code>复制</button></div><pre tabindex="0"><code>${md.utils.escapeHtml(content)}</code></pre></div>`
}

export function renderArticleChatBlocks(content: string, references: ReadonlyMap<number, number>, streaming: boolean) {
  const env: RenderEnv = { references, streaming, lines: content.split(/\r?\n/) }
  const tokens = md.parse(content, env)
  const blocks: string[] = []
  let start = 0
  for (const [index, token] of tokens.entries()) {
    if (token.level !== 0 || token.nesting === 1) continue
    blocks.push(md.renderer.render(tokens.slice(start, index + 1), md.options, env))
    start = index + 1
  }
  return blocks
}
