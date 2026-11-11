import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Small sealed (AES-256-GCM) payloads for OAuth-style round trips, stored in an httpOnly
 * cookie. Keyed from AUTH_SECRET, so they can't be forged or read client-side.
 */
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHash("sha256").update(`drp-link:${secret}`).digest();
}

export function seal(data: Record<string, unknown>, ttlSeconds: number): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = JSON.stringify({ ...data, exp: Date.now() + ttlSeconds * 1000 });
  const ct = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
}

export function unseal<T extends Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token) return null;
  try {
    const buf = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data as T;
  } catch {
    return null;
  }
}

export const LINK_COOKIE = {
  steam: "drp_link_steam",
  cfx: "drp_link_cfx",
} as const;

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/link",
  maxAge,
});
