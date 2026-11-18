import { z } from 'zod'

export const homeHeroLayouts = ['full', 'single'] as const
export const homeHeroLimit = 5
export const homeHeroFallbackCover = '/images/home-hero-ai.png'

const homeHeroSelection = z.array(z.object({
  postId: z.number().int().min(1).max(2147483647),
  color: z.string().regex(/^(?:#[0-9a-f]{6})?$/i)
})).max(homeHeroLimit).refine(items => new Set(items.map(item => item.postId)).size === items.length)

export type HomeHeroSelection = z.infer<typeof homeHeroSelection>

export function parseHomeHeroSelection(value: string): HomeHeroSelection | undefined {
  try {
    const result = homeHeroSelection.safeParse(JSON.parse(value))
    return result.success ? result.data : undefined
  } catch {
    return undefined
  }
}
