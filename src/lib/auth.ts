import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const providers: NextAuthOptions["providers"] = [
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

      // Log activity (fire and forget)
      db.activityLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          details: "User berhasil login via NIP/Password",
        },
      }).catch(() => {});

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        nip: user.nip,
      };
    },
  }),
];

// Dynamically add Google provider if configured
try {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const GoogleProvider = require("next-auth/providers/google").default;
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
          },
        },
      })
    );
  }
} catch {
  // Google provider not available, skip
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google sign-in
      if (account?.provider === "google" && profile?.email) {
        try {
          let existingUser = await db.user.findFirst({
            where: { email: profile.email },
          });

          if (!existingUser) {
            const name = profile.name || profile.email.split('@')[0]
            const nip = `google_${Date.now()}`
            const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10)

            existingUser = await db.user.create({
              data: {
                nip,
                password: hashedPassword,
                name,
                email: profile.email,
                role: "ASN",
                isActive: true,
              },
            });
          }

          if (!existingUser.isActive) {
            return false
          }

          (user as any).role = existingUser.role;
          (user as any).nip = existingUser.nip;
          (user as any).id = existingUser.id;

          db.activityLog.create({
            data: {
              userId: existingUser.id,
              action: "LOGIN",
              details: "User berhasil login via Google",
            },
          }).catch(() => {});

          return true;
        } catch (error) {
          console.error("Google sign-in error:", error);
          return false;
        }
      }

      return true;
    },
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
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || "bkad-seruyan-secret-key-2024",
};
