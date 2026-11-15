import type { AccountSnapshot } from '~~/types/dto/user'

export function useSiteAccount() {
  return useFetch<{ data: AccountSnapshot }>('/api/auth/me', {
    key: 'site-account',
    server: false,
    lazy: true
  })
}
