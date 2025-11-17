import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { 
    strategy: "jwt"  //JWT strategy doesn't need adapter
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { tenant: true }
        })

        if (!user || !user.passwordHash) {
          return null
        }

        if (user.status !== 'ACTIVE') {
          throw new Error("Account is disabled")
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in. Check your inbox for the verification link.")
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValidPassword) {
          return null
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug || null
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth
      if (account?.provider === "google" && profile?.email) {
        // Check if user exists
        let dbUser = await prisma.user.findUnique({
          where: { email: profile.email }
        })

        if (!dbUser) {
          // Create new user for Google OAuth
          dbUser = await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name || profile.email.split('@')[0],
              image: (profile as any).picture,
              emailVerified: new Date(),
              role: "ENDUSER",
              status: "ACTIVE"
            }
          })
        } else {
          // Update existing user
          await prisma.user.update({
            where: { email: profile.email },
            data: { 
              emailVerified: new Date(),
              lastLoginAt: new Date(),
              image: (profile as any).picture || dbUser.image
            }
          })
        }

        // Add custom fields to user object
        user.id = dbUser.id
        user.role = dbUser.role
        user.tenantId = dbUser.tenantId
        user.tenantSlug = null
      }
      
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role as UserRole
        token.tenantId = user.tenantId as string | null
        token.tenantSlug = user.tenantSlug as string | null
      }
      
      if (trigger === "update" && session) {
        const updatedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { tenant: true }
        })
        
        if (updatedUser) {
          token.role = updatedUser.role as UserRole
          token.tenantId = updatedUser.tenantId
          token.tenantSlug = updatedUser.tenant?.slug || null
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.tenantId = token.tenantId as string | null
        session.user.tenantSlug = token.tenantSlug as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
})
