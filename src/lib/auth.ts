import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Cache for settings to avoid DB query on every auth request
let settingsCache: Record<string, string> | null = null;
let settingsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheTime < CACHE_TTL) {
    return settingsCache;
  }
  try {
    const settings = await db.systemSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.key] = s.value));
    settingsCache = map;
    settingsCacheTime = now;
    return map;
  } catch {
    return {};
  }
}

// Invalidate cache when settings are updated
export function invalidateSettingsCache() {
  settingsCache = null;
  settingsCacheTime = 0;
}

// Build auth options dynamically based on DB settings
export async function getAuthOptions(): Promise<NextAuthOptions> {
  const settings = await getSettings();

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

  // Add Google provider if credentials are configured (from DB settings or env vars)
  const googleClientId =
    settings.googleLoginClientId || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret =
    settings.googleLoginClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const loginWithGoogle = settings.loginWithGoogle === "true";

  if (googleClientId && googleClientSecret && loginWithGoogle) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const GoogleProvider = require("next-auth/providers/google").default;
      providers.push(
        GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          authorization: {
            params: {
              prompt: "consent",
              access_type: "offline",
              response_type: "code",
            },
          },
        })
      );
    } catch {
      // Google provider not available, skip
    }
  }

  return {
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
}

// Legacy static export for backwards compatibility
// This still uses env vars only and is used if getAuthOptions is not called
const staticProviders: NextAuthOptions["providers"] = [
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

// Try to add Google provider from env vars as fallback
try {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const GoogleProvider = require("next-auth/providers/google").default;
    staticProviders.push(
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
  providers: staticProviders,
  callbacks: {
    async signIn({ user, account, profile }) {
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
