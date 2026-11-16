import type { UserRolePayload } from './dto/user'

declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    displayName?: string | null
    avatarUrl?: string | null
    role: UserRolePayload
  }

  interface UserSession {
    user?: User
    emailAvailable?: boolean
  }

  interface SecureSessionData {
    accountSessionId?: string
  }
}
