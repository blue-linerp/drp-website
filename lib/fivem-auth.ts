import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { ApiError, clientIp } from "./api";

/** Server-to-server auth for the FiveM gate resource: shared secret + optional IP allowlist. */
export function verifyFivemRequest(req: Request) {
  const secret = env.fivemApiSecret;
  if (!secret) throw new ApiError(503, "FIVEM_API_SECRET is not configured");
  const given = req.headers.get("x-api-key") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ApiError(401, "Invalid API key");
  const allowed = env.fivemAllowedIps;
  if (allowed.length && !allowed.includes(clientIp(req))) throw new ApiError(403, "IP not allowed");
}

/** "license:abc" / "abc" → "license:abc" style normalisation. */
export function normId(prefix: "license" | "discord" | "steam" | "fivem", v?: string | null) {
  if (!v) return null;
  const raw = v.includes(":") ? v.split(":").slice(1).join(":") : v;
  return raw ? `${prefix}:${raw}` : null;
}

export function bareDiscord(v?: string | null) {
  if (!v) return null;
  const raw = v.replace(/^discord:/, "");
  return /^\d{17,20}$/.test(raw) ? raw : null;
}
