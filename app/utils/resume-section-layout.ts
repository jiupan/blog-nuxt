import { z } from 'zod'
import type { ResumeBlockConfig, ResumeBlockKey, ResumeSection, ResumeSectionPresentation, ResumeTemplate } from '../types/resume'

const blockSchema = z.object({
  key: z.enum(['heading', 'secondary', 'intro', 'stack', 'bullets']),
  visible: z.boolean(),
  label: z.string().max(100),
  style: z.enum(['tags', 'text']).optional()
})
const blocksSchema = z.array(blockSchema).max(5).refine(
  blocks => new Set(blocks.map(block => block.key)).size === blocks.length,
  '内容块不能重复'
)

export const resumeSectionPresentationSchema = z.object({
  blocks: blocksSchema,
  projectBlocks: blocksSchema.optional()
})

export type ResumeBlockScope = 'blocks' | 'projectBlocks'

export function defaultSectionBlocks(section: ResumeSection, template: ResumeTemplate, scope: ResumeBlockScope = 'blocks'): ResumeBlockConfig[] {
  let keys: ResumeBlockKey[] = ['heading', 'secondary', 'intro', 'stack', 'bullets']
  if (section.type === 'experience') {
    keys = scope === 'blocks' ? ['heading', 'stack'] : ['heading', 'secondary', 'bullets']
  } else if (template === 'modern' && section.type === 'education') {
    keys = ['heading', 'intro', 'secondary', 'bullets']
  } else if (template === 'modern' && section.type === 'project') {
    keys = ['heading', 'stack', 'secondary', 'intro', 'bullets']
  }

  return keys.map(key => ({
    key,
    visible: true,
    label: key === 'stack' ? (section.type === 'research' ? '方法与工具' : '技术栈')
      : key === 'intro' && section.type === 'project' ? '项目描述'
        : key === 'secondary' && section.type === 'experience' ? '背景' : '',
    ...(key === 'stack' ? { style: template === 'modern' && ['project', 'experience'].includes(section.type) ? 'tags' as const : 'text' as const } : {})
  }))
}

export function sectionBlocks(section: ResumeSection, template: ResumeTemplate, scope: ResumeBlockScope = 'blocks') {
  return section.presentation?.[scope] ?? defaultSectionBlocks(section, template, scope)
}

export function createSectionPresentation(section: ResumeSection, template: ResumeTemplate): ResumeSectionPresentation {
  return {
    blocks: sectionBlocks(section, template).map(block => ({ ...block })),
    ...(section.type === 'experience' ? { projectBlocks: sectionBlocks(section, template, 'projectBlocks').map(block => ({ ...block })) } : {})
  }
}

export function bulletLines(value: string) {
  return value.split('\n').map(line => line.trim().replace(/^[•·]\s*/, '')).filter(Boolean)
}

export function stackItems(value: string) {
  return value.split(/[、,，|｜]+/).map(item => item.trim()).filter(Boolean)
}
