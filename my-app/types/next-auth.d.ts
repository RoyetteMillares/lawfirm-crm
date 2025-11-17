import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession`
   */
  interface Session {
    user: {
      id: string
      role: UserRole
      tenantId: string | null
      tenantSlug: string | null
    } & DefaultSession["user"]
  }

  /**
   * Returned by `authorize` callback
   */
  interface User {
    id: string
    role: UserRole
    tenantId: string | null
    tenantSlug: string | null
  }
}

declare module "next-auth/jwt" {
  /**
   * JWT token
   */
  interface JWT {
    id: string
    role: UserRole
    tenantId: string | null
    tenantSlug: string | null
  }
}
