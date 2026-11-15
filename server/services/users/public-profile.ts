import type { Prisma } from '@prisma/client'

export const publicProfileSelect = {
  displayName: true,
  avatar: { select: { id: true } }
} satisfies Prisma.UserSelect

export function publicProfile(account?: { displayName: string | null, avatar?: { id: string } | null } | null) {
  return {
    displayName: account?.displayName ?? null,
    avatarUrl: account?.avatar?.id ? `/api/avatars/${account.avatar.id}` : null
  }
}
