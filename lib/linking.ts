import "server-only";
import { constants, generateKeyPairSync, privateDecrypt } from "node:crypto";
import { db } from "./db";
import { audit } from "./audit";
import { site } from "./site";

/* ─── Steam (OpenID 2.0) ──────────────────────────────────────────────────── */

const STEAM_OPENID = "https://steamcommunity.com/openid/login";

export function steamLoginUrl(returnTo: string) {
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": site.url,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID}?${p}`;
}

/**
 * Verifies the OpenID assertion directly with Steam (check_authentication) and returns the
 * SteamID64, or null. Never trusts the query string alone.
 */
export async function verifySteamAssertion(params: URLSearchParams, expectedReturnTo: string): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") return null;
  if (params.get("openid.op_endpoint") !== STEAM_OPENID) return null;
  const returnTo = params.get("openid.return_to") ?? "";
  if (returnTo.split("?")[0] !== expectedReturnTo.split("?")[0]) return null;
  const claimed = params.get("openid.claimed_id") ?? "";
  const m = claimed.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (!m) return null;

  const body = new URLSearchParams();
  params.forEach((v, k) => {
    if (k.startsWith("openid.")) body.set(k, v);
  });
  body.set("openid.mode", "check_authentication");
  const res = await fetch(STEAM_OPENID, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const text = await res.text();
  return /is_valid\s*:\s*true/.test(text) ? m[1] : null;
}

/** FiveM reports Steam as `steam:` + the SteamID64 in hex. */
export function steamHexFromId64(id64: string) {
  return `steam:${BigInt(id64).toString(16)}`;
}

export async function steamPersonaName(id64: string): Promise<string | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${id64}`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    const j = (await res.json()) as { response?: { players?: { personaname?: string }[] } };
    return j.response?.players?.[0]?.personaname ?? null;
  } catch {
    return null;
  }
}

/* ─── Cfx.re (Discourse user API keys, as txAdmin does) ───────────────────── */

export const CFX_FORUM = "https://forum.cfx.re";

export function newCfxRequest(redirect: string) {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const clientId = `drp-${crypto.randomUUID()}`;
  const p = new URLSearchParams({
    application_name: site.name,
    client_id: clientId,
    scopes: "session_info",
    public_key: publicKey,
    nonce,
    auth_redirect: redirect,
  });
  return { url: `${CFX_FORUM}/user-api-key/new?${p}`, privateKey, nonce, clientId };
}

/**
 * Discourse encrypts the payload with RSA PKCS#1 v1.5. Node blocks that padding mode in
 * privateDecrypt, so decrypt raw and strip the v1.5 padding (00 02 <nonzero…> 00 <msg>).
 */
export function decryptCfxPayload(payloadB64: string, privateKeyPem: string): { key: string; nonce: string } | null {
  try {
    const raw = privateDecrypt({ key: privateKeyPem, padding: constants.RSA_NO_PADDING }, Buffer.from(payloadB64.replace(/ /g, "+"), "base64"));
    if (raw[0] !== 0x00 || raw[1] !== 0x02) return null;
    const sep = raw.indexOf(0x00, 2);
    if (sep < 10) return null;
    const data = JSON.parse(raw.subarray(sep + 1).toString("utf8"));
    return typeof data.key === "string" && typeof data.nonce === "string" ? data : null;
  } catch {
    return null;
  }
}

export async function cfxCurrentUser(userApiKey: string, clientId: string) {
  const headers = { "User-Api-Key": userApiKey, "User-Api-Client-Id": clientId, Accept: "application/json" };
  const res = await fetch(`${CFX_FORUM}/session/current.json`, { headers, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as { current_user?: { id: number; username: string } };
  // The key was only needed for this one read; revoke it (best effort).
  fetch(`${CFX_FORUM}/user-api-key/revoke`, { method: "POST", headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  return j.current_user ?? null;
}

/* ─── Shared ──────────────────────────────────────────────────────────────── */

export type LinkResult = { ok: true } | { ok: false; error: "taken" };

export async function linkSteam(userId: string, id64: string): Promise<LinkResult> {
  const steamHex = steamHexFromId64(id64);
  const owner = await db.user.findFirst({ where: { steamHex, id: { not: userId } }, select: { id: true } });
  if (owner) {
    await audit(userId, "link.steam.conflict", "User", userId, { steamHex, ownerId: owner.id });
    return { ok: false, error: "taken" };
  }
  await db.user.update({ where: { id: userId }, data: { steamHex, steamName: await steamPersonaName(id64) } });
  await audit(userId, "link.steam", "User", userId, { steamHex });
  return { ok: true };
}

export async function linkCfx(userId: string, cfxId: number, username: string): Promise<LinkResult> {
  const fivemId = `fivem:${cfxId}`;
  const owner = await db.user.findUnique({ where: { fivemId }, select: { id: true } });
  if (owner && owner.id !== userId) {
    await audit(userId, "link.cfx.conflict", "User", userId, { fivemId, ownerId: owner.id });
    return { ok: false, error: "taken" };
  }
  await db.user.update({ where: { id: userId }, data: { fivemId, cfxName: username } });
  await audit(userId, "link.cfx", "User", userId, { fivemId, username });
  return { ok: true };
}

export function profileRedirect(query: string) {
  return new URL(`/profile?${query}#linked`, site.url);
}
