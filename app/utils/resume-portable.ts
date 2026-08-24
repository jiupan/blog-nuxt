import { z } from 'zod'
import type { ResumeDocument, ResumeSectionItem } from '../types/resume'
import { createResumeId } from './resume-defaults'

export const PORTABLE_RESUME_FORMAT = 'blog-nuxt-resume'
export const PORTABLE_RESUME_VERSION = 1
export const PORTABLE_RESUME_MAX_BYTES = 2 * 1024 * 1024

const optionalText = (maximum: number) => z.string().max(maximum).optional().default('')

const portableBasicSchema = z.object({
  name: optionalText(100),
  birth: optionalText(50),
  gender: optionalText(30),
  politicalStatus: optionalText(50),
  hometown: optionalText(100),
  phone: optionalText(50),
  email: optionalText(200)
})

const portableSectionItemSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  range: optionalText(100),
  heading: optionalText(300),
  secondary: optionalText(500),
  tag: optionalText(200),
  intro: optionalText(5000),
  stack: optionalText(3000),
  bullets: optionalText(15000)
})

const portableSectionSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  title: z.string().trim().min(1, '栏目名称不能为空').max(100),
  type: z.enum(['education', 'skills', 'project', 'experience', 'research', 'campus']),
  items: z.array(portableSectionItemSchema).max(30).optional().default([])
})

const portableResumeSchema = z.object({
  format: z.literal(PORTABLE_RESUME_FORMAT),
  version: z.literal(PORTABLE_RESUME_VERSION),
  title: z.string().trim().min(1, '简历名称不能为空').max(150),
  content: z.object({
    basic: portableBasicSchema,
    sections: z.array(portableSectionSchema).max(30)
  }),
  layout: z.object({
    sectionGap: z.number().min(0).max(12),
    lineHeight: z.number().min(1).max(2.2),
    pageMargin: z.number().min(3).max(24),
    fontSize: z.number().min(7).max(16)
  })
})

export type PortableResumeFile = z.infer<typeof portableResumeSchema>

function uniqueId(candidate: string | undefined, usedIds: Set<string>) {
  let id = candidate
  while (!id || usedIds.has(id)) id = createResumeId()
  usedIds.add(id)
  return id
}

export function createPortableResume(resume: ResumeDocument): PortableResumeFile {
  const { avatar: _avatar, ...basic } = resume.content.basic

  return {
    format: PORTABLE_RESUME_FORMAT,
    version: PORTABLE_RESUME_VERSION,
    title: resume.title,
    content: {
      basic,
      sections: resume.content.sections.map(section => ({
        id: section.id,
        title: section.title,
        type: section.type,
        items: section.items.map(item => ({ ...item }))
      }))
    },
    layout: { ...resume.layout }
  }
}

export function parsePortableResume(value: unknown, avatar = ''): ResumeDocument {
  const result = portableResumeSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.length ? `${issue.path.join('.')}：` : ''
    throw new Error(`${path}${issue?.message || '文件内容不符合简历格式'}`)
  }

  const sectionIds = new Set<string>()
  const itemIds = new Set<string>()

  return {
    title: result.data.title,
    content: {
      basic: {
        ...result.data.content.basic,
        avatar
      },
      sections: result.data.content.sections.map(section => ({
        id: uniqueId(section.id, sectionIds),
        title: section.title,
        type: section.type,
        items: section.items.map((item): ResumeSectionItem => ({
          ...item,
          id: uniqueId(item.id, itemIds)
        }))
      }))
    },
    layout: { ...result.data.layout }
  }
}
