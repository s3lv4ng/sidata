import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        nip: { label: "NIP", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.nip || !credentials?.password) {
          throw new Error("NIP dan password harus diisi");
        }

        const user = await db.user.findUnique({
          where: { nip: credentials.nip },
        });

        if (!user) {
          throw new Error("NIP tidak terdaftar");
        }

        if (!user.isActive) {
          throw new Error("Akun Anda telah dinonaktifkan");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Password salah");
        }

        // Log activity
        await db.activityLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            details: "User berhasil login",
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          nip: user.nip,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.nip = (user as any).nip;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).nip = token.nip;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || "bkad-seruyan-secret-key-2024",
};
