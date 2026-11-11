import "server-only";
import { env } from "./env";

const API = "https://discord.com/api/v10";

export class DiscordError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface GuildMember {
  roles: string[];
  joined_at: string;
  nick?: string | null;
  user?: { id: string; username: string; global_name?: string | null; avatar?: string | null };
}

export function botConfigured() {
  return Boolean(env.botToken && env.guildId);
}

async function call<T>(path: string, init: RequestInit & { auth?: string } = {}, attempt = 0): Promise<T> {
  const { auth, ...rest } = init;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Authorization: auth ?? `Bot ${env.botToken}`,
      "Content-Type": "application/json",
      "User-Agent": "DRP-Website (https://github.com, 1.0)",
      ...(rest.headers ?? {}),
    },
    cache: "no-store",
    signal: rest.signal ?? AbortSignal.timeout(8000),
  });
  if (res.status === 429 && attempt < 2) {
    const body = (await res.json().catch(() => ({}))) as { retry_after?: number };
    await new Promise((r) => setTimeout(r, Math.min(5000, (body.retry_after ?? 1) * 1000)));
    return call<T>(path, init, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new DiscordError(res.status, `Discord ${rest.method ?? "GET"} ${path} → ${res.status} ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Returns the member, or null when the user is not in the guild. Throws on other errors. */
export async function getGuildMember(userId: string): Promise<GuildMember | null> {
  try {
    return await call<GuildMember>(`/guilds/${env.guildId}/members/${userId}`);
  } catch (e) {
    if (e instanceof DiscordError && e.status === 404) return null;
    throw e;
  }
}

/** All roles in the guild (bot token), highest position first. Empty list when no bot is configured. */
export async function getGuildRoles(): Promise<{ id: string; name: string; color: number; position: number; managed: boolean }[]> {
  if (!botConfigured()) return [];
  const roles = await call<{ id: string; name: string; color: number; position: number; managed: boolean }[]>(`/guilds/${env.guildId}/roles`);
  return roles.filter((r) => r.id !== env.guildId).sort((a, b) => b.position - a.position);
}

/** Uses the user's OAuth token (guilds.members.read). Used at sign-in when no bot is configured. */
export async function getOwnGuildMember(accessToken: string): Promise<GuildMember | null> {
  try {
    return await call<GuildMember>(`/users/@me/guilds/${env.guildId}/member`, { auth: `Bearer ${accessToken}` });
  } catch (e) {
    if (e instanceof DiscordError && (e.status === 404 || e.status === 403)) return null;
    throw e;
  }
}

export async function addRole(userId: string, roleId: string, reason: string) {
  await call(`/guilds/${env.guildId}/members/${userId}/roles/${roleId}`, {
    method: "PUT",
    headers: { "X-Audit-Log-Reason": encodeURIComponent(reason) },
  });
}

export async function removeRole(userId: string, roleId: string, reason: string) {
  try {
    await call(`/guilds/${env.guildId}/members/${userId}/roles/${roleId}`, {
      method: "DELETE",
      headers: { "X-Audit-Log-Reason": encodeURIComponent(reason) },
    });
  } catch (e) {
    // Not in guild any more: nothing to remove.
    if (e instanceof DiscordError && e.status === 404) return;
    throw e;
  }
}

export interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
  thumbnail?: { url: string };
}

/** DMs may be closed; never throws. Returns whether it was delivered. */
export async function sendDM(userId: string, payload: { content?: string; embeds?: Embed[] }): Promise<boolean> {
  if (!env.botToken) return false;
  try {
    const channel = await call<{ id: string }>(`/users/@me/channels`, {
      method: "POST",
      body: JSON.stringify({ recipient_id: userId }),
    });
    await call(`/channels/${channel.id}/messages`, { method: "POST", body: JSON.stringify(payload) });
    return true;
  } catch (e) {
    console.warn("[discord] DM failed", userId, (e as Error).message);
    return false;
  }
}

/** Webhook posts are best-effort; never throws. */
export async function postWebhook(url: string | null | undefined, payload: { content?: string; embeds?: Embed[]; username?: string }) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowed_mentions: { parse: [] }, ...payload }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch (e) {
    console.warn("[discord] webhook failed", (e as Error).message);
    return false;
  }
}

export const COLORS = { accent: 0xe4080a, green: 0x2ecc71, red: 0xff2a3d, amber: 0xffb020, grey: 0x8d929b };
