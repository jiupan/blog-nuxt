declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    email?: string | null
    role: string
  }

  interface UserSession {
    user?: User
  }

  interface SecureSessionData {
    accountSessionId?: string
  }
}

export {}
