import { z } from 'zod'

const basicSchema = z.object({
  name: z.string().max(100),
  birth: z.string().max(50),
  gender: z.string().max(30),
  politicalStatus: z.string().max(50),
  hometown: z.string().max(100),
  phone: z.string().max(50),
  email: z.string().max(200),
  avatar: z.string().max(3_000_000)
})

const sectionItemSchema = z.object({
  id: z.string().min(1).max(100),
  range: z.string().max(100),
  heading: z.string().max(300),
  secondary: z.string().max(500),
  tag: z.string().max(200),
  intro: z.string().max(5000),
  stack: z.string().max(3000),
  bullets: z.string().max(15000)
})

const sectionSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1, '栏目名称不能为空').max(100),
  items: z.array(sectionItemSchema).max(30)
})

export const resumeContentSchema = z.object({
  basic: basicSchema,
  sections: z.array(sectionSchema).max(30)
})

export const saveResumeSchema = z.object({
  title: z.string().trim().min(1, '简历名称不能为空').max(150),
  content: resumeContentSchema,
  layout: z.object({
    sectionGap: z.number().min(0).max(12),
    lineHeight: z.number().min(1).max(2.2),
    pageMargin: z.number().min(3).max(24),
    fontSize: z.number().min(7).max(16)
  })
})
