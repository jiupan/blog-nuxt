import { homeHeroLimit, parseHomeHeroSelection } from '~~/shared/home-hero'
import type { HomeHeroPayload, HomeHeroPost } from '~~/types/dto/post'
import { resolveHomeCoverColor } from '~~/server/services/media/cover-color'
import { publicPostDefaultOrder } from '~~/server/services/posts/post-query.service'
import { buildPublishedPostWhere } from '~~/server/services/posts/post-visibility'
import { getSettingsMap } from '~~/server/services/settings/settings.service'
import { setCacheControl } from '~~/server/utils/cache-control'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'public-content')
  const settings = await getSettingsMap(['home_hero_posts'])
  const selection = parseHomeHeroSelection(settings.home_hero_posts) ?? []

  const fields = { id: true, slug: true, title: true, cover: true, isPinned: true } as const
  const [recent, posts] = await Promise.all([
    prisma.post.findMany({
      where: buildPublishedPostWhere(),
      select: { ...fields, publishedAt: true, category: { select: { name: true } } },
      orderBy: publicPostDefaultOrder,
      take: 6
    }),
    selection.length
      ? prisma.post.findMany({
          where: buildPublishedPostWhere({ id: { in: selection.map(item => item.postId) } }),
          select: fields
        })
      : []
  ])
  const byId = new Map(posts.map(post => [post.id, post]))
  const selected = selection.flatMap(({ postId, color }) => {
    const post = byId.get(postId)
    return post ? [{ ...post, color }] : []
  })
  const chosen: Array<HomeHeroPost & { color?: string }> = selected.length ? selected : recent.slice(0, homeHeroLimit)
  const config = useRuntimeConfig(event)
  const slides = await Promise.all(chosen.map(async ({ id, slug, title, cover, isPinned, color }) => ({
    id, slug, title, cover, isPinned,
    color: color || await resolveHomeCoverColor(cover, config.public.siteUrl, config.uploadDir)
  })))
  return ok<HomeHeroPayload>({ slides, recent, configured: selected.length > 0 })
})
