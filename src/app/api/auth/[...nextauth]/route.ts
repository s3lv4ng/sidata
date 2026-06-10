import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * Build NEXTAUTH_URL dynamically from request headers for reverse proxy compatibility.
 * This is critical for Google OAuth to generate the correct callback/redirect URI.
 *
 * Priority order:
 * 1. X-Forwarded-Host + X-Forwarded-Proto (standard reverse proxy headers)
 * 2. Host header (if not localhost:3000)
 * 3. Origin header (browser sends this with POST requests)
 * 4. Referer header (fallback)
 */
function buildNextAuthUrl(req: NextRequest): string | undefined {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");

  // Method 1: X-Forwarded-Host (most reliable for reverse proxies)
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }

  // Method 2: Host header (Caddy passes original Host via header_up Host {host})
  const host = req.headers.get("host");
  if (host && host !== "localhost:3000") {
    const proto = forwardedProto || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  // Method 3: Origin header (browser includes this in POST requests)
  const origin = req.headers.get("origin");
  if (origin && !origin.includes("localhost:3000")) {
    return origin;
  }

  // Method 4: Referer header
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.host !== "localhost:3000") {
        return `${url.protocol}//${url.host}`;
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  return undefined;
}

// Use dynamic auth options that read Google credentials from database settings
// This allows Google OAuth to be configured from the admin settings UI
export async function GET(req: NextRequest, context: any) {
  const nextAuthUrl = buildNextAuthUrl(req);
  if (nextAuthUrl) {
    process.env.NEXTAUTH_URL = nextAuthUrl;
  }
  const authOptions = await getAuthOptions();
  const handler = NextAuth(authOptions);
  return handler(req, context);
}

export async function POST(req: NextRequest, context: any) {
  const nextAuthUrl = buildNextAuthUrl(req);
  if (nextAuthUrl) {
    process.env.NEXTAUTH_URL = nextAuthUrl;
  }
  const authOptions = await getAuthOptions();
  const handler = NextAuth(authOptions);
  return handler(req, context);
}
