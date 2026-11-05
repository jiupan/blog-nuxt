import MarkdownIt, { type Options } from 'markdown-it'
import type Renderer from 'markdown-it/lib/renderer.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import sanitizeHtml from 'sanitize-html'

export type CommentBodyFormat = 'MARKDOWN' | 'LEGACY_HTML'

/**
 * 评论正文允许的标签。
 *
 * 与文章渲染器的白名单刻意不同：
 * - 不允许 img —— 评论里不放外链图片，避免跟踪像素和盗链。
 * - 不允许 style / span / div —— 不给样式注入留口子。
 * - 不允许 h1-h6 —— 标题降级成加粗段落，评论里不该出现版面结构。
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'blockquote',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'a',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td'
]

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    code: ['class'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan']
  },
  allowedClasses: {
    code: ['language-*']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer', target: '_blank' })
  }
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
}).disable('image')

// 标题降级成加粗段落。
md.renderer.rules.heading_open = () => '<p><strong>'
md.renderer.rules.heading_close = () => '</strong></p>'

// 表格在窄屏要能横向滚动，和文章正文的处理保持一致。
md.renderer.rules.table_open = () =>
  '<div class="md-table-scroll" tabindex="0" role="region" aria-label="表格，可横向滚动"><table>\n'
md.renderer.rules.table_close = () => '</table></div>\n'

/**
 * 把链接渲染成新窗口打开。
 * markdown-it 的 linkify 会自动生成 <a>，这里统一补上 target 与 rel。
 */
const defaultLinkOpen = md.renderer.rules.link_open
md.renderer.rules.link_open = (
  tokens: Token[],
  idx: number,
  options: Options,
  env: unknown,
  self: Renderer
) => {
  const token = tokens[idx]
  if (token) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'nofollow noopener noreferrer')
  }
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options)
}

/**
 * 渲染评论正文。
 *
 * MARKDOWN 走受限 Markdown 再过一遍白名单；LEGACY_HTML 直接过白名单，不解释 Markdown。
 * 两条路径最终都只输出白名单里的标签。
 */
export function renderCommentBody(body: string, format: CommentBodyFormat = 'MARKDOWN'): string {
  if (!body) return ''

  if (format === 'LEGACY_HTML') {
    return sanitizeHtml(body, SANITIZE_OPTIONS)
  }

  return sanitizeHtml(md.render(body), SANITIZE_OPTIONS)
}

/** 纯文本摘要，用于后台列表与通知。 */
export function toPlainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
