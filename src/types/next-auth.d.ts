import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      churchId: string
      churchName: string
    } & DefaultSession['user']
  }

  interface User {
    role: string
    churchId: string
    churchName: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    churchId?: string
    churchName?: string
  }
}