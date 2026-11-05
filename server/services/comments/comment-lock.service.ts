import { Prisma } from '@prisma/client'

/**
 * 评论写入与审核共用的加锁顺序：文章 → 线程根 → 回复目标。
 *
 * 两个路径必须用同一顺序，否则审核与回复交叉时会出现死锁，
 * 或者出现「回复写进去了但线程其实已经被隐藏」的错误可见性。
 * 顺序固定之后，先拿到文章锁的一方会把另一方挡在外面，后者重读状态即可拿到正确结果。
 */

export async function lockCommentPost(tx: Prisma.TransactionClient, postId: number) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Post" WHERE "id" = ${postId} FOR UPDATE
  `)
}

export async function lockCommentThreadRoot(tx: Prisma.TransactionClient, threadRootId: number) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Comment" WHERE "id" = ${threadRootId} FOR UPDATE
  `)
}

export async function lockCommentTarget(tx: Prisma.TransactionClient, commentId: number) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Comment" WHERE "id" = ${commentId} FOR UPDATE
  `)
}
