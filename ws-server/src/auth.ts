import { jwtVerify } from "jose";
import type { WSTokenPayload } from "./types.js";

const WS_JWT_SECRET = new TextEncoder().encode(
  process.env.WS_JWT_SECRET || ""
);

export async function verifyWSToken(
  token: string | null
): Promise<WSTokenPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, WS_JWT_SECRET);

    // Verify purpose claim
    if (payload.purpose !== "websocket_interview") return null;

    // Verify required fields
    if (!payload.sub || !payload.email || !payload.role) return null;

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      purpose: payload.purpose as string,
    };
  } catch {
    // Token expired, invalid signature, malformed, etc.
    return null;
  }
}
