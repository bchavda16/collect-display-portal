// ============================================================
// collect&display Portal — NextAuth Configuration
// ============================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { UserRole } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            retailer: {
              select: { id: true },
            },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "auth.login",
            entity: "User",
            entityId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.retailer
            ? (await prisma.retailer.findUnique({
                where: { id: user.retailer.id },
                select: { businessName: true },
              }))?.businessName ?? user.email
            : "Admin",
          role: user.role as UserRole,
          retailerId: user.retailer?.id ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.retailerId = (user as any).retailerId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).retailerId = token.retailerId;
      }
      return session;
    },
  },
});

// Type augmentation
declare module "next-auth" {
  interface User {
    role: UserRole;
    retailerId?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      retailerId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    retailerId?: string;
  }
}
