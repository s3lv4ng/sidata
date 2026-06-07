import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// Use dynamic auth options that read Google credentials from database settings
// This allows Google OAuth to be configured from the admin settings UI
export async function GET(...args: any[]) {
  const authOptions = await getAuthOptions();
  const handler = NextAuth(authOptions);
  return handler(...args);
}

export async function POST(...args: any[]) {
  const authOptions = await getAuthOptions();
  const handler = NextAuth(authOptions);
  return handler(...args);
}
