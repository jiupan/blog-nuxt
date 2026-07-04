export type SeoCheckInput = {
  title: string
  summary?: string | null
  content: string
  categoryId?: number | null
  tagIds?: number[]
  seoTitle?: string | null
  seoDescription?: string | null
}

export type SeoCheckIssueType = 'error' | 'warning' | 'success'

export type SeoCheckIssue = {
  key: string
  type: SeoCheckIssueType
  title: string
  description: string
}

export type SeoRuleCheckResult = {
  score: number
  issues: SeoCheckIssue[]
  stats: {
    wordCount: number
    h2Count: number
    imageCount: number
    missingAltCount: number
    internalLinkCount: number
    externalLinkCount: number
  }
}

export function runSeoRuleCheck(input: SeoCheckInput): SeoRuleCheckResult {
  const issues: SeoCheckIssue[] = []
  const title = input.title.trim()
  const seoTitle = (input.seoTitle || '').trim()
  const seoDescription = (input.seoDescription || '').trim()
  const summary = (input.summary || '').trim()
  const content = input.content || ''
  const stats = collectSeoStats(content)

  addLengthIssue(issues, 'title', '文章标题', title, 8, 36)
  addLengthIssue(issues, 'seoTitle', 'SEO 标题', seoTitle, 10, 32)
  addLengthIssue(issues, 'seoDescription', 'SEO 描述', seoDescription, 80, 160)

  if (!summary) {
    issues.push({
      key: 'summary',
      type: 'warning',
      title: '缺少摘要',
      description: '文章摘要为空，列表页和分享卡片会缺少稳定简介。'
    })
  } else if (summary.length > 140) {
    issues.push({
      key: 'summaryLength',
      type: 'warning',
      title: '摘要偏长',
      description: '摘要建议控制在 120 字左右，便于列表页展示。'
    })
  } else {
    issues.push({
      key: 'summary',
      type: 'success',
      title: '摘要完整',
      description: '文章摘要已填写，长度适合展示。'
    })
  }

  if (!input.categoryId) {
    issues.push({
      key: 'category',
      type: 'warning',
      title: '缺少分类',
      description: '建议给文章选择一个明确分类，增强站内内容组织。'
    })
  } else {
    issues.push({
      key: 'category',
      type: 'success',
      title: '分类完整',
      description: '文章已设置分类。'
    })
  }

  if (!input.tagIds?.length) {
    issues.push({
      key: 'tags',
      type: 'warning',
      title: '缺少标签',
      description: '建议添加 2 到 5 个标签，方便站内关联和检索。'
    })
  } else if (input.tagIds.length > 6) {
    issues.push({
      key: 'tags',
      type: 'warning',
      title: '标签偏多',
      description: '标签过多会稀释主题，建议保留最核心的 2 到 5 个。'
    })
  } else {
    issues.push({
      key: 'tags',
      type: 'success',
      title: '标签数量合适',
      description: '标签数量适合文章归类。'
    })
  }

  if (stats.wordCount < 300) {
    issues.push({
      key: 'wordCount',
      type: 'warning',
      title: '正文偏短',
      description: '正文内容较短，可能难以覆盖搜索意图。'
    })
  } else {
    issues.push({
      key: 'wordCount',
      type: 'success',
      title: '正文长度可用',
      description: '正文长度满足基础 SEO 需要。'
    })
  }

  if (stats.h2Count < 2) {
    issues.push({
      key: 'headings',
      type: 'warning',
      title: '二级标题较少',
      description: '建议使用 H2/H3 拆分结构，方便阅读和搜索引擎理解。'
    })
  } else {
    issues.push({
      key: 'headings',
      type: 'success',
      title: '标题结构清晰',
      description: '正文包含可用的章节结构。'
    })
  }

  if (stats.imageCount && stats.missingAltCount) {
    issues.push({
      key: 'imageAlt',
      type: 'warning',
      title: '图片缺少 alt',
      description: `${stats.missingAltCount} 张图片缺少 alt 文本，建议补充图片说明。`
    })
  } else if (stats.imageCount) {
    issues.push({
      key: 'imageAlt',
      type: 'success',
      title: '图片 alt 完整',
      description: '正文图片均包含 alt 文本。'
    })
  }

  if (!stats.internalLinkCount) {
    issues.push({
      key: 'internalLinks',
      type: 'warning',
      title: '缺少站内链接',
      description: '建议添加相关站内文章链接，增强内容关联。'
    })
  } else {
    issues.push({
      key: 'internalLinks',
      type: 'success',
      title: '包含站内链接',
      description: '正文已有站内链接。'
    })
  }

  const score = calculateSeoScore(issues)
  return { score, issues, stats }
}

function addLengthIssue(issues: SeoCheckIssue[], key: string, label: string, value: string, min: number, max: number) {
  if (!value) {
    issues.push({
      key,
      type: 'error',
      title: `${label}为空`,
      description: `建议填写 ${min} 到 ${max} 字的${label}。`
    })
    return
  }

  if (value.length < min) {
    issues.push({
      key,
      type: 'warning',
      title: `${label}偏短`,
      description: `${label}当前 ${value.length} 字，建议至少 ${min} 字。`
    })
    return
  }

  if (value.length > max) {
    issues.push({
      key,
      type: 'warning',
      title: `${label}偏长`,
      description: `${label}当前 ${value.length} 字，建议不超过 ${max} 字。`
    })
    return
  }

  issues.push({
    key,
    type: 'success',
    title: `${label}长度合适`,
    description: `${label}长度处于推荐范围。`
  })
}

function collectSeoStats(content: string) {
  const plainText = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const images = [...content.matchAll(/!\[([^\]]*)]\(([^)]+)\)/g)]
  const links = [...content.matchAll(/(?<!!)\[([^\]]+)]\(([^)]+)\)/g)]

  return {
    wordCount: plainText.length,
    h2Count: (content.match(/^##\s+/gm) || []).length,
    imageCount: images.length,
    missingAltCount: images.filter((match) => !String(match[1] || '').trim()).length,
    internalLinkCount: links.filter((match) => isInternalLink(String(match[2] || ''))).length,
    externalLinkCount: links.filter((match) => /^https?:\/\//i.test(String(match[2] || ''))).length
  }
}

function isInternalLink(value: string) {
  return value.startsWith('/') || value.startsWith('#') || value.startsWith('./') || value.startsWith('../')
}

function calculateSeoScore(issues: SeoCheckIssue[]) {
  const penalty = issues.reduce((sum, issue) => {
    if (issue.type === 'error') return sum + 14
    if (issue.type === 'warning') return sum + 7
    return sum
  }, 0)

  return Math.max(0, Math.min(100, 100 - penalty))
}
