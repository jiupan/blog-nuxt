import { randomInt } from 'node:crypto'
import type { FooterReadingPayload } from '~~/types/dto/post'
import { getSettingsMap } from '../settings/settings.service'
import { prisma } from '../../utils/prisma'
import { buildPublishedPostWhere } from './post-visibility'

const postSelect = { id: true, slug: true, title: true } as const

export async function getFooterReading(): Promise<FooterReadingPayload | null> {
  const settings = await getSettingsMap(['footer_reading_enabled', 'footer_featured_post_id'])
  if (settings.footer_reading_enabled !== 'true') return null

  const where = buildPublishedPostWhere()
  const featuredId = Number(settings.footer_featured_post_id)
  const [featured, recent] = await Promise.all([
    featuredId > 0 ? prisma.post.findFirst({ where: { ...where, id: featuredId }, select: postSelect }) : null,
    prisma.post.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: postSelect,
      // Leave a candidate after skipping the featured post and the article being read.
      take: 3
    })
  ])
  return { featured, recent }
}

export async function getRandomFooterPost(excludeSlug: string) {
  const where = buildPublishedPostWhere(excludeSlug ? { slug: { not: excludeSlug } } : {})
  return prisma.$transaction(async tx => {
    const count = await tx.post.count({ where })
    if (!count) return null
    return tx.post.findFirst({ where, orderBy: { id: 'asc' }, skip: randomInt(count), select: { slug: true } })
  }, { isolationLevel: 'RepeatableRead' })
}
