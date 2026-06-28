import MarkdownIt from 'markdown-it'
import type Renderer from 'markdown-it/lib/renderer.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import sanitizeHtml from 'sanitize-html'
import Slugger from 'github-slugger'
import { codeToHtml } from 'shiki'

export type RenderedMarkdown = {
  html: string
  toc: Array<{
    id: string
    text: string
    level: number
  }>
  wordCount: number
  readingTime: number
}

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(code: string, lang: string): string {
    return `<pre data-lang="${lang || 'text'}"><code>${md.utils.escapeHtml(code)}</code></pre>`
  }
})

export async function renderMarkdown(content: string): Promise<RenderedMarkdown> {
  const slugger = new Slugger()
  const toc: RenderedMarkdown['toc'] = []

  const defaultHeadingOpen = md.renderer.rules.heading_open
  md.renderer.rules.heading_open = (
    tokens: Token[],
    idx: number,
    options: any,
    env: unknown,
    self: Renderer
  ) => {
    const token = tokens[idx]
    const nextToken = tokens[idx + 1]
    if (!token) {
      return ''
    }
    const level = Number(token.tag.replace('h', ''))
    const text = nextToken?.content || ''
    const id = slugger.slug(text)

    token.attrSet('id', id)
    if (level === 2 || level === 3) {
      toc.push({ id, text, level })
    }

    return defaultHeadingOpen
      ? defaultHeadingOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }

  let html = md.render(content)
  html = await highlightCodeBlocks(html)
  html = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'pre', 'code', 'span']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
      h1: ['id'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      pre: ['class', 'data-lang'],
      code: ['class', 'style'],
      span: ['class', 'style']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer', target: '_blank' }),
      img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' })
    }
  })

  const words = content.replace(/```[\s\S]*?```/g, '').trim()
  const wordCount = words ? words.length : 0

  return {
    html,
    toc,
    wordCount,
    readingTime: Math.max(1, Math.ceil(wordCount / 500))
  }
}

async function highlightCodeBlocks(html: string) {
  const codeBlockPattern = /<pre data-lang="([^"]*)"><code>([\s\S]*?)<\/code><\/pre>/g
  const blocks = [...html.matchAll(codeBlockPattern)]

  let highlighted = html
  for (const block of blocks) {
    const lang = block[1] || 'text'
    const decoded = decodeEntities(block[2] || '')
    const rendered = await codeToHtml(decoded, {
      lang,
      theme: 'github-dark'
    }).catch(() => codeToHtml(decoded, { lang: 'text', theme: 'github-dark' }))

    highlighted = highlighted.replace(block[0], rendered)
  }

  return highlighted
}

function decodeEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
}
