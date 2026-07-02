import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { UserRole } from "@prisma/client"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase() },
          include: { retailer: { select: { id: true } } },
        })

        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.role === "ADMIN" ? "Admin" : user.email,
          role: user.role,
          retailerId: user.retailer?.id ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAdminPath = nextUrl.pathname.startsWith("/admin")
      const isLoginPage = nextUrl.pathname === "/login"

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      if (!isLoggedIn) return false

      if (isAdminPath && (auth?.user as any)?.role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.retailerId = (user as any).retailerId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).retailerId = token.retailerId
      }
      return session
    },
  },
})

declare module "next-auth" {
  interface User {
    role: UserRole
    retailerId?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      retailerId?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    retailerId?: string
  }
}
