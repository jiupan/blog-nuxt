declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    role: string
  }

  interface UserSession {
    user?: User
  }
}

export {}
