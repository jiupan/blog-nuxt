import type { AccountSnapshot, SiteAccount } from '~~/types/dto/user'

type SiteSession = {
  user?: Pick<SiteAccount, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'role'>
  emailAvailable?: boolean
}

export function useSiteAccount() {
  const requestFetch = useRequestFetch()
  const cacheControl = import.meta.server ? useResponseHeader('Cache-Control') : undefined
  const serverSession = import.meta.server ? useUserSession().session.value as SiteSession | null : null

  return useAsyncData('site-account', async () => {
    const { user, emailAvailable = false } = serverSession ?? (await requestFetch<{ data: AccountSnapshot }>('/api/auth/me')).data
    if (!user) return { data: { user: null, emailAvailable } }

    if (cacheControl) cacheControl.value = 'private, no-store'
    const { id, username, displayName = null, avatarUrl = null, role } = user
    return { data: { user: { id, username, displayName, avatarUrl, role }, emailAvailable } }
  }, { lazy: true })
}
