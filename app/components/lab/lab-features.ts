import {
  Activity as ActivityIcon,
  Archive as ArchiveIcon,
  BrainCircuit as BrainCircuitIcon,
  CalendarDays as CalendarDaysIcon,
  FileText as FileTextIcon,
  Link2Off as Link2OffIcon,
  MessageSquareText as MessageSquareTextIcon,
  Network as NetworkIcon,
  PenTool as PenToolIcon,
  Target as TargetIcon
} from '@lucide/vue'
import { markRaw } from 'vue'
import type { LabFeature } from './lab.types'

export const labFeatures: LabFeature[] = [
  {
    id: 'ask-blog',
    sysId: 'SYS-001',
    title: '问问博客',
    subtitle: 'Blog Q&A',
    description: '基于站内文章回答问题，并附带参考来源。',
    icon: markRaw(MessageSquareTextIcon),
    tone: 'blue',
    wide: true,
    tall: true,
    hasVisual: true
  },
  {
    id: 'semantic-search',
    sysId: 'SYS-002',
    title: '语义搜索',
    subtitle: 'Semantic Search',
    description: '不靠精确关键词，按意思搜索相关文章。',
    icon: markRaw(BrainCircuitIcon),
    tone: 'indigo'
  },
  {
    id: 'writing-assistant',
    sysId: 'SYS-003',
    title: '写作助手',
    subtitle: 'Writing Assistant',
    description: '给草稿生成摘要、SEO 标题、描述、标签及分类建议。',
    icon: markRaw(PenToolIcon),
    tone: 'green',
    tall: true,
    hasVisual: true
  },
  {
    id: 'article-summary',
    sysId: 'SYS-004',
    title: '文章总结器',
    subtitle: 'Article Summarizer',
    description: '生成文章摘要、重点、适合读者群和相关问题。',
    icon: markRaw(FileTextIcon),
    tone: 'amber'
  },
  {
    id: 'site-insights',
    sysId: 'SYS-005',
    title: '站点洞察',
    subtitle: 'Site Insights',
    description: '分析博客内容主题、标签分布、热门方向和可补充选题。',
    icon: markRaw(ActivityIcon),
    tone: 'rose',
    wide: true
  },
  {
    id: 'article-recommend',
    sysId: 'SYS-006',
    title: '文章关联推荐',
    subtitle: 'Smart Recommendation',
    description: '根据当前文章推荐相关旧文，方便读者继续阅读。',
    icon: markRaw(NetworkIcon),
    tone: 'violet'
  },
  {
    id: 'seo-checker',
    sysId: 'SYS-007',
    title: 'SEO 检查助手',
    subtitle: 'SEO Checker',
    description: '检查文章标题、摘要、标签是否完整，给出优化建议。',
    icon: markRaw(TargetIcon),
    tone: 'sky'
  },
  {
    id: 'dead-link-checker',
    sysId: 'SYS-008',
    title: '外链检查助手',
    subtitle: 'Link Monitor',
    description: '扫描文章里的外链，找出失效链接并给出修复建议。',
    icon: markRaw(Link2OffIcon),
    tone: 'red'
  },
  {
    id: 'draft-organizer',
    sysId: 'SYS-009',
    title: '草稿整理助手',
    subtitle: 'Draft Organizer',
    description: '分析后台草稿，判断完成度，推荐适合继续写或发布。',
    icon: markRaw(ArchiveIcon),
    tone: 'slate'
  },
  {
    id: 'monthly-review',
    sysId: 'SYS-010',
    title: '月度内容回顾',
    subtitle: 'Monthly Review',
    description: '自动整理一个月内发布的文章，生成月报或内容总结。',
    icon: markRaw(CalendarDaysIcon),
    tone: 'fuchsia',
    wide: true
  }
]
