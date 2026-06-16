import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Vui lòng nhập email và mật khẩu");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.password) {
          throw new Error("Email hoặc mật khẩu không chính xác");
        }

        if (!user.isActive) {
          throw new Error("Tài khoản đã bị vô hiệu hóa");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Email hoặc mật khẩu không chính xác");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar ?? null,
          emailVerified: user.emailVerified ? true : false,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session: sessionUpdate }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.avatar = (user as { avatar?: string | null }).avatar ?? null;
        token.emailVerified = (user as { emailVerified: boolean }).emailVerified;
      }
      // Backward compat: JWT cũ chưa có avatar → fetch 1 lần từ DB
      if (token.id && token.avatar === undefined && !trigger) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { avatar: true },
        });
        token.avatar = dbUser?.avatar ?? null;
      }
      // Khi client gọi update() — cập nhật avatar/name trong token
      if (trigger === "update" && sessionUpdate?.avatar !== undefined) {
        token.avatar = sessionUpdate.avatar;
      }
      if (trigger === "update" && sessionUpdate?.name !== undefined) {
        token.name = sessionUpdate.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatar = (token.avatar as string | null) ?? null;
        session.user.emailVerified = token.emailVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
