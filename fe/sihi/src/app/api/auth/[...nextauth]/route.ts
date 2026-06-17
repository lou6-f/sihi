import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Ghi đè NEXTAUTH_URL theo host thực tế của request.
 * → signOut/signIn redirect đúng cả khi chạy localhost lẫn qua Ngrok/tunnel,
 *   không cần sửa .env trên mỗi máy.
 */
function detectAndSetNextAuthUrl(req: Request) {
  const forwarded = req.headers.get("x-forwarded-host");
  const host = forwarded || req.headers.get("host");
  if (!host) return;

  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  process.env.NEXTAUTH_URL = `${proto}://${host}`;
}

const handler = NextAuth(authOptions);

export async function GET(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  detectAndSetNextAuthUrl(req);
  return handler(req, ctx);
}

export async function POST(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  detectAndSetNextAuthUrl(req);
  return handler(req, ctx);
}
