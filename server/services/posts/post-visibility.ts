import { PostStatus, type Prisma } from '@prisma/client'

/**
 * 公开文章口径：已发布，且发布时间不晚于当前时间。
 *
 * 单独成文件是为了让评论服务能直接复用，而不必把带 shiki 的文章渲染器一起拖进来。
 * post-query.service.ts 仍然从这里再导出，现有调用方不受影响。
 */
export function buildPublishedPostWhere(input: Prisma.PostWhereInput = {}, now = new Date()): Prisma.PostWhereInput {
  return {
    ...input,
    status: PostStatus.PUBLISHED,
    publishedAt: { lte: now }
  }
}
