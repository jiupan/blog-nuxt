import type { Prisma } from '@prisma/client'
import { notFound } from '~~/server/utils/api-error'
import { prisma } from '~~/server/utils/prisma'
import type { z } from 'zod'
import type { saveResumeSchema } from './resume.schema'

type SaveResumeInput = z.infer<typeof saveResumeSchema>

const summarySelect = {
  id: true,
  title: true,
  updatedAt: true
} satisfies Prisma.ResumeSelect

export function listResumes(userId: number) {
  return prisma.resume.findMany({
    where: { userId },
    select: summarySelect,
    orderBy: { updatedAt: 'desc' }
  })
}

export function createResume(userId: number, input: SaveResumeInput) {
  return prisma.resume.create({
    data: {
      userId,
      title: input.title,
      content: input.content,
      layout: input.layout
    }
  })
}

export async function getResume(userId: number, id: number) {
  const resume = await prisma.resume.findFirst({ where: { id, userId } })
  if (!resume) throw notFound('简历不存在')
  return resume
}

export async function updateResume(userId: number, id: number, input: SaveResumeInput) {
  await getResume(userId, id)
  return prisma.resume.update({
    where: { id },
    data: {
      title: input.title,
      content: input.content,
      layout: input.layout
    }
  })
}

export async function deleteResume(userId: number, id: number) {
  await getResume(userId, id)
  await prisma.resume.delete({ where: { id } })
}
